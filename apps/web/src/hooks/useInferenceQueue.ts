import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../storage/JournalDB"
import { enqueueTextForPrediction } from "../services/model/workerClient";

async function checkIfEntryIsQueued(entryId?: number): Promise<boolean> {
    if (entryId === undefined) return false;
    const job = await db.queue.where("entryId").equals(entryId).first();
    return !!job;
}

export function useInferenceQueue(entryId?: number) {
    const isQueued = useLiveQuery(
        () => checkIfEntryIsQueued(entryId),
        [entryId],
    );

    return {
        isQueued: isQueued ?? false,
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