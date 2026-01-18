import type { JournalEntry } from "../storage/JournalDB";
import type { Analysis, Emotion } from "../types/types";

const EMOTION_MAP: Record<string, string[]> = {
    "Joy": ["happy", "satisfied", "proud"],
    "Trust": ["calm"],
    "Fear": ["afraid", "anxious", "awkward"],
    "Surprise": ["surprised"],
    "Sadness": ["sad", "jealous", "nostalgic"],
    "Disgust": ["disgusted", "ashamed"],
    "Anger": ["angry", "frustrated"],
    "Anticipation": ["excited"],
};

const SOFT_CAP = 1.5;
const OVERRIDE_LINEAR_DROP = 0.2;

export type BucketResult = {
    bucket: string;
    dominance: number;
};

/**
 * Apply a Softplus function to intensity to lift low values
 * @param intensity raw intensity score
 * @returns lifted intensity score between 0 and 1
 */
export function liftIntensity(intensity: number): number {
    const soft = Math.log1p(Math.exp(intensity)) / Math.log1p(Math.exp(SOFT_CAP));
    return Math.min(soft, 1);
}

/**
 * Build emotion buckets from raw emotions and intensity
 * @param emotions the raw emotions
 * @param intensity the intensity score
 * @param topN number of top buckets to return
 * @returns array of BucketResult
 */
export function buildEmotionBuckets(
    emotions: Record<string, number>,
    intensity: number,
    topN: number = 3
): BucketResult[] {
    // Rebase intensity using liftIntensity
    const rebasedIntensity = liftIntensity(intensity);
    if (rebasedIntensity === 0) return [];

    // Build raw scores for each parent emotion bucket
    const rawScores: { bucket: string; dominance: number }[] = [];
    for (const [parent, subEmotions] of Object.entries(EMOTION_MAP)) {
        let bucketScore = 0;
        for (const subEmotion of subEmotions) {
            const emotionValue = emotions[subEmotion] || 0;
            bucketScore = Math.max(bucketScore, emotionValue);
        }
        if (bucketScore > 0) {
            rawScores.push({ bucket: parent, dominance: bucketScore * rebasedIntensity });
        }
    }

    if (rawScores.length === 0) return [];
    rawScores.sort((a, b) => b.dominance - a.dominance);
    return rawScores.slice(0, topN); // Return top N buckets
}

/**
 * Get the primary emotion from given buckets
 * @param buckets emotion buckets
 * @returns the primary Emotion or null
 */
export function getPrimaryEmotion(
    buckets: Partial<Record<Emotion, number>>
): Emotion | null {
    const entries = Object.entries(buckets) as [Emotion, number][];
    if (entries.length === 0) return null;
    return entries.reduce((best, curr) => curr[1] > best[1] ? curr : best)[0];
}

/**
 * Get the analysis for a journal entry, considering user overrides
 * @param entry the journal entry
 * @returns the analysis
 */
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
        // @ts-expect-error: override should completely replace analysis buckets if present
        buckets: {
            ...(override?.buckets ?? entry.analysis.buckets),
        },
        intensity: override?.intensity ?? entry.analysis.intensity,
        isOverridden: Boolean(override),
    };
}

/**
 * Get the override buckets for a journal entry
 * @param entry the journal entry
 * @param emotions ordered list of emotions from most to least dominant
 * @returns partial record of Emotion to number
 */
export function getOverrideBuckets(entry: JournalEntry, emotions: Emotion[]): Partial<Record<Emotion, number>> {
    const buckets: Partial<Record<Emotion, number>> = {};
    const intensity: number = liftIntensity(entry.analysis.intensity);

    emotions.forEach((emotion, idx) => {
        const weight = Math.max(1 - OVERRIDE_LINEAR_DROP * idx, 0);
        buckets[emotion] = weight * intensity;
    });

    return buckets;
}