from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from ml.inference.emotion_classifier import EmotionClassifier

classifier: EmotionClassifier | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global classifier
    try:
        classifier = EmotionClassifier()
        yield
    finally:
        classifier = None


app = FastAPI(
    title="Emotion Classification API",
    description="API for classifying emotions in text using a pre-trained model.",
    version="1.0.0",
    lifespan=lifespan,
)


class PredictionRequest(BaseModel):
    texts: List[str]


class Prediction(BaseModel):
    predicted: str
    confidence: float
    scores: dict[str, float]


class PredictionResponse(BaseModel):
    predictions: List[Prediction]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        results = classifier.predict(request.texts)
        predictions = [
            Prediction(
                predicted=res["predicted"],
                confidence=res["confidence"],
                scores=res["scores"],
            )
            for res in results
        ]
        return PredictionResponse(predictions=predictions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.get("/labels")
async def get_labels():
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"labels": classifier.labels}
