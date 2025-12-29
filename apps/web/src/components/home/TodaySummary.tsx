import classNames from "classnames";
import { EmotionIcon } from "../ui/EmotionIcon";
import { type Emotion } from "../../types/types";
import { EMOTION_COLORS } from "../../constants/emotionMaps";

type Props = {
    entriesCount: number;
    primaryEmotion: Emotion;
};

export function TodaySummary({ entriesCount, primaryEmotion }: Props) {
    const hasEntries = entriesCount > 0;
    return (
        <section className={classNames("card", "flex items-center justify-between gap-6 p-6")}>
            <div className="space-y-2">
                <span className="mood-badge text-xs font-medium text-slate-600 uppercase tracking-wide">
                    Today
                </span>
                <p className="text-strong-sm">You logged {entriesCount} entries today</p>
                <p className="text-sm text-slate-500">Quick snapshot of your day so far</p>
            </div>

            <div className="flex items-center gap-4 border-l border-slate-100 pl-6">
                <div className={classNames("flex h-12 w-12 items-center justify-center rounded-xl", hasEntries ? EMOTION_COLORS[primaryEmotion] : "bg-slate-100")}>
                    <EmotionIcon emotion={hasEntries ? primaryEmotion : undefined} size={28} />
                </div>

                <div className="space-y-0.5">
                    <p className="label">Overall mood</p>
                    <p className="text-strong-sm capitalize leading-tight">{hasEntries ? primaryEmotion : "No entries"}</p>
                </div>
            </div>
        </section>
    );
}
