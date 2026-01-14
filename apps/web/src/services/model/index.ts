import { AutoModel, AutoTokenizer, env, PreTrainedModel, PreTrainedTokenizer } from "@huggingface/transformers";
import type { RawEmotionResult } from "../../types/types";

env.allowLocalModels = true;
env.allowRemoteModels = false;

const MODEL_PATH = "/api/models/emotion-model/v1/";

// TODO: use the api to fetch these calibration values from the server rather than hardcoding them here.
const INTENSITY_Z_THRESHOLD = -1.0;
const POWER_LAW_EXPONENT = 0.5;
const CALIBRATION: Record<string, { baselineMean: number; baselineStd: number }> = {
    "afraid": { baselineMean: -4.427581787109375, baselineStd: 0.9185531139373779 },
    "angry": { baselineMean: -4.379964828491211, baselineStd: 1.0219967365264893 },
    "anxious": { baselineMean: -3.3611323833465576, baselineStd: 1.6113032102584839 },
    "ashamed": { baselineMean: -4.651586055755615, baselineStd: 0.9642913937568665 },
    "awkward": { baselineMean: -4.7136359214782715, baselineStd: 0.6779931783676147 },
    "bored": { baselineMean: -3.6243367195129395, baselineStd: 1.0546729564666748 },
    "calm": { baselineMean: -2.0187253952026367, baselineStd: 2.2617547512054443 },
    "confused": { baselineMean: -4.201181411743164, baselineStd: 0.9600289463996887 },
    "disgusted": { baselineMean: -4.071943283081055, baselineStd: 0.8512939810752869 },
    "excited": { baselineMean: -2.5107264518737793, baselineStd: 2.0375304222106934 },
    "frustrated": { baselineMean: -3.1075217723846436, baselineStd: 1.4422619342803955 },
    "happy": { baselineMean: -1.6686750650405884, baselineStd: 2.9580588340759277 },
    "jealous": { baselineMean: -5.041198253631592, baselineStd: 0.9032095670700073 },
    "nostalgic": { baselineMean: -3.5064048767089844, baselineStd: 1.4130178689956665 },
    "proud": { baselineMean: -2.410893678665161, baselineStd: 2.1613380908966064 },
    "sad": { baselineMean: -3.962003231048584, baselineStd: 1.0943050384521484 },
    "satisfied": { baselineMean: -1.7641806602478027, baselineStd: 2.6827046871185303 },
    "surprised": { baselineMean: -3.4721477031707764, baselineStd: 1.2126439809799194 }
};

const CALIBRATION_INTENSITY = {
    baselineMean: 0.37242668867111206,
    baselineStd: 0.2673429250717163
};

function segmentSentences(text: string): string[] {
    // Use Intl.Segmenter to split text into sentences
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    const sentences = Array.from(segmenter.segment(text), s => s.segment.trim())
        .filter(s => s.length > 0);
    // Recombine sentences to create overlapping chunks
    return sentences.map((s, i) => i === 0 ? s : `${sentences[i - 1]} ${s}`)
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

    private computeZScore(value: number, baselineMean: number, baselineStd: number): number {
        return (value - baselineMean) / baselineStd;
    }

    async predictEmotions(text: string): Promise<RawEmotionResult> {
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
        const emotionData = outputs.logits_emotion.data as Float32Array;
        const intensityData = outputs.logits_intensity.data as Float32Array;

        const numChunks = outputs.logits_emotion.dims[0];
        const numLabels = outputs.logits_emotion.dims[1];

        type EmotionModel = PreTrainedModel & {
            config: PreTrainedModel["config"] & {
                id2label: Record<string, string>;
            };
        };

        const { id2label } = (model as EmotionModel).config;
        // Less brittle than assuming ordering from model.config.label2id
        const indexToLabel = Object.entries(id2label)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, v]) => v);

        // Power law weighting
        const alpha = POWER_LAW_EXPONENT;
        const rawWeights = intensityData.map(intensityValue => Math.max(intensityValue, 0) ** alpha);
        const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
        const weights = sumWeights === 0 ? Array(numChunks).fill(1 / numChunks) : rawWeights.map(w => w / sumWeights);

        // Aggregate logits and intensity across chunks
        const aggregatedZScores: Record<string, number> = {};
        const aggregatedLogits: Record<string, number> = {};
        for (const label of indexToLabel) {
            aggregatedZScores[label] = 0;
            aggregatedLogits[label] = 0;
        }

        const intensities: number[] = [];
        for (let chunk = 0; chunk < numChunks; chunk++) {
            const weight = weights[chunk];
            const intensity = intensityData[chunk];
            intensities.push(intensity);
            for (let label = 0; label < numLabels; label++) {
                const key = indexToLabel[label];
                const logit = emotionData[chunk * numLabels + label];
                const { baselineMean, baselineStd } = CALIBRATION[key];
                const z = this.computeZScore(logit, baselineMean, baselineStd)
                aggregatedZScores[key] += z * weight;
                aggregatedLogits[key] += logit;
            }
        }

        for (const label of indexToLabel) {
            aggregatedLogits[label] /= numChunks;
        }

        let aggregatedIntensity = 0;
        if (intensities.length > 0) {
            aggregatedIntensity = intensities.reduce((sum, val, i) => sum + val * weights[i], 0);
        }

        const intensityZScore = this.computeZScore(
            aggregatedIntensity,
            CALIBRATION_INTENSITY.baselineMean,
            CALIBRATION_INTENSITY.baselineStd
        );

        if (intensityZScore < INTENSITY_Z_THRESHOLD) {
            return {
                emotions: {},
                intensity: 0,
            };
        }

        return {
            emotions: aggregatedZScores,
            intensity: intensityZScore,
        };
    }
}

export const emotionModel = EmotionModel.getInstance();