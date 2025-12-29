import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Emotion, JournalEntry, PlutchikResult } from "../types/types";


interface MoodTrackerDB extends DBSchema {
    entries: {
        key: number;
        value: JournalEntry;
        indexes: {
            "by-timestamp": number;
            "by-emotion": Emotion;
        };
    };
}

let db: IDBPDatabase<MoodTrackerDB> | null = null;

export const initDB = async (): Promise<IDBPDatabase<MoodTrackerDB>> => {
    if (db) return db;

    db = await openDB<MoodTrackerDB>("mood-tracker", 2, {
        upgrade(database) {
            if (!database.objectStoreNames.contains("entries")) {
                const store = database.createObjectStore("entries", {
                    keyPath: "id",
                    autoIncrement: true,
                });

                store.createIndex("by-timestamp", "timestamp");
                store.createIndex(
                    "by-emotion",
                    "result.primary_emotion"
                );
            }
        },
    });

    return db;
};

export const saveJournalEntry = async (text: string, result: PlutchikResult): Promise<number> => {
    const database = await initDB();
    const entry: JournalEntry = {
        text,
        emotion: result.primary_emotion,
        result,
        timestamp: Date.now(),
    };
    return database.add("entries", entry);
}

export const updateJournalEntry = async (id: number, text: string, result: PlutchikResult): Promise<void> => {
    const database = await initDB();
    const entry: JournalEntry = {
        id,
        text,
        emotion: result.primary_emotion,
        result,
        timestamp: Date.now(),
    };
    await database.put("entries", entry);
}

export const updatePrimaryEmotion = async (id: number, emotion: Emotion): Promise<void> => {
    const database = await initDB();
    const entry = await database.get("entries", id);
    if (!entry) throw new Error("Journal entry not found");

    entry.emotion = emotion;
    await database.put("entries", entry);
}

export const getJournalEntries = async (): Promise<JournalEntry[]> => {
    const database = await initDB();
    return database.getAllFromIndex("entries", "by-timestamp");
}

export const getRecentJournalEntries = async (limit: number = 10): Promise<JournalEntry[]> => {
    const database = await initDB();
    const index = database.transaction("entries", "readonly").store.index("by-timestamp");

    const all = await index.getAll();
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export const getJournalEntriesByEmotion = async (emotion: Emotion): Promise<JournalEntry[]> => {
    const database = await initDB();
    return database.getAllFromIndex("entries", "by-emotion", emotion);
}

export const deleteJournalEntry = async (id: number): Promise<void> => {
    const database = await initDB();
    await database.delete("entries", id);
}

export const clearAllJournalEntries = async (): Promise<void> => {
    const database = await initDB();
    await database.clear("entries");
}