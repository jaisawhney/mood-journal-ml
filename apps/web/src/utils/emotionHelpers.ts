import type { JournalEntry } from "../storage/JournalDB";
import type { Analysis, Emotion } from "../types/types";

const POSITIVE_LABELS = new Set([
    "happy", "excited", "satisfied", "proud"
]);

const NEGATIVE_LABELS = new Set([
    "afraid", "anxious", "sad", "ashamed", "disgusted", "angry", "frustrated"
]);

const VALENCE: Record<string, "positive" | "negative" | "neutral"> = {
    Joy: "positive",
    Trust: "positive",
    Anticipation: "neutral",
    Surprise: "neutral",
    Sadness: "negative",
    Fear: "negative",
    Anger: "negative",
    Disgust: "negative",
};

const EMOTION_MAP: Record<string, Set<string>> = {
    "Joy": new Set(["happy", "satisfied", "proud"]),
    "Trust": new Set(["calm"]),
    "Fear": new Set(["afraid", "anxious", "awkward"]),
    "Surprise": new Set(["surprised"]),
    "Sadness": new Set(["sad", "jealous", "nostalgic"]),
    "Disgust": new Set(["disgusted", "ashamed"]),
    "Anger": new Set(["angry", "frustrated"]),
    "Anticipation": new Set(["excited"]),
};

const SOFT_CAP = 1.5;
const OVERRIDE_LINEAR_DROP = 0.2;

export type BucketResult = {
    bucket: string;
    score: number;
};

export function liftIntensity(intensity: number): number {
    // apply a Softplus to intensity values to avoid very low weights contributing nothing
    const soft = Math.log1p(Math.exp(intensity)) / Math.log1p(Math.exp(SOFT_CAP));
    return Math.min(soft, 1);
}

export function calculateValenceMass(
    emotions: Record<string, number>,
): { positive: number; negative: number } {
    let positive = 0;
    let negative = 0;
    for (const label in emotions) {
        const emotionValue = emotions[label];
        if (emotionValue > 0) {
            if (POSITIVE_LABELS.has(label)) positive += emotionValue;
            if (NEGATIVE_LABELS.has(label)) negative += emotionValue;
        }
    }
    return { positive, negative };
}

export function buildEmotionBuckets(
    emotions: Record<string, number>,
    intensity: number
): BucketResult[] {
    const { positive, negative } = calculateValenceMass(emotions);
    const margin = Math.abs(positive - negative);
    const MARGIN_THRESHOLD = 0.5;

    let finalPositive = positive;
    let finalNegative = negative;
    if (margin > MARGIN_THRESHOLD) {
        if (positive > negative) finalNegative = 0;
        else finalPositive = 0;
    }

    // Rebase intensity using liftIntensity
    const rebasedIntensity = liftIntensity(intensity)
    if (rebasedIntensity === 0) return [];

    const rawScores: { bucket: string; score: number; valence: string }[] = [];
    for (const [parent, subEmotions] of Object.entries(EMOTION_MAP)) {
        let bucketScore = 0;
        for (const subEmotion of subEmotions) {
            const emotionValue = emotions[subEmotion] || 0;
            bucketScore = Math.max(bucketScore, emotionValue);
        }
        if (bucketScore > 0) {
            const valence = VALENCE[parent];
            if (valence === "positive" && finalPositive === 0) continue;
            if (valence === "negative" && finalNegative === 0) continue;
            rawScores.push({ bucket: parent, score: bucketScore * rebasedIntensity, valence });
        }
    }

    if (rawScores.length === 0) return [];
    const scores = rawScores.map(b => b.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;

    const buckets: BucketResult[] = rawScores.map(({ bucket, score }) => ({
        bucket,
        score: (score - min) / range,
    }));

    buckets.sort((a, b) => b.score - a.score);
    if (buckets.length > 1) {
        buckets.pop(); // remove lowest bucket
    }
    return buckets;
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
            Anticipation: 0,
        },
        intensity: 0,
        isOverridden: false
    };

    return {
        // @ts-ignore: override should completely replace analysis buckets if present
        buckets: {
            ...(override?.buckets ?? entry.analysis.buckets),
        },
        intensity: override?.intensity ?? entry.analysis.intensity,
        isOverridden: Boolean(override),
    };
}

export function getOverrideBuckets(entry: JournalEntry, emotions: Emotion[]): Partial<Record<Emotion, number>> {
    const buckets: Partial<Record<Emotion, number>> = {};
    const intensity: number = liftIntensity(entry.analysis.intensity);

    for (const [idx, emotion] of emotions.entries()) {
        const existingValue = entry?.userOverride?.buckets?.[emotion];
        if (existingValue !== undefined) {
            buckets[emotion] = existingValue;
            continue;
        }
        const overrideStrength = Math.max(1 - OVERRIDE_LINEAR_DROP * idx, 0);
        const overrideValue = intensity * overrideStrength;
        buckets[emotion] = overrideValue;
    }
    return buckets;
}