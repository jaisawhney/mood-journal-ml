import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../storage/JournalDB"
import { enqueueTextForPrediction } from "../services/model/workerClient";

async function checkIfEntryIsQueued(entryId?: number): Promise<boolean> {
    if (entryId === undefined) return false;
    const job = await db.queue.where("entryId").equals(entryId).first();
    return !!job;
}

/** Hook to manage inference queue for journal entries
 * @param entryId optional journal entry ID
 * @returns object with isQueued state and analyze function
 */
export function useInferenceQueue(entryId?: number) {
    const isQueued = useLiveQuery(
        () => checkIfEntryIsQueued(entryId),
        [entryId],
    );

    return {
        isQueued: isQueued ?? false,
        // TODO: move to utils file maybe
        analyze: async (id?: number): Promise<boolean> => {
            try {
                const effectiveEntryId = id ?? entryId;
                if (effectiveEntryId === undefined) return false;

                await enqueueTextForPrediction(effectiveEntryId);
                return true;
            } catch (err) {
                console.error("Failed to enqueue text for prediction:", err);
                return false;
            }
        },
    };
}