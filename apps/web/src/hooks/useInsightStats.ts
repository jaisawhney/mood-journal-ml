import { useMemo } from "react";
import { EMOTIONS } from "../constants/emotionMaps";
import type { JournalEntry } from "../storage/JournalDB";
import { getDayLabels, groupEntriesByDate } from "../utils/chartUtils";
import { getAnalysis, getDetectedEmotions } from "../utils/emotionHelpers";
import type { Emotion } from "../types/types";

export interface InsightStats {
    labels: string[];
    series: Record<Emotion, (number | null)[]>;
    dailySignal: (number | null)[];
    todayProbabilities: Record<Emotion, number>;
    probabilityDistribution: Record<Emotion, number>;
    dominantEmotion: Emotion | null;
    activeDays: number;
    totalEntries: number;
}

/**
 * Hook to compute statistics from journal entries over a specified number of days
 * @param entries array of JournalEntry
 * @param days number of days to consider
 * @returns InsightStats object containing computed statistics
 */
export function useInsightStats(entries: JournalEntry[], days: number): InsightStats {
    return useMemo(() => {
        const analyzedEntries = entries.map(entry => {
            return {
                ...entry,
                analysis: getAnalysis(entry),
            };
        });

        const labels = getDayLabels(days);
        const byDate = groupEntriesByDate(analyzedEntries);


        const dailySignal: (number | null)[] = [];
        let entriesInRange = 0;
        const series = {} as Record<Emotion, (number | null)[]>;
        const totals = {} as Record<Emotion, number>;
        const todayProbabilities = {} as Record<Emotion, number>;

        EMOTIONS.forEach(emotion => {
            series[emotion] = [];
            totals[emotion] = 0;
            todayProbabilities[emotion] = 0;
        });

        let activeDays = 0;
        labels.forEach((label, index) => {
            const dayEntries = byDate.get(label) ?? [];

            if (!dayEntries.length) {
                EMOTIONS.forEach(emotion => series[emotion].push(null));
                dailySignal.push(null);
                return;
            }

            activeDays++;
            entriesInRange += dayEntries.length;

            const sums = Object.fromEntries(
                EMOTIONS.map(e => [e, 0]),
            );

            for (const entry of dayEntries) {
                const detected = getDetectedEmotions(
                    entry.analysis.probabilities,
                    entry.analysis.predictions,
                    EMOTIONS.length,
                );

                for (const { emotion, probability } of detected) {
                    sums[emotion] += probability;
                }
            }

            let strongest = 0;
            for (const emotion of EMOTIONS) {
                const average = sums[emotion] / dayEntries.length;

                series[emotion].push(average);
                totals[emotion] += average;
                strongest = Math.max(strongest, average);

                if (index === labels.length - 1) {
                    todayProbabilities[emotion] = average;
                }
            }

            dailySignal.push(strongest);
        });

        const totalSignal = EMOTIONS.reduce((acc, emotion) => acc + (totals[emotion] || 0), 0);
        const probabilityDistribution = {} as Record<Emotion, number>;
        EMOTIONS.forEach(emotion => {
            probabilityDistribution[emotion] = totalSignal > 0 ? (totals[emotion] || 0) / totalSignal : 0;
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
            dailySignal,
            todayProbabilities,
            probabilityDistribution,
            dominantEmotion,
            activeDays,
            totalEntries: entriesInRange,
        };
    }, [entries, days]);
}
