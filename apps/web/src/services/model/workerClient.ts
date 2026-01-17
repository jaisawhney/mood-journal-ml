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

export function terminateWebWorker() {
    if (workerInstance) {
        apiInstance = null;
        workerInstance.terminate();
        workerInstance = null;
    }
}

let running = false;
export async function startQueueProcessor() {
    if (running) return;
    try {
        const api = await ensureWorker();
        api.startQueue();
    } catch (err) {
        running = false;
        console.error("Failed to start worker queue:", err);
    }
}

export async function stopQueueProcessor() {
    if (!running) return;
    running = false;

    if (apiInstance) {
        try {
            apiInstance.stopQueue();
        } catch (err) {
            console.error("Failed to stop worker queue:", err);
        }
    }
    terminateWebWorker();
}