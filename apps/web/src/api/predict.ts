import client from './client'

export interface Prediction {
    predicted: string
    confidence: number
    scores: Record<string, number>
}

export interface PredictResponse {
    predictions: Prediction[]
}

export const predictEmotion = async (text: string, localSyncId: number): Promise<Prediction> => {
    const url = `/api/predict?_localSyncId=${localSyncId}`
    const response = await client.post<PredictResponse>(url, {
        texts: [text],
    })
    return response.data.predictions[0]
}
