import classNames from "classnames";
import type { JournalEntry } from "../../types/types";
import { EmotionIcon } from "../ui/EmotionIcon";
import { EMOTION_COLORS } from "../../constants/emotionMaps";
import { formatDate } from "../../utils/date";

export function EntryCard({ entry }: { entry: JournalEntry }) {
    const emotion = entry.emotion;

    return (
        <div className={classNames("card", "p-5 space-y-3")}>
            <div className="flex items-center justify-between">
                <span className="meta-label">
                    {formatDate(entry.timestamp)}
                </span>

                <div className="mood-badge">
                    <EmotionIcon
                        emotion={emotion}
                        size={16}
                        className={classNames(
                            EMOTION_COLORS[emotion],
                            "rounded-full"
                        )}
                    />
                    <span className="text-xs font-medium text-slate-600 capitalize">
                        {emotion}
                    </span>
                </div>
            </div>

            <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                {entry.text}
            </p>
        </div>
    );
}
