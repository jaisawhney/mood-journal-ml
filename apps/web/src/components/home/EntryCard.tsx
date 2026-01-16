import classNames from "classnames";
import EmotionIcon from "../ui/EmotionIcon";
import { getEmotionColor } from "../../constants/emotionMaps";
import { formatDate } from "../../utils/date";
import { getAnalysis, getPrimaryEmotion } from "../../utils/emotionHelpers";
import type { Analysis, Emotion } from "../../types/types";
import type { JournalEntry } from "../../storage/JournalDB";

export default function EntryCard({ entry }: { entry: JournalEntry }) {
    const analysis: Analysis = getAnalysis(entry);
    const emotion: Emotion | null = getPrimaryEmotion(analysis.buckets);
    return (
        <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
                <span className="meta-label">
                    {formatDate(entry.createdAt)}
                </span>

                <div className="mood-badge">
                    <span className={classNames(getEmotionColor(emotion),
                        "mood-badge-icon rounded-full")}>
                        <EmotionIcon
                            emotion={emotion}
                            size={16}
                        />
                    </span>
                    <span className="mood-badge-text">
                        {emotion || "Neutral"}
                    </span>
                </div>
            </div>

            <p className="entry-text">
                {entry.text}
            </p>
        </div>
    );
}