
import React from "react";
import classNames from "classnames";
import { EMOTION_ICONS } from "../../constants/emotionMaps";
import { Meh } from "lucide-react";
import type { Emotion } from "../../types/types";

type Props = {
    emotion: Emotion | null;
    className?: string;
    size?: number;
};

function EmotionIcon({ emotion, className, size = 24 }: Props) {
    const Icon = emotion ? EMOTION_ICONS(emotion) : Meh;
    return <Icon size={size} className={classNames("inline-block", className)} />;
}
export default React.memo(EmotionIcon);