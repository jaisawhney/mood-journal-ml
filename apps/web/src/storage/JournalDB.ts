import Dexie, { type Table } from 'dexie';
import type { Emotion } from '../types/types';

export type Analysis = {
    buckets: Record<Emotion, number>;
};

export type UserOverride = {
    buckets?: Partial<Record<Emotion, number>>;
    note?: string;
    updatedAt: number;
};

export type RawEmotionOutput = {
    emotions: Record<string, number>;
    modelVersion: string;
};

export interface JournalEntry {
    id?: number;

    text: string;

    raw: RawEmotionOutput;
    analysis: Analysis;
    userOverride?: UserOverride;
    createdAt: number;
    updatedAt: number;
}

export interface QueueItem {
    id?: number;
    entryId: number;
    attempts?: number;
    createdAt: number;
    nextAttemptAt?: number;
};

export class JournalDB extends Dexie {
    entries!: Table<JournalEntry, number>;
    queue!: Table<QueueItem, number>;

    constructor() {
        super("JournalDB");

        this.version(1).stores({
            entries: `++id, createdAt, updatedAt, raw.modelVersion`,
            queue: `++id, entryId, status, createdAt, nextAttemptAt`
        });
    }
}

export const db = new JournalDB();