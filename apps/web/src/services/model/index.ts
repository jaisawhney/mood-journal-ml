import { aggregatePlutchik } from "./aggregatePlutchik";
import type { PlutchikResult } from "../../types/types";
import { AutoTokenizer, env, pipeline, PreTrainedTokenizer, TextClassificationPipeline, type TextClassificationSingle } from "@huggingface/transformers";
import type { FINE_TO_PARENT } from "./plutchikMap";

type FineEmotion = keyof typeof FINE_TO_PARENT;

env.allowLocalModels = true;
env.allowRemoteModels = false;

const EFFECTIVE_MAX_LEN = 128;
const MODEL_PATH = "/api/models/emotion-model/v1/";
const STRIDE_RATIO = 0.25;

const OVERLAP = Math.floor(EFFECTIVE_MAX_LEN * STRIDE_RATIO);
const STEP = EFFECTIVE_MAX_LEN - OVERLAP;

class EmotionModel {
    private static instance: EmotionModel;
    private model?: TextClassificationPipeline;
    private modelPromise?: Promise<TextClassificationPipeline>;
    private tokenizer?: PreTrainedTokenizer;
    private tokenizerPromise?: Promise<PreTrainedTokenizer>;

    private constructor() { }

    public static getInstance(): EmotionModel {
        if (!EmotionModel.instance) {
            EmotionModel.instance = new EmotionModel();
        }
        return EmotionModel.instance;
    }

    private async getModel(): Promise<TextClassificationPipeline> {
        if (this.model) return this.model;

        // prevent race condition on multiple simultaneous calls by caching the promise
        this.modelPromise ??= pipeline("text-classification", MODEL_PATH).then((model) => {
            this.model = model as TextClassificationPipeline;
            return this.model;
        }).catch((error) => {
            this.modelPromise = undefined;
            throw error;
        });
        return this.modelPromise;
    }

    private async getTokenizer(): Promise<PreTrainedTokenizer> {
        if (this.tokenizer) return this.tokenizer;

        // prevent race condition on multiple simultaneous calls by caching the promise
        this.tokenizerPromise ??= AutoTokenizer.from_pretrained(MODEL_PATH).then((tokenizer) => {
            this.tokenizer = tokenizer;
            return this.tokenizer;
        }).catch((error) => {
            this.tokenizerPromise = undefined;
            throw error;
        });
        return this.tokenizerPromise;
    }

    // this is the best way I could figure to chunk text while respecting tokenization. the transformer.js library doesn't expose a direct way to do this unlike the python version
    private async chunkifyText(text: string) {
        const tokenizer = await this.getTokenizer();
        const tokens = await tokenizer(text, {
            add_special_tokens: false,
            truncation: false,
        });

        const inputIds = tokens.input_ids.tolist();
        const chunks: string[] = [];

        // handle case where tokenization produces no results
        if (!Array.isArray(inputIds) || inputIds.length === 0) return chunks;

        const ids = inputIds[0];
        for (let i = 0; i < ids.length; i += STEP) {
            const slice = ids.slice(i, i + EFFECTIVE_MAX_LEN);
            if (slice.length === 0) break;
            // the pipeline expects strings, so decode back to text :(
            chunks.push(tokenizer.decode(slice));
        }
        return chunks;
    }

    async predictEmotions(text: string): Promise<PlutchikResult> {
        if (!text.trim().length) return aggregatePlutchik({});
        const model = await this.getModel();
        const chunks = await this.chunkifyText(text);
        // @ts-expect-error - Library types incorrectly exclude null, but it works per the docs
        const outputs = await model(chunks, { top_k: null }) as TextClassificationSingle[][];
        const scores: Record<FineEmotion, number> = {};
        for (const chunkResult of outputs) {
            for (const item of chunkResult) {
                scores[item.label as FineEmotion] = (scores[item.label as FineEmotion] ?? 0) + item.score;
            }
        }

        // gotta average the scores across chunks
        const numChunks = chunks.length;
        for (const key in scores) {
            scores[key as FineEmotion] /= numChunks;
        }
        return aggregatePlutchik(scores);
    }
}

export const emotionModel = EmotionModel.getInstance();