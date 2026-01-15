import { useMemo } from "react";
import { EMOTIONS } from "../constants/emotionMaps";
import type { JournalEntry } from "../storage/JournalDB";
import { getDayLabels, groupEntriesByDate } from "../utils/chartUtils";
import { getAnalysis } from "../utils/emotionHelpers";
import { normalizeToPercentile } from "../utils/chartUtils";
import type { Emotion } from "../types/types";

export interface InsightStats {
    labels: string[];

    series: Record<Emotion, (number | null)[]>;
    rawSeries: Record<Emotion, (number | null)[]>;
    overallSeries: (number | null)[];

    percentages: Record<Emotion, number>;

    dominantEmotion: Emotion | null;
    activeDays: number;
    totalEntries: number;
}


export function useInsightStats(entries: JournalEntry[], days: number): InsightStats {
    return useMemo(() => {
        const labels = getDayLabels(days);
        const byDate = groupEntriesByDate(entries);

        const series = {} as Record<Emotion, (number | null)[]>;
        const rawSeries = {} as Record<Emotion, (number | null)[]>;
        const totals = {} as Record<Emotion, number>;
        let entriesInRange = 0;


        EMOTIONS.forEach(emotion => {
            rawSeries[emotion] = [];
            totals[emotion] = 0;
        });
        const overallRaw: (number | null)[] = [];

        let activeDays = 0;
        labels.forEach(label => {
            const dayEntries = byDate.get(label) ?? [];

            if (!dayEntries.length) {
                EMOTIONS.forEach(emotion => rawSeries[emotion].push(null));
                overallRaw.push(null);
                return;
            }

            activeDays++;
            let dayTotal = 0;
            let contributingEmotions = 0;
            EMOTIONS.forEach(emotion => {
                let emotionSum = 0;
                for (const entry of dayEntries) {
                    const analysis = getAnalysis(entry);
                    emotionSum += analysis.buckets[emotion] ?? 0;
                }

                const averageEmotionScore = emotionSum / dayEntries.length;
                rawSeries[emotion].push(averageEmotionScore);

                if (averageEmotionScore > 0) {
                    totals[emotion] += averageEmotionScore;
                    contributingEmotions++;
                }
                dayTotal += averageEmotionScore;
            });

            // compute overall average for the day (only non-zero emotions)
            overallRaw.push(contributingEmotions > 0 ? dayTotal / contributingEmotions : null);
            entriesInRange += dayEntries.length;
        });

        EMOTIONS.forEach(emotion => {
            series[emotion] = normalizeToPercentile(rawSeries[emotion]);
        });

        const overallSeries = normalizeToPercentile(overallRaw);
        const totalSignal = EMOTIONS.reduce((acc, emotion) => acc + (totals[emotion] || 0), 0);
        const percentages = {} as Record<Emotion, number>;
        EMOTIONS.forEach(emotion => {
            percentages[emotion] = totalSignal > 0 ? (totals[emotion] || 0) / totalSignal : 0;
        });

        let dominantEmotion: Emotion | null = null;
        let maxEmotionTotal = 0;
        EMOTIONS.forEach(emotion => {
            if (totals[emotion] > maxEmotionTotal) {
                maxEmotionTotal = totals[emotion];
                dominantEmotion = emotion;
            }
        });

        return {
            labels,
            series,
            rawSeries,
            overallSeries,
            percentages,
            dominantEmotion,
            activeDays,
            totalEntries: entriesInRange,
        };
    }, [entries, days]);
}
