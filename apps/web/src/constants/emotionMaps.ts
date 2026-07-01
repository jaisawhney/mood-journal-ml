import { type LucideIcon, Angry, Frown, Smile, HeartPulse, Eye, BadgeCheck, Waves } from "lucide-react";
import type { Emotion } from "../types/types";

export const EMOTIONS: Emotion[] = [
    "happy",
    "calm",
    "anxious",
    "frustrated",
    "excited",
    "satisfied",
    "sad"
];

export const EMOTION_ICONS: Record<Emotion, LucideIcon> = {
    happy: Smile,
    sad: Frown,
    frustrated: Angry,
    anxious: Eye,
    excited: HeartPulse,
    calm: Waves,
    satisfied: BadgeCheck
};

export const EMOTION_COLORS_MAP: Record<Emotion, string> = {
    happy: "bg-amber-100 text-amber-700",
    calm: "bg-sky-100 text-sky-700",
    anxious: "bg-indigo-100 text-indigo-700",
    frustrated: "bg-rose-100 text-rose-700",
    excited: "bg-orange-100 text-orange-700",
    satisfied: "bg-teal-100 text-teal-700",
    sad: "bg-blue-100 text-blue-700",
};

export const EMOTION_RGB_MAP: Record<Emotion, string> = {
    happy: "252,211,77",       // amber-300
    calm: "125,211,252",       // sky-300
    anxious: "165,180,252",    // indigo-300
    frustrated: "253,164,175", // rose-300
    excited: "253,186,116",    // orange-300
    satisfied: "94,234,212",   // teal-300
    sad: "142,197,255",        // blue-300
};

/**
 * Get the color classes for a given emotion
 * @param emotion the emotion
 * @returns string of CSS classes for background and text color
 */
export function getEmotionColor(emotion: string | null): string {
    return EMOTION_COLORS_MAP[emotion?.toLowerCase() as Emotion] ?? "";
}

