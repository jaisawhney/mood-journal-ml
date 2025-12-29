import { useCallback, useState } from "react";
import { emotionModel } from "../services/model";
import type { PlutchikResult } from "../types/types";

export type UseEmotionModel = {
    predict: (texts: string) => Promise<PlutchikResult>;
    loading: boolean;
    error: string | null;
};

export function useEmotionModel(): UseEmotionModel {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const predict = useCallback(async (text: string): Promise<PlutchikResult> => {
        if (!text.length) return {} as PlutchikResult;
        setLoading(true);
        setError(null);
        try {
            const result = await emotionModel.predictEmotions(text);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred while predicting emotions.");
            return {} as PlutchikResult;
        } finally {
            setLoading(false);
        }
    }, []);
    return { predict, loading, error };
}

export default useEmotionModel;
