import type { Emotion, RawEmotionResult } from "../types/types";
import { buildEmotionBuckets } from "../utils/emotionHelpers";
import { MAX_BUCKETS } from "../constants/chartConstants";
import { db } from "./JournalDB";
import type { JournalEntry, UserOverride } from "./JournalDB";

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

export async function patchJournalEntryWithResult(id: number, result: RawEmotionResult) {
    const entry = await db.entries.get(id);
    if (!entry) return;

    const buckets = Object.fromEntries(
        buildEmotionBuckets(result.emotions, result.intensity)
            .map(emotionBucket => [emotionBucket.bucket as Emotion, emotionBucket.score])
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

export function getDisplayBuckets(buckets: Record<Emotion, number>) {
    if (Object.values(buckets).every(v => v === 0)) return [];

    return Object.entries(buckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_BUCKETS);
}

export function updateJournalText(id: number, newText: string) {
    return db.entries.update(id, {
        text: newText,
        updatedAt: Date.now(),
    });
}