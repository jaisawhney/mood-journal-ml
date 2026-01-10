import type { JournalEntry } from "../storage/JournalDB";
import type { Analysis, Emotion } from "../types/types";

const POSITIVE_LABELS = new Set([
    "happy", "excited", "satisfied", "proud", "surprised"
]);

const NEGATIVE_LABELS = new Set([
    "afraid", "anxious", "sad", "ashamed", "disgusted", "angry", "frustrated"
]);

const VALENCE: Record<string, "positive" | "negative" | "neutral"> = {
    Joy: "positive",
    Trust: "positive",
    Anticipation: "positive",
    Surprise: "neutral",
    Sadness: "negative",
    Fear: "negative",
    Anger: "negative",
    Disgust: "negative",
};

const EMOTION_MAP: Record<string, Set<string>> = {
    "Joy": new Set(["happy", "satisfied", "proud", "nostalgic"]),
    "Trust": new Set(["calm", "bored"]), // can't figure out where to put bored (neutral?)
    "Fear": new Set(["afraid", "anxious", "awkward"]),
    "Surprise": new Set(["surprised"]),
    "Sadness": new Set(["sad", "jealous"]),
    "Disgust": new Set(["disgusted", "ashamed"]),
    "Anger": new Set(["angry", "frustrated"]),
    "Anticipation": new Set(["excited"]),
};

export type BucketResult = {
    bucket: string;
    score: number;
};

export function calculateValenceMass(
    deltas: Record<string, number>,
    dominance: number
): { positive: number; negative: number } {
    let positive = 0;
    let negative = 0;
    for (const label in deltas) {
        const norm = dominance > 0 ? deltas[label] / dominance : 0;
        if (POSITIVE_LABELS.has(label)) positive += norm;
        if (NEGATIVE_LABELS.has(label)) negative += norm;
    }
    return { positive, negative };
}

export function buildEmotionBuckets(
    emotionDeltas: Record<string, number>,
    dominance: number,
    intensity: number
): BucketResult[] {
    const { positive, negative } = calculateValenceMass(emotionDeltas, dominance);
    const margin = Math.abs(positive - negative);
    const MARGIN_THRESHOLD = 0.5;

    let finalPositive = positive;
    let finalNegative = negative;
    if (margin > MARGIN_THRESHOLD) {
        if (positive > negative) finalNegative = 0;
        else finalPositive = 0;
    }

    const buckets: BucketResult[] = [];

    for (const [parent, subEmotions] of Object.entries(EMOTION_MAP)) {
        let bucketScore = 0;
        for (const subEmotion of subEmotions) {
            const delta = emotionDeltas[subEmotion] || 0;
            const norm = dominance > 0 ? delta / dominance : 0;
            bucketScore += norm;
        }

        if (bucketScore > 0) {
            const densityCorrectedScore = bucketScore / Math.sqrt(subEmotions.size); // sublinear correction
            const valence = VALENCE[parent];

            if (valence === "positive" && finalPositive === 0) continue;
            if (valence === "negative" && finalNegative === 0) continue;

            buckets.push({
                bucket: parent,
                score: densityCorrectedScore * intensity,
            });
        }

    }
    buckets.sort((a, b) => b.score - a.score);

    if (buckets.length === 0) return buckets;

    const maxScore = buckets[0].score;
    const RELATIVE_FLOOR = 0.4;

    const filtered = buckets.filter(
        b => b.score >= maxScore * RELATIVE_FLOOR
    );

    const MAX_BUCKETS = 3;
    return filtered.slice(0, MAX_BUCKETS);
}


export function getPrimaryEmotion(
    buckets: Partial<Record<Emotion, number>>
): Emotion | null {
    const entries = Object.entries(buckets) as [Emotion, number][];
    if (entries.length === 0) return null;
    return entries.reduce((best, curr) => curr[1] > best[1] ? curr : best)[0];
}

export function getAnalysis(entry: JournalEntry): Analysis {
    const override = entry?.userOverride ?? null;
    if (!entry.analysis) return {
        buckets: {
            Joy: 0,
            Sadness: 0,
            Anger: 0,
            Fear: 0,
            Trust: 0,
            Disgust: 0,
            Surprise: 0,
            Anticipation: 0
        },
        intensity: 0,
        dominance: 0,
        isOverridden: false
    };

    return {
        // @ts-ignore: override should completely replace analysis buckets if present
        buckets: {
            ...(override?.buckets ?? entry.analysis.buckets),
        },
        intensity: override?.intensity ?? entry.analysis.intensity,
        dominance: entry.analysis.dominance,
        isOverridden: Boolean(override),
    };
}

export function normalizeToPercentile(
    values: number[],
    reference: number[],
    percentile: number = 0.9
): number[] {
    if (!reference.length) return values.map(() => 0);

    const sorted = [...reference].sort((a, b) => a - b);
    const percentileIndex = Math.ceil(sorted.length * percentile) - 1;
    const cappedIndex = Math.max(0, Math.min(percentileIndex, sorted.length - 1));
    const cap = sorted[cappedIndex] || 1;
    return values.map(v => Math.min(v / cap, 1));
}