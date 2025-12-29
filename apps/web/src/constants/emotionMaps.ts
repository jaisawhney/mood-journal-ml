import { type LucideIcon, Angry, Frown, Smile, Hourglass, HeartHandshake, Cake, HeartPulse, Annoyed } from "lucide-react";
import { type Emotion } from "../types/types";

export const EMOTIONS: Emotion[] = ["joy", "sadness", "anger", "fear", "trust", "disgust", "surprise", "anticipation"]

export const EMOTION_ICONS: Record<Emotion, LucideIcon> = {
    joy: Smile,
    sadness: Frown,
    anger: Angry,
    fear: HeartPulse,
    trust: HeartHandshake,
    disgust: Annoyed,
    surprise: Cake,
    anticipation: Hourglass,
};

export const EMOTION_COLORS: Record<Emotion, string> = {
    joy: "bg-amber-100 text-amber-700",
    sadness: "bg-sky-100 text-sky-700",
    anger: "bg-rose-100 text-rose-700",
    fear: "bg-indigo-100 text-indigo-700",
    trust: "bg-emerald-100 text-emerald-700",
    disgust: "bg-lime-100 text-lime-700",
    surprise: "bg-violet-100 text-violet-700",
    anticipation: "bg-orange-100 text-orange-700",
};
