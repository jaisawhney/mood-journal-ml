export const EMOTIONS = [
    "happy",
    "calm",
    "anxious",
    "frustrated",
    "excited",
    "satisfied",
    "sad"
];

export type Emotion = typeof EMOTIONS[number];

export const EMPTY_PROBABILITIES = Object.fromEntries(
    EMOTIONS.map(e => [e, 0]),
) as Record<Emotion, number>;

export const EMPTY_PREDICTIONS = Object.fromEntries(
    EMOTIONS.map(e => [e, false]),
) as Record<Emotion, boolean>;

export type EmotionResult = {
    emotion: Emotion;
    probability: number;
};
export type RawEmotionResult = {
    probabilities: Record<Emotion, number> | Record<string, never>;
    predictions: Record<Emotion, boolean> | Record<string, never>;
};


export type Analysis = {
    probabilities: Record<Emotion, number>;
    predictions: Record<Emotion, boolean>;
    isOverridden: boolean;
};

export type Calibration = Record<Emotion, number>;