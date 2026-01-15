import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../storage/JournalDB";

export function useJournalEntries(start?: Date, end?: Date) {
    const startTimestamp = start?.getTime();
    const endTimestamp = end?.getTime();

    const entries = useLiveQuery(
        () => {
            const coll = db.entries.where("createdAt");
            return coll.between(startTimestamp ?? 0, endTimestamp ?? Date.now(), true, true).reverse().toArray();
        },
        [startTimestamp, endTimestamp],
    );

    return {
        entries: entries ?? [],
        loading: entries === undefined,
    };
}

export function useJournalEntry(id: number) {
    const entry = useLiveQuery(
        async () => {
            return db.entries.get(id);
        },
        [id]
    );
    return {
        entry,
        loading: entry === undefined,
    };
}