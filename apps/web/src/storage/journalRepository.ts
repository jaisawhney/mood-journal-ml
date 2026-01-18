import type { Emotion, RawEmotionResult } from "../types/types";
import { buildEmotionBuckets } from "../utils/emotionHelpers";
import { MAX_BUCKETS } from "../constants/chartConstants";
import { db } from "./JournalDB";
import type { JournalEntry, UserOverride } from "./JournalDB";

/** Create a new journal entry
 * @param text journal entry text
 * @returns the ID of the created journal entry
 */
export async function createJournalEntry(
    text: string,
): Promise<number> {
    const now = Date.now();
    const emptyBuckets: Record<Emotion, number> = {
        Joy: 0,
        Sadness: 0,
        Anger: 0,
        Fear: 0,
        Trust: 0,
        Disgust: 0,
        Surprise: 0,
        Anticipation: 0,
    };
    return db.entries.add({
        text,
        raw: {
            emotions: {},
            intensity: 0,
            modelVersion: "",
        },
        analysis: {
            buckets: emptyBuckets,
            intensity: 0,
        },
        createdAt: now,
        updatedAt: now,
    });
}

/** Update user override for a journal entry
 * @param id journal entry ID
 * @param override partial UserOverride object
 */
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

/** Patch a journal entry with new emotion analysis result
 * @param id journal entry ID
 * @param result RawEmotionResult
 */
export async function patchJournalEntryWithResult(id: number, result: RawEmotionResult) {
    const entry = await db.entries.get(id);
    if (!entry) return;

    const buckets = Object.fromEntries(
        buildEmotionBuckets(result.emotions, result.intensity)
            .map(emotionBucket => [emotionBucket.bucket as Emotion, emotionBucket.dominance])
    );

    const updatedAt = Date.now();

    return db.entries.update(id, {
        raw: {
            emotions: result.emotions,
            intensity: result.intensity,
            modelVersion: "emotion-v1",
        },
        analysis: {
            buckets: buckets as Record<Emotion, number>,
            intensity: result.intensity,
        },
        updatedAt,
    });
}

/** Replace all journal entries in the database
 * @param entries array of journal entries
 */
export async function replaceAllEntries(entries: JournalEntry[]) {
    if (!Array.isArray(entries) || entries.length === 0) return;

    const toInsert = entries.map(({ id, ...rest }) => rest);

    await db.transaction("rw", db.entries, async () => {
        await db.entries.clear();
        await db.entries.bulkAdd(toInsert);
    });
}

export async function deleteEntry(id: number) {
    return db.entries.delete(id);
}

export async function clearAllEntries() {
    return db.entries.clear();
}

/**
 * Get display-ready buckets sorted by dominance
 * @param buckets record of emotion buckets
 * @returns array of [Emotion, number] tuples
 */
export function getDisplayBuckets(buckets: Record<Emotion, number>) {
    if (Object.values(buckets).every(v => v === 0)) return [];

    return Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_BUCKETS);
}