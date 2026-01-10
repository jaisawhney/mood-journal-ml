import React from "react";
import classNames from "classnames";
import EmotionIcon from "../ui/EmotionIcon";
import { getEmotionColor } from "../../constants/emotionMaps";
import { formatDate } from "../../utils/date";
import { getAnalysis, getPrimaryEmotion } from "../../utils/emotionHelpers";
import type { Analysis, Emotion } from "../../types/types";
import type { JournalEntry } from "../../storage/JournalDB";

function EntryCard({ entry }: { entry: JournalEntry }) {
    const analysis: Analysis = getAnalysis(entry);
    const emotion: Emotion | null = getPrimaryEmotion(analysis.buckets);
    return (
        <div className={classNames("card", "p-5 space-y-3")}>
            <div className="flex items-center justify-between">
                <span className="meta-label">
                    {formatDate(entry.createdAt)}
                </span>

                <div className="mood-badge">
                    <EmotionIcon
                        emotion={emotion}
                        size={16}
                        className={classNames(
                            getEmotionColor(emotion),
                            "rounded-full"
                        )}
                    />
                    <span className="text-xs font-medium text-slate-600 capitalize">
                        {emotion || "Neutral"}
                    </span>
                </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                {entry.text}
            </p>
        </div>
    );
}

export default React.memo(EntryCard);