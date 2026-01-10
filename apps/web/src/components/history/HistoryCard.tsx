import React from "react";
import { useState } from "react";
import classNames from "classnames";
import EmotionIcon from "../ui/EmotionIcon";
import { EmotionOverride } from "../ui/EmotionOverride";
import { getEmotionColor } from "../../constants/emotionMaps";
import { formatDate } from "../../utils/date";
import { updateUserOverride } from "../../storage/journalRepository";
import { getAnalysis, getPrimaryEmotion } from "../../utils/emotionHelpers";
import type { Analysis, Emotion } from "../../types/types";
import type { JournalEntry } from "../../storage/JournalDB";

type Props = {
    entry: JournalEntry;
};

function HistoryCard({ entry }: Props) {
    const [expanded, setExpanded] = useState(false);

    const journalEntryId = entry.id!;
    const analysis: Analysis = getAnalysis(entry);
    const effectiveBuckets = analysis.buckets;

    const selectedEmotions = Object.keys(effectiveBuckets).map(emotion => emotion) as Emotion[];

    const primaryEmotion = getPrimaryEmotion(effectiveBuckets);

    async function updateEmotions(emotions: Emotion[]) {
        const buckets: Partial<Record<Emotion, number>> = {};
        for (const emotion of emotions) {
            buckets[emotion] = 1;
        }
        await updateUserOverride(journalEntryId, { buckets });
    }

    return (
        <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {formatDate(entry.createdAt)}
                </span>

                <div className="mood-badge">
                    <EmotionIcon
                        emotion={primaryEmotion}
                        size={16}
                        className={classNames(
                            getEmotionColor(primaryEmotion),
                            "rounded-full"
                        )} />
                    <span className="text-xs font-medium text-slate-600 capitalize">
                        {primaryEmotion || "Neutral"}
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
                    {analysis.isOverridden && (
                        <div className="text-xs text-slate-400">
                            Emotions adjusted by you
                        </div>
                    )}

                    <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                        <p className="text-xs text-slate-500">
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