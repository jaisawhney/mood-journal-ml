import classNames from "classnames";
import { EMOTION_COLORS } from "../../constants/emotionMaps";
import type { EmotionSummary } from "../../types/types";

type Props = {
    items: EmotionSummary[];
};
export function EmotionBreakdown({ items }: Props) {
    return (
        <div className="space-y-2">
            {items.map(({ label, value }) => {
                const percent = Math.round(value * 100);

                return (
                    <div key={label} className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span className="capitalize">{label}</span>
                            <span>{Math.round(value * 100)}%</span>
                        </div>

                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className={classNames(
                                    "h-full rounded-full transition-all",
                                    EMOTION_COLORS[label]
                                )}
                                style={{ width: `${percent}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
