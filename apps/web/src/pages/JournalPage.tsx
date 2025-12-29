import { useState } from "react"
import PageHeader from "../components/ui/PageHeader"
import useEmotionModel from "../hooks/useEmotionModel"
import { saveJournalEntry } from "../storage/db"
import type { PlutchikResult } from "../types/types"
import JournalSummaryCard from "../components/journal/JournalSummaryCard"
import JournalForm from "../components/journal/JournalForm"

const SOFT_LIMIT = 500
const HARD_LIMIT = 2000

export default function JournalPage() {
    const { predict, loading } = useEmotionModel()
    const [text, setText] = useState("")
    const [showHint, setShowHint] = useState(false)
    const [lastResult, setLastResult] = useState<PlutchikResult | null>(null);
    const [journalEntryId, setJournalEntryId] = useState<number | null>(null);

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const value = e.target.value
        if (value.length >= SOFT_LIMIT && !showHint) setShowHint(true)
        setText(value)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        const trimmedText = text.trim()
        if (!trimmedText) return

        try {
            const result = await predict(trimmedText)
            const journalEntryId = await saveJournalEntry(trimmedText, result)
            setJournalEntryId(journalEntryId);

            setLastResult(result);
            setText("");
        } catch (err) {
            console.error("Failed to save journal entry:", err);
        }
    }

    return (
        <div className="page-container">
            <div className="page-content">
                <PageHeader title="Journal" description="Write freely. We will reflect how you are feeling after." />
                {lastResult && journalEntryId !== null ? (
                    <JournalSummaryCard journalEntryId={journalEntryId} lastResult={lastResult} onClose={() => {
                        setLastResult(null);
                        setJournalEntryId(null);
                    }} />
                ) : (
                    <JournalForm
                        text={text}
                        onChange={handleChange}
                        onSubmit={handleSubmit}
                        showHint={showHint}
                        loading={loading}
                        hardLimit={HARD_LIMIT}
                    />
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