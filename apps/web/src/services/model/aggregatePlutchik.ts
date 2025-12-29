import { FINE_TO_PARENT } from "./plutchikMap";
import type { Emotion, PlutchikResult } from "../../types/types";

type FineEmotion = keyof typeof FINE_TO_PARENT;

export function aggregatePlutchik(
    probs: Record<FineEmotion, number>
): PlutchikResult {
    const parentScores: Record<Emotion, number> = {
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        trust: 0,
        disgust: 0,
        surprise: 0,
        anticipation: 0,
    };

    for (const [label, prob] of Object.entries(probs)) {
        if (!(label in FINE_TO_PARENT)) continue;
        const parent = FINE_TO_PARENT[label as FineEmotion] as Emotion | undefined;
        if (parent) parentScores[parent] += prob;
    }

    const primary = (Object.keys(parentScores) as Emotion[]).reduce((a, b) =>
        parentScores[b] > parentScores[a] ? b : a
    );

    return {
        primary_emotion: primary,
        plutchik_probabilities: parentScores,
    };
}