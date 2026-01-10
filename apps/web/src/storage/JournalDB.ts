import Dexie, { type Table } from 'dexie';
import type { Emotion } from '../types/types';

export type Analysis = {
    buckets: Record<Emotion, number>;
    intensity: number;
    dominance: number;
};

export type UserOverride = {
    buckets?: Partial<Record<Emotion, number>>;
    intensity?: number;
    note?: string;
    updatedAt: number;
};

export type RawEmotionOutput = {
    logits: Record<string, number>;
    deltas?: Record<string, number>;
    intensity?: number;
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


export class JournalDB extends Dexie {
    entries!: Table<JournalEntry, number>;

    constructor() {
        super("JournalDB");

        this.version(1).stores({
            entries: `++id, createdAt, updatedAt, raw.modelVersion`,
        });
    }
}

export const db = new JournalDB();