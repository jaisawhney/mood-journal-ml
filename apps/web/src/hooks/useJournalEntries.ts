import { useCallback, useEffect, useState } from "react";
import type { JournalEntry } from "../types/types";
import { getJournalEntries } from "../storage/db";


export function useJournalEntries() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const all = await getJournalEntries();
            setEntries([...all].sort((a, b) => b.timestamp - a.timestamp));
        } catch (err) {
            console.error("Failed to load journal entries:", err);
            setError(new Error("Failed to load journal entries"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { entries, loading, error, refresh: load, setEntries };
}