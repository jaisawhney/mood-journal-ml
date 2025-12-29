export const PLUTCHIK_MAP: Record<string, Set<string>> = {
    joy: new Set([
        "joyful",
        "excited",
        "content",
        "confident",
        "grateful",
        "proud",
        "impressed",
    ]),
    sadness: new Set([
        "sad",
        "devastated",
        "disappointed",
        "lonely",
        "nostalgic",
        "sentimental",
    ]),
    anger: new Set([
        "angry",
        "furious",
        "annoyed",
        "jealous",
        "guilty",
    ]),
    fear: new Set([
        "afraid",
        "anxious",
        "apprehensive",
        "terrified",
    ]),
    trust: new Set([
        "trusting",
        "faithful",
        "caring",
    ]),
    disgust: new Set([
        "disgusted",
        "ashamed",
        "embarrassed",
    ]),
    surprise: new Set(["surprised"]),
    anticipation: new Set([
        "anticipating",
        "hopeful",
        "prepared",
    ]),
};

export const FINE_TO_PARENT: Record<string, string> = Object.fromEntries(
    Object.entries(PLUTCHIK_MAP).flatMap(([parent, fines]) =>
        Array.from(fines).map(fine => [fine, parent])
    )
);
