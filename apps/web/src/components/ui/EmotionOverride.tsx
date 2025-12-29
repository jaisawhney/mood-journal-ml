import React from "react";
import classNames from "classnames";
import { EMOTIONS, EMOTION_COLORS } from "../../constants/emotionMaps";
import { EmotionIcon } from "../ui/EmotionIcon";
import type { Emotion } from "../../types/types";

interface EmotionOverrideProps {
    value: Emotion;
    onChange: (emotion: Emotion) => void;
    disabled?: boolean;
    size?: "sm" | "md";
}

export const EmotionOverride: React.FC<EmotionOverrideProps> = ({ value, onChange, disabled, size = "md" }) => {
    return (
        <div className="flex flex-wrap gap-3">
            {EMOTIONS.map((item) => {
                const selected = value === item;
                return (
                    <button
                        key={item}
                        type="button"
                        onClick={() => onChange(item)}
                        className={classNames(
                            "mood-badge  font-medium transition text-slate-600 cursor-pointer",
                            size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                            selected ? EMOTION_COLORS[item] : "bg-slate-100 hover:bg-slate-200"
                        )}
                        disabled={disabled}
                    >
                        <EmotionIcon emotion={item} size={16} />
                        <span className="capitalize">{item}</span>
                    </button>
                );
            })}
        </div>
    );
};
