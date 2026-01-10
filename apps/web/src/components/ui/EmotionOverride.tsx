import React from "react";
import classNames from "classnames";
import { EMOTIONS, getEmotionColor } from "../../constants/emotionMaps";
import EmotionIcon from "../ui/EmotionIcon";
import type { Emotion } from "../../types/types";

interface EmotionOverrideProps {
    value: Emotion[];
    onChange: (emotions: Emotion[]) => void;
    disabled?: boolean;
    size?: "sm" | "md";
}

export const EmotionOverride: React.FC<EmotionOverrideProps> = ({ value, onChange, disabled, size = "md" }) => {
    function toggleEmotion(emotion: Emotion) {
        if (value.includes(emotion)) {
            onChange(value.filter(e => e !== emotion));
        } else {
            onChange([...value, emotion]);
        }
    }
    return (
        <div className="flex flex-wrap gap-3">
            {EMOTIONS.map((item) => {
                const selected = value.includes(item as Emotion);
                return (
                    <button
                        key={item}
                        type="button"
                        onClick={() => toggleEmotion(item as Emotion)}
                        className={classNames(
                            "mood-badge  font-medium transition text-slate-600 cursor-pointer",
                            size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                            selected ? getEmotionColor(item as Emotion) : "bg-slate-100 hover:bg-slate-200"
                        )}
                        disabled={disabled}
                    >
                        <EmotionIcon emotion={item as Emotion} size={16} />
                        <span className="capitalize">{item}</span>
                    </button>
                );
            })}
        </div>
    );
};
