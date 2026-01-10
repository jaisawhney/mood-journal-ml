import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../storage/JournalDB";

export function useJournalEntries() {
    const entries = useLiveQuery(
        () => db.entries.orderBy("createdAt").reverse().toArray(),
        [],
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