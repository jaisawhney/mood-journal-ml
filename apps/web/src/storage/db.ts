import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface MoodEntry {
    id?: number;
    text: string;
    emotion: string;
    confidence: number;
    scores: Record<string, number>;
    timestamp: number;
    analyzed: 0 | 1;
}

interface MoodTrackerDB extends DBSchema {
    entries: {
        key: number;
        value: MoodEntry;
        indexes: {
            'by-timestamp': number;
            'by-analyzed': 0 | 1;
        };
    };
}

let db: IDBPDatabase<MoodTrackerDB> | null = null;

export const initDB = async (): Promise<IDBPDatabase<MoodTrackerDB>> => {
    if (db) return db;

    db = await openDB<MoodTrackerDB>('mood-tracker', 1, {
        upgrade(database) {
            if (!database.objectStoreNames.contains('entries')) {
                const store = database.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
                store.createIndex('by-analyzed', 'analyzed', { unique: false });
                store.createIndex('by-timestamp', 'timestamp', { unique: false });
            }
        },
    });

    return db;
};

export const saveMoodEntry = async (entry: Omit<MoodEntry, 'id'>): Promise<number> => {
    const database = await initDB();
    return database.add('entries', entry);
};

export const getMoodEntries = async (): Promise<MoodEntry[]> => {
    const database = await initDB();
    return database.getAll('entries');
};

export async function getPendingMoodEntries() {
    const database = await initDB();
    return database.getAllFromIndex('entries', 'by-analyzed', 0);
}

export const updateMoodEntry = async (id: number, updates: Partial<Omit<MoodEntry, 'id'>>): Promise<void> => {
    const database = await initDB();
    const entry = await database.get('entries', id);
    if (entry) {
        await database.put('entries', { ...entry, ...updates });
    }
};

export const deleteMoodEntry = async (id: number): Promise<void> => {
    const database = await initDB();
    await database.delete('entries', id);
};

export const clearAllEntries = async (): Promise<void> => {
    const database = await initDB();
    await database.clear('entries');
};
