import type { JournalEntry } from '../storage/JournalDB';
import type { Emotion } from '../types/types';
import { getAnalysis, getPrimaryEmotion as getPrimaryEmotionFromBuckets } from './emotionHelpers';


export function getDayLabels(days: number): string[] {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        return date.toDateString();
    });
}

export function groupEntriesByDate(entries: JournalEntry[]): Map<string, JournalEntry[]> {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of entries) {
        const key = new Date(entry.createdAt).toDateString();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(entry);
    }
    return map;
}


interface ChartAxisContext {
    getLabelForValue(value: number): string;
}

export function chartXAxisTickCallback(this: ChartAxisContext, tickValue: string | number) {
    const label = this.getLabelForValue(tickValue as number);
    const date = new Date(label);
    return `${date.toLocaleString(undefined, { month: 'short' })} ${date.getDate()}`;
}

export function chartYAxisTickCallback(tickValue: any, _index: number) {
    if (tickValue <= 0) return "Low";
    if (tickValue < 1) return "Moderate";
    return "High";
}

export function getPrimaryEmotionFromEntries(entries: JournalEntry[]): Emotion | null {
    const emotionSums: Record<string, number> = {};
    let primaryEmotion: Emotion | null = null;
    for (const entry of entries) {
        const buckets = getAnalysis(entry).buckets;
        if (Object.keys(buckets).length === 0) continue;
        const emotion = getPrimaryEmotionFromBuckets(buckets);
        if (!emotion) continue;
        const intensity = buckets[emotion] ?? 0;
        emotionSums[emotion] = (emotionSums[emotion] || 0) + intensity;
        if (primaryEmotion === null || emotionSums[emotion] > emotionSums[primaryEmotion]) {
            primaryEmotion = emotion;
        }
    }
    return primaryEmotion;
}

export function normalizeToPercentile(
    values: (number | null)[],
    percentile: number = 0.9
): (number | null)[] {
    const positiveValues: number[] = values.filter((v): v is number => v !== null && v > 0);
    if (positiveValues.length === 0) {
        return values.map(v => v === null ? null : 0);
    }

    const sorted = positiveValues.slice().sort((a, b) => a - b);
    const index = Math.floor((sorted.length - 1) * percentile);
    const cap = sorted[index] ?? 1;
    return values.map(v => {
        if (v === null) return null;
        const normalized = v / cap;
        return Math.max(0, Math.min(normalized, 1));
    });
}

