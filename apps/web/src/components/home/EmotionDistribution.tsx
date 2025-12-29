import classNames from "classnames";
import type { EmotionSummary } from "../../types/types";
import { EmotionBreakdown } from "../ui/EmotionBreakdown";

type Props = {
    items: EmotionSummary[];
};
export function EmotionDistribution({ items }: Props) {
    return (
        <section className={classNames("card", "p-6")}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-700">Recent Emotion Distribution</h2>
            <div className="space-y-3">
                <EmotionBreakdown items={items} />
            </div>
        </section>
    );
}
