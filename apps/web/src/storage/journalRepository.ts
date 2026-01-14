
import type { Emotion, RawEmotionResult } from "../types/types";
import { buildEmotionBuckets } from "../utils/emotionHelpers";
import { db } from "./JournalDB";
import type { UserOverride } from "./JournalDB";

export async function createJournalEntry(
    text: string,
    result: RawEmotionResult
): Promise<number> {
    const now = Date.now();
    const buckets = Object.fromEntries(
        buildEmotionBuckets(result.emotions, result.intensity)
            .map(b => [b.bucket as Emotion, b.score])
    );
    return db.entries.add({
        text,
        raw: {
            emotions: result.emotions,
            intensity: result.intensity,
            modelVersion: "emotion-head-v1",
        },
        analysis: {
            buckets: buckets as Record<Emotion, number>,
            intensity: result.intensity,
        },
        createdAt: now,
        updatedAt: now,
    });
}

export async function updateUserOverride(id: number, override: Partial<UserOverride>) {
    const updatedAt = Date.now();

    const entry = await db.entries.get(id);
    if (!entry) return;

    return db.entries.update(id, {
        userOverride: {
            ...entry.userOverride,
            ...override,
            updatedAt,
        },
        updatedAt,
    });
}

export async function clearAllEntries() {
    return db.entries.clear();
}