import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../storage/JournalDB";
import { useMemo } from "react";

/**
 * Hook to get journal entries within an optional date range
 * @param start optional start date
 * @param end optional end date
 * @returns journal entries and loading state
 */
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

/**
 * Hook to get a single journal entry by ID
 * @param id journal entry ID
 * @returns the journal entry and loading state
 */
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

/** Hook to get journal entries for the past specified number of days
 * @param days number of days
 * @returns journal entries and loading state
 */
export function useJournalEntriesForDays(days: number) {
    const cutoff = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() - days + 1);
        return date;
    }, [days]);
    const { entries, loading } = useJournalEntries(cutoff);
    return { entries, loading };
}