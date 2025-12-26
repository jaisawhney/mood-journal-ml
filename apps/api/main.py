from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ml.inference.classifier import EmotionClassifier

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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionRequest(BaseModel):
    texts: List[str]


class Prediction(BaseModel):
    primary: str
    wheel: dict[str, float]


class PredictionResponse(BaseModel):
    predictions: List[Prediction]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        results = classifier.predict(request.texts)
        predictions = [
            Prediction(
                primary=res["primary"],
                wheel=res["wheel"],
            )
            for res in results
        ]
        return PredictionResponse(predictions=predictions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


@app.get("/api/labels")
async def get_labels():
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {"labels": classifier.labels}
