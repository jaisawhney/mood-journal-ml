import PageHeader from "../components/ui/PageHeader";
import HistoryCard from "../components/history/HistoryCard";
import { EmptyStateCard } from "../components/ui/EmptyStateCard";
import { useJournalEntriesForDays } from "../hooks/useJournalEntries";
import { List, useDynamicRowHeight, type RowComponentProps, } from "react-window";
import type { JournalEntry } from "../storage/JournalDB";
import { useState } from "react";
import { DATE_RANGES } from "../constants/chartConstants";
import DateRangeSelect from "../components/ui/DateRangeSelect";


function Row({ index, style, entries, }: RowComponentProps<{ entries: JournalEntry[] }>) {
    const entry = entries[index];

    return (
        <div style={style} className="pb-4 last:pb-0">
            <HistoryCard entry={entry} />
        </div>
    );
}

export default function JournalHistoryPage() {
    const [range, setRange] = useState(DATE_RANGES[1]);
    const { entries, loading } = useJournalEntriesForDays(range.days);

    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: 750
    });

    return (
        <div className="page-container">
            <div className="page-content-lg">
                <PageHeader
                    title="Journal History"
                    description="Review past entries and reflect more deeply when you want."
                />

                <DateRangeSelect
                    value={range.label}
                    ranges={DATE_RANGES}
                    onChange={label => setRange(DATE_RANGES.find(r => r.label === label) ?? range)}
                />

                {!loading && entries.length !== 0 ? (
                    <section className="space-y-4">
                        <div className="px-1">
                            <h2 className="header">All entries</h2>
                        </div>

                        <div className="grid gap-4">
                            <List
                                rowComponent={Row}
                                rowCount={entries.length}
                                rowHeight={rowHeight}
                                rowProps={{ entries }}
                            />
                        </div>
                    </section>
                ) : !loading ? (
                    <EmptyStateCard
                        header="Nothing here yet"
                        message="Write your first journal entry to see it appear here."
                    />
                ) : null}
            </div>
        </div>
    );
}
