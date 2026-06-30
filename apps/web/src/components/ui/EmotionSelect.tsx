import { EMOTIONS } from "../../constants/emotionMaps";
import type { Emotion } from "../../types/types";

type Props = {
    value: Emotion | "All";
    onChange: (value: Emotion | "All") => void;
};

export default function EmotionSelect({ value, onChange }: Props) {
    return (
        <section className="flex items-center gap-2">
            <span className="text-secondary">Emotion</span>

            <select
                aria-label="Filter by emotion"
                value={value}
                onChange={e => onChange(e.target.value as Emotion | "All")}
                className="capitalize select-input dark:!bg-neutral-800"
            >
                <option value="All">All</option>

                {EMOTIONS.map(emotion => (
                    <option key={emotion} value={emotion}>
                        {emotion}
                    </option>
                ))}
            </select>
        </section>
    );
}