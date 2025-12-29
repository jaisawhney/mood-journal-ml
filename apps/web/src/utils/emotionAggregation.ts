import type { JournalEntry, Emotion, EmotionSummary } from "../types/types"

export function summarizeToday(entries: JournalEntry[]) {
    const today = new Date().toDateString()

    const todaysEntries = entries.filter(
        (e) => new Date(e.timestamp).toDateString() === today
    )

    if (todaysEntries.length === 0) {
        return null
    }

    const counts: Record<Emotion, number> = {
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        trust: 0,
        disgust: 0,
        surprise: 0,
        anticipation: 0,
    }

    for (const entry of todaysEntries) {
        counts[entry.emotion]++
    }

    const primary = Object.keys(counts).reduce((a, b) =>
        counts[b as Emotion] > counts[a as Emotion] ? b : a
    ) as Emotion

    return {
        count: todaysEntries.length,
        emotion: primary,
    }
}

export function emotionDistribution(
    entries: JournalEntry[]
): EmotionSummary[] {
    const counts: Record<Emotion, number> = {
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        trust: 0,
        disgust: 0,
        surprise: 0,
        anticipation: 0,
    };

    for (const entry of entries) {
        counts[entry.emotion]++;
    }

    const total = entries.length || 1;

    return (Object.keys(counts) as Emotion[]).map((emotion) => ({
        label: emotion,
        value: counts[emotion] / total,
    }));
}


export function applyThreshold(
    items: EmotionSummary[],
    threshold = 0.05
): EmotionSummary[] {
    const filtered = items.map(({ label, value }) => ({
        label,
        value: value < threshold ? 0 : value,
    }));

    const total = filtered.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return filtered;

    return filtered.map(({ label, value }) => ({
        label,
        value: value / total,
    }));
}