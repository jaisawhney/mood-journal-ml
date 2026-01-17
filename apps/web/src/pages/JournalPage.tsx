import { useState } from "react"
import PageHeader from "../components/ui/PageHeader"
import { toast } from 'sonner';
import JournalForm from "../components/journal/JournalForm"
import { createJournalEntry } from "../storage/journalRepository"
import { useInferenceQueue } from "../hooks/useInferenceQueue";
import JournalSummaryCard from "../components/journal/JournalSummaryCard";

const HARD_LIMIT = 2000;
const HINT_THRESHOLD = 100;
export default function JournalPage() {
    const [text, setText] = useState("");
    const [journalEntryId, setJournalEntryId] = useState<number | null>(null);

    const { analyze } = useInferenceQueue(journalEntryId ?? undefined);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmedText = text.trim();
        if (!trimmedText) return;

        try {
            const id = await createJournalEntry(trimmedText);
            setJournalEntryId(id);
            await analyze(id);
            setText("");
        } catch (error) {
            console.error("Error creating journal entry:", error);
            toast.error("Failed to save or analyze your journal entry. Please try again.");
        }
    }

    return (
        <div className="page-container">
            <div className="page-content">
                <PageHeader title="Journal" description="Write freely. Analysis stays on your device." />
                {journalEntryId ? (
                    <JournalSummaryCard onClose={() => setJournalEntryId(null)} />
                ) : (
                    <JournalForm
                        text={text}
                        onChange={e => setText(e.target.value)}
                        onSubmit={handleSubmit}
                        loading={false}
                        hardLimit={HARD_LIMIT} showHint={text.length > 0 && text.length < HINT_THRESHOLD} />
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