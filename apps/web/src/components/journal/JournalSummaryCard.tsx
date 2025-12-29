import type { Emotion, PlutchikResult } from "../../types/types";
import { useState } from "react";
import { updatePrimaryEmotion } from "../../storage/db";
import { useJournalEntries } from "../../hooks/useJournalEntries";
import { EmotionOverride } from "../ui/EmotionOverride";

type Props = {
    journalEntryId: number;
    lastResult: PlutchikResult;
    onClose: () => void;
};

export default function JournalSummaryCard({ journalEntryId, lastResult, onClose }: Props) {
    const { refresh } = useJournalEntries()

    const [selectedEmotion, setSelectedEmotion] = useState<Emotion>(lastResult.primary_emotion);
    const [showOverride, setShowOverride] = useState(false);

    async function updateEmotion(emotion: Emotion) {
        setSelectedEmotion(emotion);
        await updatePrimaryEmotion(journalEntryId, emotion);
        refresh();
    }

    return (
        <section className="card p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="header">Reflection</h2>
                    <p className="text-lg">
                        Today felt mostly like
                        <span className="font-semibold capitalize">
                            {" " + selectedEmotion}
                        </span>
                        .
                    </p>
                </div>

                {!showOverride && (
                    <button
                        type="button"
                        onClick={() => setShowOverride(true)}
                        className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                    >
                        Feels a little off?
                    </button>
                )}
            </div>

            <button
                onClick={onClose}
                className="rounded-lg px-6 py-2 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer"
            >
                Write another entry
            </button>
            {showOverride && (<EmotionOverride value={selectedEmotion} onChange={updateEmotion} />)}
        </section>
    );
}
