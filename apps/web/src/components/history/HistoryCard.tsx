import classNames from "classnames";
import { useState } from "react";
import { EmotionIcon } from "../ui/EmotionIcon";
import { EMOTION_COLORS } from "../../constants/emotionMaps";
import type { Emotion, JournalEntry } from "../../types/types";
import { EmotionBreakdown } from "../ui/EmotionBreakdown";
import { applyThreshold } from "../../utils/emotionAggregation";
import { EmotionOverride } from "../ui/EmotionOverride";
import { updatePrimaryEmotion } from "../../storage/db";
import { formatDate } from "../../utils/date";
import { useJournalEntries } from "../../hooks/useJournalEntries";

type Props = {
    entry: JournalEntry;
};

export function HistoryCard({ entry }: Props) {
    const { refresh } = useJournalEntries()

    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [emotion, setEmotion] = useState<Emotion>(entry.emotion);

    const journalEntryId = Number(entry.id);
    async function updateEmotion(emotion: Emotion) {
        setEditing(false);
        setEmotion(emotion);
        await updatePrimaryEmotion(journalEntryId, emotion);
        refresh();
    }

    return (
        <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {formatDate(entry.timestamp)}
                </span>

                <div className="mood-badge">
                    <EmotionIcon
                        emotion={emotion}
                        size={16}
                        className={classNames(
                            EMOTION_COLORS[emotion],
                            "rounded-full"
                        )} />
                    <span className="text-xs font-medium text-slate-600 capitalize">
                        {emotion}
                    </span>
                </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                {entry.text}
            </p>

            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
                {expanded ? "Hide details" : "View details"}
            </button>

            {expanded && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                    {entry.emotion != entry.result.primary_emotion && (
                        <div className="text-xs text-slate-400">
                            Emotion adjusted by you
                        </div>
                    )}
                    <EmotionBreakdown
                        items={applyThreshold(
                            Object.entries(entry.result.plutchik_probabilities).map(
                                ([label, value]) => ({
                                    label: label as Emotion,
                                    value,
                                })
                            )
                        )}
                    />

                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer"
                        >
                            Adjust interpretation
                        </button>
                    ) : (
                        <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                            <p className="text-xs text-slate-500">
                                Does this feel more accurate?
                            </p>

                            <EmotionOverride
                                value={emotion}
                                onChange={updateEmotion}
                                size="sm"
                            />
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
