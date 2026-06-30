import PageHeader from "../components/ui/PageHeader";
import HistoryCard from "../components/history/HistoryCard";
import { EmptyStateCard } from "../components/ui/EmptyStateCard";
import { useJournalEntriesForDays } from "../hooks/useJournalEntries";
import { List, useDynamicRowHeight, type RowComponentProps, } from "react-window";
import type { JournalEntry } from "../storage/JournalDB";
import { useMemo, useState } from "react";
import { DATE_RANGES } from "../constants/chartConstants";
import DateRangeSelect from "../components/ui/DateRangeSelect";
import { AnimatePresence, motion } from "framer-motion";
import EmotionSelect from "../components/ui/EmotionSelect";
import SearchInput from "../components/ui/SearchInput";
import type { Emotion } from "../types/types";
import { getAnalysis } from "../utils/emotionHelpers";


function Row({ index, style, entries, }: RowComponentProps<{ entries: JournalEntry[] }>) {
    const entry = entries[index];

    return (
        <div style={style} className="pb-4 last:pb-0">
            <HistoryCard entry={entry} />
        </div>
    );
}

export default function JournalHistoryPage() {
    const [dateRange, setDateRange] = useState(DATE_RANGES[1]);
    const [emotionFilter, setEmotionFilter] = useState<Emotion | "All">("All");
    const [search, setSearch] = useState("");

    const { entries, loading } = useJournalEntriesForDays(dateRange.days);

    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: 750
    });

    const handleDateRangeChange = (label: string) => {
        const selectedRange = DATE_RANGES.find(r => r.label === label);
        if (selectedRange) setDateRange(selectedRange);
    }

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const analysis = getAnalysis(entry);

            const matchesEmotion =
                emotionFilter === "All" ||
                analysis.predictions[emotionFilter];

            const matchesSearch =
                search.trim() === "" ||
                entry.text.toLowerCase().includes(search.toLowerCase());

            return matchesEmotion && matchesSearch;
        });
    }, [entries, emotionFilter, search]);

    return (
        <div className="page-container">
            <div className="page-content-lg">
                <PageHeader
                    title="Journal History"
                    description="Review past entries and reflect more deeply when you want."
                />

                <div className="flex gap-3">
                    <DateRangeSelect
                        value={dateRange.label}
                        ranges={DATE_RANGES}
                        onChange={handleDateRangeChange}
                    />
                    <EmotionSelect
                        value={emotionFilter}
                        onChange={setEmotionFilter}
                    />
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                    />
                </div>

                {!loading && filteredEntries.length !== 0 ? (
                    <section className="space-y-4">
                        <div className="px-1">
                            <h2 className="header">All entries</h2>
                        </div>

                        <AnimatePresence initial={false} mode="wait">
                            <motion.div
                                key={dateRange.label}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className="grid gap-4"
                            >
                                <List
                                    role="list"
                                    rowComponent={Row}
                                    rowCount={filteredEntries.length}
                                    rowHeight={rowHeight}
                                    rowProps={{ entries: filteredEntries }}
                                />
                            </motion.div>
                        </AnimatePresence>
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
