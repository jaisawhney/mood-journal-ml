import { EMOTIONS } from "../constants/emotionMaps";
import type { JournalEntry } from "../storage/JournalDB";
import { EMPTY_PREDICTIONS, EMPTY_PROBABILITIES, type Analysis, type Emotion, type EmotionResult } from "../types/types";


/**
 * Get the detected emotions from the raw emotion analysis result
 * @param probabilities the raw emotion probabilities
 * @param predictions the raw emotion predictions
 * @param topN number of top buckets to return
 * @returns array of EmotionResult
 */
export function getDetectedEmotions(
    probabilities: Record<Emotion, number>,
    predictions: Record<Emotion, boolean>,
    topN = 3,
): EmotionResult[] {
    return EMOTIONS
        .filter(emotion => predictions[emotion])
        .map(emotion => ({
            emotion,
            probability: probabilities[emotion] ?? 0,
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, topN);
}

/**
 * Get the primary emotion from the raw emotion analysis result
 * @param probabilities the raw emotion probabilities
 * @param predictions the raw emotion predictions
 * @returns the primary Emotion or null
 */
export function getPrimaryEmotion(
    probabilities: Record<Emotion, number>,
    predictions: Record<Emotion, boolean>,
): Emotion | null {
    return getDetectedEmotions(probabilities, predictions, 1)[0]?.emotion ?? null;
}

/**
 * Get the analysis for a journal entry, considering user overrides
 * @param entry the journal entry
 * @returns the analysis
 */
export function getAnalysis(entry: JournalEntry): Analysis {
    if (!entry.analysis) {
        return {
            probabilities: EMPTY_PROBABILITIES,
            predictions: EMPTY_PREDICTIONS,
            isOverridden: false,
        };
    }

    const override = entry.userOverride;
    if (!override?.emotions) {
        return {
            ...entry.analysis,
            isOverridden: false,
        };
    }

    const probabilities = {} as Record<Emotion, number>;
    const predictions = {} as Record<Emotion, boolean>;

    for (const emotion of EMOTIONS) {
        const selected = override.emotions.includes(emotion);

        probabilities[emotion] = selected ? 1 : 0;
        predictions[emotion] = selected;
    }

    return {
        probabilities,
        predictions,
        isOverridden: true,
    };
}