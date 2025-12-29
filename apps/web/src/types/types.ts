export type Emotion =
    | "joy"
    | "sadness"
    | "anger"
    | "fear"
    | "trust"
    | "disgust"
    | "surprise"
    | "anticipation";

export type PlutchikResult = {
    primary_emotion: Emotion;
    plutchik_probabilities: Record<Emotion, number>;
};

export type EmotionPredictionResult = PlutchikResult[];

export interface JournalEntry {
    id?: number;
    text: string;
    emotion: Emotion;
    result: PlutchikResult;
    timestamp: number;
}

export type EmotionSummary = {
    label: Emotion;
    value: number;
};