import { type LucideIcon, Angry, Frown, Smile, Hourglass, HeartHandshake, HeartPulse, Meh, Bug, Eye } from "lucide-react";
import type { Emotion } from "../types/types";

export const EMOTIONS: Emotion[] = ["Joy", "Sadness", "Anger", "Fear", "Trust", "Disgust", "Surprise", "Anticipation"]

export const EMOTION_ICONS: (emotion: Emotion) => LucideIcon = (emotion: Emotion) => {
    switch (emotion.toLowerCase()) {
        case "joy":
            return Smile;
        case "sadness":
            return Frown;
        case "anger":
            return Angry;
        case "fear":
            return Eye;
        case "trust":
            return HeartHandshake;
        case "disgust":
            return Bug;
        case "surprise":
            return HeartPulse;
        case "anticipation":
            return Hourglass;
        default:
            return Meh;
    }
};

const EMOTION_COLORS_MAP: Record<Emotion, string> = {
    Joy: "bg-amber-100 text-amber-700",
    Sadness: "bg-sky-100 text-sky-700",
    Anger: "bg-rose-100 text-rose-700",
    Fear: "bg-indigo-100 text-indigo-700",
    Trust: "bg-emerald-100 text-emerald-700",
    Disgust: "bg-lime-100 text-lime-700",
    Surprise: "bg-violet-100 text-violet-700",
    Anticipation: "bg-orange-100 text-orange-700",
};

export function getEmotionColor(emotion: string | null): string {
    return EMOTION_COLORS_MAP[emotion as Emotion] ?? "";
}

