import { AutoModel, AutoTokenizer, env, PreTrainedModel, PreTrainedTokenizer } from "@huggingface/transformers";
import type { RawEmotionResult } from "../../types/types";

env.allowLocalModels = true;
env.allowRemoteModels = false;

const MODEL_PATH = "/api/models/emotion-model/v1/";

// TODO: use the api to fetch these calibration values from the server rather than hardcoding them here.
function segmentSentences(text: string): string[] {
    // Use Intl.Segmenter to split text into sentences
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    const sentences = Array.from(segmenter.segment(text), s => s.segment.trim())
        .filter(s => s.length > 0);
    // Recombine sentences to create overlapping chunks
    return sentences.map((s, i) => i === 0 ? s : `${sentences[i - 1]} ${s}`)
}

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

class EmotionModel {
    private static instance: EmotionModel;
    private model?: PreTrainedModel;
    private modelPromise?: Promise<PreTrainedModel>;
    private tokenizer?: PreTrainedTokenizer;
    private tokenizerPromise?: Promise<PreTrainedTokenizer>;

    private constructor() { }

    public static getInstance(): EmotionModel {
        if (!EmotionModel.instance) {
            EmotionModel.instance = new EmotionModel();
        }
        return EmotionModel.instance;
    }

    private async getModel(): Promise<PreTrainedModel> {
        if (this.model) return this.model;

        // Prevent race condition on multiple simultaneous calls by caching the promise
        this.modelPromise ??= AutoModel.from_pretrained(MODEL_PATH).then((model) => {
            this.model = model;
            return this.model;
        }).catch((error) => {
            this.modelPromise = undefined;
            throw error;
        });
        return this.modelPromise;
    }

    private async getTokenizer(): Promise<PreTrainedTokenizer> {
        if (this.tokenizer) return this.tokenizer;

        // Prevent race condition on multiple simultaneous calls by caching the promise
        this.tokenizerPromise ??= AutoTokenizer.from_pretrained(MODEL_PATH).then((tokenizer) => {
            this.tokenizer = tokenizer;
            return this.tokenizer;
        }).catch((error) => {
            this.tokenizerPromise = undefined;
            throw error;
        });
        return this.tokenizerPromise;
    }

    /** Predict emotions from input text
     * @param text input text
     * @returns RawEmotionResult with emotions
     */
    public async predictEmotions(text: string): Promise<RawEmotionResult> {
        if (text.trim().length < 20) {
            throw new Error("Text must be at least 20 characters long");
        }

        const sentences = segmentSentences(text);
        const tokenizer = await this.getTokenizer();
        const model = await this.getModel();

        const inputs = await tokenizer([sentences], {
            padding: true,
            truncation: true,
        });

        const outputs = await model(inputs);
        const emotionData = outputs.logits_emotion.data as Float32Array;

        const numChunks = outputs.logits_emotion.dims[0];
        const numLabels = outputs.logits_emotion.dims[1];

        type EmotionModel = PreTrainedModel & {
            config: PreTrainedModel["config"] & {
                id2label: Record<string, string>;
            };
        };

        const { id2label } = (model as EmotionModel).config;
        const indexToLabel = Object.entries(id2label)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, v]) => v);

        const weights = Array(numChunks).fill(1 / numChunks);
        // Aggregate logits across chunks
        const aggregatedLogits = Array(numLabels).fill(0);
        for (let chunk = 0; chunk < numChunks; chunk++) {
            const weight = weights[chunk];

            for (let label = 0; label < numLabels; label++) {
                const logit = emotionData[chunk * numLabels + label];
                aggregatedLogits[label] += logit * weight;
            }
        }

        const emotions: Record<string, number> = {};
        for (let label = 0; label < numLabels; label++) {
            emotions[indexToLabel[label]] = sigmoid(aggregatedLogits[label]);
        }
        return {
            emotions,
        };
    }

    /** Warm up the model by loading it into memory
     * @returns Promise that resolves when warmup is complete
     */
    public async warmup(): Promise<void> {
        try {
            await Promise.all([this.getTokenizer(), this.getModel()]);
        } catch (error) {
            if (this.modelPromise) this.model = undefined;
            if (this.tokenizerPromise) this.tokenizer = undefined;
            throw error;
        }
    }
}

export const emotionModel = EmotionModel.getInstance();