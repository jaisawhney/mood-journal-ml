import * as Comlink from "comlink";
import type { RawEmotionResult } from "../../types/types";
import { emotionModel } from "./index";
import { db } from "../../storage/JournalDB";
import { patchJournalEntryWithResult } from "../../storage/journalRepository";

const MAX_RETRIES_PER_JOB = 5;

async function claimNextJob() {
    return db.transaction("rw", db.queue, async () => {
        const nextItem = await db.queue
            .where("nextAttemptAt")
            .belowOrEqual(Date.now())
            .first();

        if (nextItem) {
            await db.queue.update(nextItem.id!, { attempts: (nextItem.attempts ?? 0) + 1 });
        }

        return nextItem;
    });
}

async function processOneJob(): Promise<boolean> {
    const job = await claimNextJob();
    if (!job) return false;

    try {
        const entry = await db.entries.get(job.entryId);
        if (!entry) throw new Error(`Journal entry with ID ${job.entryId} not found.`);
        const result = await emotionModel.predictEmotions(entry.text);
        await patchJournalEntryWithResult(entry.id!, result);
        await db.queue.delete(job.id!);
        return true;
    } catch (error) {
        const currentAttempt = (job.attempts ?? 1) - 1;
        if (currentAttempt < MAX_RETRIES_PER_JOB) {
            const delay = Math.pow(3, currentAttempt) * 1000;
            const nextAttemptAt = Date.now() + delay;
            await db.queue.update(job.id!, { nextAttemptAt });
        } else {
            console.error(`Job for entry ID ${job.entryId} failed after ${currentAttempt} attempts:`, error);
            await db.queue.delete(job.id!);
        }
        return false;
    }
}

const bc = new BroadcastChannel("inference-queue");

let wakeUpSignal: (() => void) | null = null;
let running = false;

const wakeUp = () => {
    if (wakeUpSignal) {
        wakeUpSignal();
    }
}

bc.onmessage = wakeUp;

async function processQueue() {
    while (running) {
        const jobProcessed = await processOneJob();
        if (jobProcessed) continue;

        const nextJob = await db.queue
            .where("nextAttemptAt")
            .above(0)
            .sortBy("nextAttemptAt")
            .then(jobs => jobs[0]);
        if (!nextJob) {
            await new Promise<void>((resolve) => {
                wakeUpSignal = resolve;
            });
            continue;
        }

        const waitTime = nextJob.nextAttemptAt! - Date.now();
        if (waitTime <= 0) {
            continue;
        }
        await new Promise<void>((resolve) => {
            wakeUpSignal = resolve;
            setTimeout(wakeUp, waitTime);
        });
    }
}

const api = {
    async predict(text: string): Promise<RawEmotionResult | null> {
        return emotionModel.predictEmotions(text);
    },

    async startQueue() {
        if (running) return;
        running = true;
        processQueue().catch(console.error);
        wakeUp();
    },

    async stopQueue() {
        running = false;
        if (wakeUpSignal) {
            wakeUpSignal();
            wakeUpSignal = null;
        }
        bc.close();
    }
}

Comlink.expose(api);

export type InferenceWorkerAPI = typeof api;
