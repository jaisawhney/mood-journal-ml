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
    emotions: Record<Emotion, number> | {};
    intensity: number;
};


export type Analysis = {
    buckets: Record<Emotion, number>;
    intensity: number;
    isOverridden: boolean;
};