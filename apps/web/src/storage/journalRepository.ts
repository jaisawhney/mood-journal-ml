import { EMPTY_PREDICTIONS, EMPTY_PROBABILITIES, type RawEmotionResult } from "../types/types";
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

    return db.entries.add({
        text,
        raw: {
            emotions: {},
            modelVersion: "",
        },
        analysis: {
            probabilities: EMPTY_PROBABILITIES,
            predictions: EMPTY_PREDICTIONS,
        },
        createdAt: now,
        updatedAt: now,
    });
}


/** Update user override for a journal entry
 * @param id journal entry ID
 * @param override partial UserOverride object
 */
export async function updateUserOverride(
    id: number,
    override: Partial<UserOverride>,
) {
    const entry = await db.entries.get(id);
    if (!entry) return;

    return db.entries.update(id, {
        userOverride: {
            ...entry.userOverride,
            ...override,
            updatedAt: Date.now(),
        },
        updatedAt: Date.now(),
    });
}

/** Patch a journal entry with new emotion analysis result
 * @param id journal entry ID
 * @param result RawEmotionResult
 */
export async function patchJournalEntryWithResult(
    id: number,
    result: RawEmotionResult,
) {
    const entry = await db.entries.get(id);
    if (!entry) return;

    return db.entries.update(id, {
        raw: {
            emotions: result.probabilities,
            modelVersion: "emotion-v1",
        },
        analysis: {
            probabilities: result.probabilities,
            predictions: result.predictions,
        },
        updatedAt: Date.now(),
    });
}

/** Replace all journal entries in the database
 * @param entries array of journal entries
 */
export async function replaceAllEntries(entries: JournalEntry[]) {
    if (!entries.length) return;

    const toInsert = entries.map(({ ...rest }) => rest);

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