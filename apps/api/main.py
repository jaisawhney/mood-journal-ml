from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parents[2]
MODELS_DIR = BASE_DIR / "artifacts" / "models"
WEB_DIST_DIR = BASE_DIR / "apps" / "web" / "dist"


app = FastAPI(
    title="Emotion Classification Server",
    description="Static server for the web app and model artifacts.",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.mount(
    "/api/models",
    StaticFiles(directory=MODELS_DIR, html=False),
    name="models",
)

# Serve the built web app (Vite dist)
app.mount(
    "/",
    StaticFiles(directory=WEB_DIST_DIR, html=True),
    name="web",
)


# serve index.html for unknown routes
@app.get("/{full_path:path}")
def spa_fallback():
    index_file = WEB_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"detail": "Not Found"}, 404


#
# No longer needed: prediction endpoints. The client performs inference directly.
#

# class PredictionRequest(BaseModel):
#    texts: List[str]


# class Prediction(BaseModel):
#    primary_emotion: str
#    plutchik_probabilities: dict[str, float]


# class PredictionResponse(BaseModel):
#    predictions: List[Prediction]

# @app.post("/api/predict", response_model=PredictionResponse)
# async def predict(request: PredictionRequest):
#    if classifier is None:
#        raise HTTPException(status_code=503, detail="Model not loaded")
#    try:
#        results = classifier.predict(request.texts)
#        print(results[0])
#        predictions = [
#            Prediction(
#                primary_emotion=res["primary_emotion"],
#                plutchik_probabilities=res["plutchik_probabilities"],
#            )
#            for res in results
#        ]
#        return PredictionResponse(predictions=predictions)
#    except Exception as e:
#        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")


# @app.get("/api/labels")
# async def get_labels():
#    if classifier is None:
#        raise HTTPException(status_code=503, detail="Model not loaded")
#    return {"labels": classifier.labels}
