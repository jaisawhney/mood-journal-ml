import type { Emotion } from "../types/types"
import PageHeader from "../components/ui/PageHeader"
import { HistoryCard } from "../components/history/HistoryCard"
import { useJournalEntries } from "../hooks/useJournalEntries"
import { EmptyStateCard } from "../components/ui/EmptyStateCard"

export type JournalEntry = {
    id: string
    date: string
    emotion: Emotion
    text: string
    plutchik_probabilities: Record<Emotion, number>
}

export default function JournalHistoryPage() {
    const { entries } = useJournalEntries()

    return (
        <div className="page-container">
            <div className="page-content-lg">
                <PageHeader
                    title="Journal history"
                    description="Review past entries and reflect more deeply when you want."
                />

                {entries.length !== 0 ? (
                    <section className="space-y-4">
                        <div className="px-1">
                            <h2 className="header">All entries</h2>
                        </div>

                        <div className="grid gap-4">
                            {entries.map((entry) => (
                                <HistoryCard
                                    key={entry.id}
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
            </div>
        </div>
    )
}
