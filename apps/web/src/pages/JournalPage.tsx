import { useState, useEffect } from "react"
import PageHeader from "../components/ui/PageHeader"
import { toast } from 'sonner';
import useEmotionModel from "../hooks/useEmotionModel"
import JournalSummaryCard from "../components/journal/JournalSummaryCard"
import JournalForm from "../components/journal/JournalForm"
import { createJournalEntry } from "../storage/journalRepository"
import { useJournalEntry } from "../hooks/useJournalEntries"

const HARD_LIMIT = 2000

export default function JournalPage() {
    const { predict, loading, error } = useEmotionModel();
    useEffect(() => {
        if (error) {
            toast.error("Something went wrong. Please try again.");
        }
    }, [error]);
    const [text, setText] = useState("");
    const [journalEntryId, setJournalEntryId] = useState<number | null>(null);
    const { entry } = useJournalEntry(journalEntryId ?? 0);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const trimmedText = text.trim();
            if (!trimmedText) return;

            const result = await predict(trimmedText);
            if (!result) return;

            const id = await createJournalEntry(trimmedText, result);

            setJournalEntryId(id);
            setText("");
        } catch (error) {
            console.error("Error creating journal entry:", error);
        }
    }


    return (
        <div className="page-container">
            <div className="page-content">
                <PageHeader title="Journal" description="Write freely. Analysis stays on your device." />
                {entry ? (
                    <JournalSummaryCard journalEntryId={journalEntryId} entry={entry} onClose={() => {
                        setJournalEntryId(null);
                    }} />
                ) : (
                    <JournalForm
                        text={text}
                        onChange={e => setText(e.target.value)}
                        onSubmit={handleSubmit}
                        loading={loading}
                        hardLimit={HARD_LIMIT} showHint={text.length > 0 && text.length < 100} />
                )}
                <section className="card p-6 mt-6">
                    <h2 className="header">Your Privacy</h2>
                    <p className="text-muted">
                        All journal entries are stored and processed entirely on your device. Nothing is sent to our servers, and your data never leaves your control.
                    </p>
                </section>
            </div>
        </div >
    )
}