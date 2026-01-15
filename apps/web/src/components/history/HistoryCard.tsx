import React from "react";
import { useState } from "react";
import classNames from "classnames";
import EmotionIcon from "../ui/EmotionIcon";
import { EmotionOverride } from "../ui/EmotionOverride";
import { getEmotionColor } from "../../constants/emotionMaps";
import { formatDate } from "../../utils/date";
import { updateUserOverride } from "../../storage/journalRepository";
import { getAnalysis, getOverrideBuckets, getPrimaryEmotion } from "../../utils/emotionHelpers";
import { getDisplayBuckets } from "../../storage/journalRepository";
import type { Analysis, Emotion } from "../../types/types";
import type { JournalEntry } from "../../storage/JournalDB";

type Props = {
    entry: JournalEntry;
};

function HistoryCard({ entry }: Props) {
    const [expanded, setExpanded] = useState(false);

    const journalEntryId = entry.id!;
    const analysis: Analysis = getAnalysis(entry);
    const displayBuckets = getDisplayBuckets(analysis.buckets);
    const selectedEmotions = displayBuckets.map(([emotion]) => emotion as Emotion);
    const primaryEmotion = getPrimaryEmotion(Object.fromEntries(displayBuckets));

    async function updateEmotions(emotions: Emotion[]) {
        const buckets = getOverrideBuckets(entry, emotions);
        await updateUserOverride(journalEntryId, { buckets });
    }

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
                        {primaryEmotion || "Neutral"}
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
                {expanded ? "Hide details" : "View details"}
            </button>

            {expanded && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                    {analysis.isOverridden && (
                        <div className="text-xs text-secondary">
                            Emotions adjusted by you
                        </div>
                    )}

                    <div className="rounded-lg bg-slate-50 p-3 space-y-2 transition-all ease-in-out dark:bg-transparent dark:p-0">
                        <p className="text-xs text-secondary">
                            Click to adjust
                        </p>
                        <EmotionOverride
                            value={selectedEmotions}
                            onChange={updateEmotions}
                            size="sm"
                        />
                    </div>
                </div>
            )}

        </div>
    );
}


export default React.memo(HistoryCard);