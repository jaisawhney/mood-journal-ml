import { AutoModel, AutoTokenizer, env, PreTrainedModel, PreTrainedTokenizer } from "@huggingface/transformers";
import type { Calibration, RawEmotionResult } from "../../types/types";

env.allowLocalModels = true;
env.allowRemoteModels = false;

const API_PATH = "/api/models/journaling_model/v1/";
const TAU = 1.0;

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

function logSumExp(values: number[]): number {
    const max = Math.max(...values);

    let sum = 0;
    for (const value of values) {
        sum += Math.exp(value - max);
    }

    return max + Math.log(sum);
}

function lsePool(
    logits: Float32Array,
    numChunks: number,
    numLabels: number,
    tau: number,
): number[] {
    const pooled = new Array<number>(numLabels);

    for (let label = 0; label < numLabels; label++) {
        const values = new Array<number>(numChunks);

        for (let chunk = 0; chunk < numChunks; chunk++) {
            values[chunk] = tau * logits[chunk * numLabels + label];
        }

        pooled[label] =
            (logSumExp(values) - Math.log(numChunks)) / tau;
    }

    return pooled;
}

class EmotionModel {
    private static instance: EmotionModel;
    private model?: PreTrainedModel;
    private modelPromise?: Promise<PreTrainedModel>;
    private tokenizer?: PreTrainedTokenizer;
    private tokenizerPromise?: Promise<PreTrainedTokenizer>;
    private temperatures?: Calibration;
    private temperaturesPromise?: Promise<Calibration>;
    private thresholds?: Calibration;
    private thresholdsPromise?: Promise<Calibration>;

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
        this.modelPromise ??= AutoModel.from_pretrained(API_PATH).then((model) => {
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
        this.tokenizerPromise ??= AutoTokenizer.from_pretrained(API_PATH).then((tokenizer) => {
            this.tokenizer = tokenizer;
            return this.tokenizer;
        }).catch((error) => {
            this.tokenizerPromise = undefined;
            throw error;
        });
        return this.tokenizerPromise;
    }

    private async getTemperatures(): Promise<Calibration> {
        if (this.temperatures) return this.temperatures;

        this.temperaturesPromise ??= fetch(API_PATH + "temperatures.json")
            .then(async r => {
                if (!r.ok) {
                    throw new Error("Failed to load temperatures");
                }

                const data = await r.json();
                this.temperatures = data;
                return data;
            })
            .catch(err => {
                this.temperaturesPromise = undefined;
                throw err;
            });

        return this.temperaturesPromise;
    }

    private async getThresholds(): Promise<Calibration> {
        if (this.thresholds) return this.thresholds;

        this.thresholdsPromise ??= fetch(API_PATH + "thresholds.json")
            .then(async r => {
                if (!r.ok) {
                    throw new Error("Failed to load thresholds");
                }

                const data = await r.json();
                this.thresholds = data;
                return data;
            })
            .catch(err => {
                this.thresholdsPromise = undefined;
                throw err;
            });

        return this.thresholdsPromise;
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
        const inputs = await tokenizer(sentences, {
            padding: true,
            truncation: true,
        });


        const outputs = await model(inputs);
        const emotionData = outputs.logits.data as Float32Array;
        const numChunks = outputs.logits.dims[0];
        const numLabels = outputs.logits.dims[1];

        // Aggregate logits across chunks
        const pooledLogits = lsePool(
            emotionData,
            numChunks,
            numLabels,
            TAU,
        );

        const probabilities: Record<string, number> = {};
        const predictions: Record<string, boolean> = {};

        const temperatures = await this.getTemperatures();
        const thresholds = await this.getThresholds();

        const labels = Object.keys(temperatures);

        for (let i = 0; i < numLabels; i++) {
            const label = labels[i];

            const probability = sigmoid(
                pooledLogits[i] / temperatures[label]
            );

            probabilities[label] = probability;
            predictions[label] = probability >= thresholds[label];
        }
        return {
            probabilities,
            predictions
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