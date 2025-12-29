import type { JournalEntry } from "../../types/types";
import { EmptyStateCard } from "../ui/EmptyStateCard";
import { EntryCard } from "./EntryCard";

type Props = {
    entries: JournalEntry[];
};


export function EntryList({ entries }: Props) {
    return (
        <>
            {entries.length !== 0 ? (
                <section className="space-y-4">
                    <div className="px-1">
                        <h2 className="header">Recent journal entries</h2>
                    </div>

                    <div className="grid gap-4">
                        {entries.map((entry) => (
                            <EntryCard
                                key={entry.id ?? entry.timestamp}
                                entry={entry}
                            />
                        ))}
                    </div>
                </section>
            ) : (
                <EmptyStateCard
                    header="Nothing here yet"
                    message="Write your first journal entry to see it appear here."
                />
            )}
        </>
    );
}
