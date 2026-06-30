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
    probabilities: Record<Emotion, number> | {};
    predictions: Record<Emotion, boolean> | {};
};


export type Analysis = {
    buckets: Record<Emotion, number>;
    isOverridden: boolean;
};

export type Calibration = Record<string, number>;