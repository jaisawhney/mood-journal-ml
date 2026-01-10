import { useCallback, useState } from "react";
import { emotionModel } from "../services/model";
import type { RawEmotionResult } from "../types/types";

export type UseEmotionModel = {
    predict: (texts: string) => Promise<RawEmotionResult | null>;
    loading: boolean;
    error: string | null;
};

export function useEmotionModel(): UseEmotionModel {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const predict = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed.length) return null;
        setLoading(true);
        setError(null);
        try {
            const result = await emotionModel.predictEmotions(trimmed);
            return result as RawEmotionResult;
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while predicting emotions.");
            return null;
        } finally {
            setLoading(false);
        }
    }, []);
    return { predict, loading, error };
}

export default useEmotionModel;
