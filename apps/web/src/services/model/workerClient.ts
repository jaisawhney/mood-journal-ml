import * as Comlink from "comlink";
import type { InferenceWorkerAPI } from "./inference.worker";
import { db } from "../../storage/JournalDB";

let workerInstance: Worker | null = null;
let apiInstance: Comlink.Remote<InferenceWorkerAPI> | null = null;

async function ensureWorker() {
    if (!workerInstance) {
        workerInstance = new Worker(
            new URL("./inference.worker.ts", import.meta.url),
            { type: "module" }
        );
        apiInstance = Comlink.wrap<InferenceWorkerAPI>(workerInstance);
    }

    if (!apiInstance) throw new Error("Inference worker API is not initialized.");
    return apiInstance;
}

const bc = new BroadcastChannel("inference-queue");
/** Enqueue a journal entry text for emotion prediction
 * @param entryId journal entry ID
 * @returns the ID of the created queue job
 */
export async function enqueueTextForPrediction(entryId: number) {
    const id = await db.queue.add({
        entryId,
        createdAt: Date.now(),
        attempts: 0,
        nextAttemptAt: 0,
    });
    await startQueueProcessor();
    bc.postMessage("new-job");
    return id;
}

/** Terminate the web worker */
export function terminateWebWorker() {
    if (workerInstance) {
        apiInstance = null;
        workerInstance.terminate();
        workerInstance = null;
    }
}

let running = false;
/** Start the inference queue processor in the web worker */
export async function startQueueProcessor() {
    if (running) return;
    running = true;
    try {
        const api = await ensureWorker();
        await api.warmup();
        await api.startQueue();
    } catch (err) {
        running = false;
        console.error("Failed to start worker queue:", err);
    }
}

/** Stop the inference queue processor and terminate the web worker */
export async function stopQueueProcessor() {
    if (!running) return;
    running = false;

    if (apiInstance) {
        try {
            await apiInstance.stopQueue();
        } catch (err) {
            console.error("Failed to stop worker queue:", err);
        }
    }
    terminateWebWorker();
}