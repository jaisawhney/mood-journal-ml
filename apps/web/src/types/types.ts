export type Emotion =
    | "Joy"
    | "Sadness"
    | "Anger"
    | "Fear"
    | "Trust"
    | "Disgust"
    | "Surprise"
    | "Anticipation";

export type RawEmotionResult = {
    logits: Record<Emotion, number> | {};
    deltas: Record<Emotion, number> | {};
    intensity: number;
    dominance: number;
};


export type Analysis = {
    buckets: Record<Emotion, number>;
    intensity: number;
    dominance: number;
    isOverridden: boolean;
};