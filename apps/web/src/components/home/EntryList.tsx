import { EmptyStateCard } from "../ui/EmptyStateCard";
import EntryCard from "./EntryCard";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import type { JournalEntry } from "../../storage/JournalDB";

type Props = {
    entries: JournalEntry[];
};

function Row({ index, style, entries, }: RowComponentProps<{ entries: JournalEntry[] }>) {
    const entry = entries[index];

    return (
        <div style={style} className="pb-4 last:pb-0">
            <EntryCard entry={entry} />
        </div>
    );
}

export function EntryList({ entries }: Props) {
    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: 750
    });
    return (
        <>

            {entries.length !== 0 ? (

                <section className="space-y-4">
                    <div className="px-1">
                        <h2 className="header">Recent journal entries</h2>
                    </div>

                    <List
                        role="list"
                        rowComponent={Row}
                        rowCount={entries.length}
                        rowHeight={rowHeight}
                        rowProps={{ entries }}
                    />
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
