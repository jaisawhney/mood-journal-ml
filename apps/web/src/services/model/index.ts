import { AutoModel, AutoTokenizer, env, PreTrainedModel, PreTrainedTokenizer } from "@huggingface/transformers";
import type { RawEmotionResult } from "../../types/types";

env.allowLocalModels = true;
env.allowRemoteModels = false;

const MODEL_PATH = "/api/models/emotion-model/v1/";

const INTENSITY_MIN = 0.06;
const POWER_LAW_EXPONENT = 0.5;
// Mean intensity for "neutral" from calibration data.
const NEUTRAL_MEAN = 0.007551793474704027;
// Per-label delta thresholds (90th percentile from calibration)
const CALIBRATION: Record<string, { mean: number; temp: number; threshold: number }> = {
    "afraid": { mean: -3.691885471343994, temp: 1.0532969236373901, threshold: 0.07633624991919026 },
    "angry": { mean: -3.665382146835327, temp: 0.9235321283340454, threshold: 0.06339110244701052 },
    "anxious": { mean: -2.1902005672454834, temp: 0.7559643983840942, threshold: 0.15050492496616807 },
    "ashamed": { mean: -4.43959379196167, temp: 1.036054015159607, threshold: 0.035666489658277366 },
    "awkward": { mean: -2.9342219829559326, temp: 0.8307028412818909, threshold: 0.0908899012729403 },
    "bored": { mean: -2.4199697971343994, temp: 0.8839078545570374, threshold: 0.15080451914213616 },
    "calm": { mean: -1.0835328102111816, temp: 0.5570068359375, threshold: 0.17862042162577746 },
    "confused": { mean: -3.346439838409424, temp: 0.9046381115913391, threshold: 0.0805473813290389 },
    "disgusted": { mean: -3.441535472869873, temp: 1.0742900371551514, threshold: 0.0966817396102013 },
    "excited": { mean: -1.7836912870407104, temp: 0.6690975427627563, threshold: 0.15832096927858127 },
    "frustrated": { mean: -2.5854134559631348, temp: 0.7206068634986877, threshold: 0.1033265571801349 },
    "happy": { mean: -1.2367888689041138, temp: 0.34626808762550354, threshold: 0.09843868574097539 },
    "jealous": { mean: -3.7995195388793945, temp: 0.8962735533714294, threshold: 0.05121687340507096 },
    "nostalgic": { mean: -3.0325772762298584, temp: 1.0649932622909546, threshold: 0.12850673306235602 },
    "proud": { mean: -1.7475333213806152, temp: 0.5399618744850159, threshold: 0.12147209392588351 },
    "sad": { mean: -3.414936065673828, temp: 0.9402872323989868, threshold: 0.07866983299009309 },
    "satisfied": { mean: -1.368050217628479, temp: 0.3921879231929779, threshold: 0.10646932727291461 },
    "surprised": { mean: -3.2053911685943604, temp: 0.9091963171958923, threshold: 0.09189830002454225 }
};

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

        // prevent race condition on multiple simultaneous calls by caching the promise
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

    private sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-x));
    }

    private computeDeltas(logits: Record<string, number>): Record<string, number> {
        const deltas: Record<string, number> = {};
        for (const label of Object.keys(logits)) {
            const { mean, temp } = CALIBRATION[label];
            //const temperature = Math.max(temp, 1.0);
            const delta = this.sigmoid(logits[label] / temp) - this.sigmoid(mean / temp);
            const threshold = CALIBRATION[label].threshold;
            deltas[label] = delta < threshold ? 0 : delta;
        }
        return deltas;
    }

    private calculateDominance(deltas: Record<string, number>): number {
        const values = Object.values(deltas).filter(v => v > 0);
        if (values.length < 3) return 0;

        const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
        const squaredDiffs = values.map(val => (val - mean) ** 2);
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
        return Math.sqrt(variance);
    }

    private segmentSentences(text: string): string[] {
        // Use Intl.Segmenter to split text into sentences
        const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
        const sentences = Array.from(segmenter.segment(text), s => s.segment.trim())
            .filter(s => s.length > 0);
        // Recombine sentences to create overlapping chunks
        return sentences.map((s, i) => i === 0 ? s : `${sentences[i - 1]} ${s}`)
    }

    async predictEmotions(text: string): Promise<RawEmotionResult> {
        if (text.trim().length < 20) {
            throw new Error("Text too short");
        }

        const sentences = this.segmentSentences(text);
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
        const labels = Object.keys(CALIBRATION);

        // Power law weighting
        const alpha = POWER_LAW_EXPONENT;
        const rawWeights = intensityData.map(i => Math.max(i, 0) ** alpha);
        const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
        const weights = sumWeights === 0 ? Array(numChunks).fill(1 / numChunks) : rawWeights.map(w => w / sumWeights);

        // Aggregate logits and intensity across chunks
        const aggregatedLogits: Record<string, number> = {};
        for (const label of labels) {
            aggregatedLogits[label] = 0;
        }

        const intensities: number[] = [];
        for (let chunk = 0; chunk < numChunks; chunk++) {
            const weight = weights[chunk];
            const intensity = intensityData[chunk];
            intensities.push(intensity);

            for (let label = 0; label < numLabels; label++) {
                const key = labels[label];
                const logit = emotionData[chunk * numLabels + label];

                aggregatedLogits[key] += logit * weight;
            }
        }

        let aggregatedIntensity = 0;
        if (intensities.length > 0) {
            intensities.sort((a, b) => b - a);
            const k = Math.ceil(intensities.length / 3); // top third
            const topIntensities = intensities.slice(0, k);
            aggregatedIntensity = topIntensities.reduce((a, b) => a + b, 0) / k;
        }

        aggregatedIntensity -= NEUTRAL_MEAN;
        if (aggregatedIntensity < INTENSITY_MIN) {
            return {
                logits: aggregatedLogits,
                deltas: {},
                intensity: 0,
                dominance: 0,
            };
        }

        const emotionDeltas = this.computeDeltas(aggregatedLogits);
        return {
            logits: aggregatedLogits,
            deltas: emotionDeltas,
            intensity: aggregatedIntensity,
            dominance: this.calculateDominance(emotionDeltas),
        };
    }
}

export const emotionModel = EmotionModel.getInstance();