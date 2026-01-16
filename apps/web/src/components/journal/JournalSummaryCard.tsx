import { useState } from "react";
import { EmotionOverride } from "../ui/EmotionOverride";
import { getAnalysis, getOverrideBuckets, getPrimaryEmotion } from "../../utils/emotionHelpers";
import { getDisplayBuckets } from "../../storage/journalRepository";
import { updateUserOverride } from "../../storage/journalRepository";
import type { Emotion } from "../../types/types";
import type { JournalEntry } from "../../storage/JournalDB";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
    journalEntryId: number | null;
    entry: JournalEntry;
    onClose: () => void;
};

export default function JournalSummaryCard({ journalEntryId, entry, onClose }: Props) {
    const [showOverride, setShowOverride] = useState(false);

    const analysis = getAnalysis(entry);
    const displayBuckets = getDisplayBuckets(analysis.buckets);
    const selectedEmotions = displayBuckets.map(([emotion]) => emotion as Emotion);
    const primaryEmotion = getPrimaryEmotion(Object.fromEntries(displayBuckets));

    async function updateEmotions(emotions: Emotion[]) {
        if (journalEntryId === null) return;
        const buckets = getOverrideBuckets(entry, emotions);
        await updateUserOverride(journalEntryId, { buckets });
    }

    return (
        <section className="card p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="header">Reflection</h2>
                    <p className="text-lg">
                        Today felt mostly like
                        <span className="font-semibold capitalize">
                            {" " + (primaryEmotion || "an indescribable emotion")}
                        </span>
                        .
                    </p>
                </div>

                {!showOverride && (
                    <button
                        type="button"
                        onClick={() => setShowOverride(true)}
                        className="text-xs text-secondary hover:text-slate-600 hover:underline cursor-pointer"
                        aria-expanded={showOverride}
                        aria-controls="override-panel"
                    >
                        Feels a little off?
                    </button>
                )}
            </div>


            <button
                onClick={onClose}
                className="rounded-lg px-6 py-2 text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 cursor-pointer"
            >
                Write another entry
            </button>
            <AnimatePresence initial={false}>

                {showOverride && (
                    <motion.div
                        id="override-panel"
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 5 }}
                        transition={{ duration: 0.15, ease: "easeInOut" }}
                    >
                        <EmotionOverride value={selectedEmotions} onChange={updateEmotions} />
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
