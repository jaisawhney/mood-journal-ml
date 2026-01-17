import { useState } from "react";
import classNames from "classnames";
import EmotionIcon from "../ui/EmotionIcon";
import { EmotionOverride } from "../ui/EmotionOverride";
import { getEmotionColor } from "../../constants/emotionMaps";
import { formatDate } from "../../utils/date";
import ArmedButton from "../ui/ArmedButton";
import { deleteEntry, updateUserOverride } from "../../storage/journalRepository";
import { getAnalysis, getOverrideBuckets, getPrimaryEmotion } from "../../utils/emotionHelpers";
import { getDisplayBuckets } from "../../storage/journalRepository";
import type { Analysis, Emotion } from "../../types/types";
import type { JournalEntry } from "../../storage/JournalDB";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { toast } from "sonner";
import { useInferenceQueue } from "../../hooks/useInferenceQueue";

type Props = {
    entry: JournalEntry;
};

export default function HistoryCard({ entry }: Props) {
    const [expanded, setExpanded] = useState(false);
    const journalEntryId = entry.id!;
    const analysis: Analysis = getAnalysis(entry);
    const displayBuckets = getDisplayBuckets(analysis.buckets);
    const selectedEmotions = displayBuckets.map(([emotion]) => emotion as Emotion);
    const primaryEmotion = getPrimaryEmotion(Object.fromEntries(displayBuckets));

    const { isQueued } = useInferenceQueue(journalEntryId);

    async function updateEmotions(emotions: Emotion[]) {
        const buckets = getOverrideBuckets(entry, emotions);
        try {
            await updateUserOverride(journalEntryId, { buckets });
        } catch (error) {
            console.error("Failed to update user emotion override for entry", journalEntryId, error);
            toast.error("Failed to update emotions. Please try again.");
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {formatDate(entry.createdAt)}
                </span>

                <div className="mood-badge">
                    <span className={classNames(
                        getEmotionColor(primaryEmotion),
                        "rounded-full mood-badge-icon"
                    )}>
                        <EmotionIcon
                            emotion={primaryEmotion}
                            size={16} />
                    </span>
                    <span className="mood-badge-text">
                        {isQueued && !primaryEmotion ? "Analyzing..." : primaryEmotion || "Neutral"}
                    </span>
                </div>
            </div>

            <p className="entry-text">
                {entry.text}
            </p>

            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="text-xs text-secondary hover:text-slate-400 transition cursor-pointer"
            >
                {expanded ? "Hide breakdown" : "View breakdown"}
            </button>
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -5 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 5 }}
                        transition={{ duration: 0.15, ease: "easeInOut" }}
                        className="grid gap-4"
                    >
                        <div className="pt-4 border-t border-slate-300 dark:border-slate-100 space-y-4">
                            {analysis.isOverridden && (
                                <div className="text-xs text-secondary">
                                    Adjusted by you
                                </div>
                            )}
                            <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-neutral-900">
                                <p className="text-slate-400 mb-1">{displayBuckets.length > 0 ? "Used in insights as" : "Not contributing to insights"}</p>
                                <div className="flex flex-wrap gap-2">
                                    <LayoutGroup id={journalEntryId.toString()}>
                                        <motion.ul className="contents" >
                                            <AnimatePresence initial={false}>
                                                {displayBuckets.map(([emotion], idx) => (
                                                    <motion.li
                                                        key={emotion}
                                                        layoutDependency={displayBuckets.length}
                                                        className="inline-block mr-2 mb-2"
                                                        layout
                                                        variants={itemVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="hidden"
                                                        transition={{ duration: 0.18, ease: "easeOut" }}
                                                    >
                                                        <div
                                                            className={classNames(
                                                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium select-none",
                                                                getEmotionColor(emotion as Emotion)
                                                            )}
                                                        >
                                                            <EmotionIcon emotion={emotion as Emotion} size={12} />
                                                            {emotion}
                                                            <span className="opacity-70">
                                                                #{idx + 1}
                                                            </span>
                                                        </div>
                                                    </motion.li>
                                                ))}
                                            </AnimatePresence>
                                        </motion.ul>
                                    </LayoutGroup>
                                </div>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3 space-y-2 transition-all ease-in-out dark:bg-neutral-900">
                                <p className="text-xs text-secondary">
                                    Click to adjust
                                </p>
                                <EmotionOverride
                                    value={selectedEmotions}
                                    onChange={updateEmotions}
                                    size="sm"
                                />
                                <div className="flex items-center justify-end pt-3">
                                    {/* TODO: Add edit button */}
                                    <ArmedButton
                                        label="Delete entry"
                                        confirmLabel="Press again to confirm"
                                        onConfirm={() => deleteEntry(journalEntryId)}
                                        className="text-xs text-red-500 hover:text-red-600 hover:underline transition cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}