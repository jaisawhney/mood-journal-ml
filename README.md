# Mood Journal

Offline-first Progressive Web App (PWA) for multi-label emotion classification and journaling. All inference runs client-side in-browser using a fine-tuned transformer (MiniLM, etc). FastAPI backend serves static assets and model files.

## Key Features
- Offline-first PWA
	- All inference and journaling run fully client-side via a service worker and Transformer.js
	- Emotion analysis is performed locally in the browser so no user data or journal entries ever leave the device
- Service worker powered by Workbox
	- Pre-caches all model files and ONNX files for in-browser offline ML inference
	- After first load, all features (including ML) work fully offline (offline-first caching strategy)
- Multi-label emotion classification
	- Two-stage fine-tuning: GoEmotions (general emotions), Lemotif (journal style)

## Tech Stack

**Backend/ML:** Python, FastAPI, PyTorch, Transformers, ONNX

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Workbox

## Project Structure

```
├── apps/
│   ├── api/            # FastAPI backend for emotion classification
│   └── web/            # Web app frontend
├── ml/
│   ├── training/       # Model training scripts
│   ├── inference/      # Inference wrapper
│   ├── evaluation/     # Analysis and metrics
│   ├── calibration/    # Calibration scripts
│   ├── datasets/       # Datasets
│   ├── export/         # ONNX export
│   ├── utils/          # Helpers
│   ├── configs/        # YAML configs
├── docker/             # Dockerfile(s) and deployment helpers
├── notebooks/          # Jupyter notebooks
├── tests/              # Pytest
└── pyproject.toml      # Python project configuration
```

## Datasets
- GoEmotions (Demszky et al., ACL 2020): First-stage fine-tuning
- Lemotif (Li & Parikh, arXiv 2019): Main dataset, augmented with synthetic entries for rare emotions, intensity, and neutral baseline

## Notebooks
- `01_dataset_exploration.ipynb`: EDA
- `02_model_comparison_emotion.ipynb`: Model comparison
- `03_data_augmentation_analysis.ipynb`: Augmentation

## Installation & Usage

### Prerequisites
- Python 3.10+
- Node.js 18+ (for frontend dev)

### Install Python dependencies
```bash
pip install -e ".[api,ml,dev]"
```

### Train the model
```bash
export MODEL_CONFIG=distilbert.yaml
python -m ml.training.train
```

### Run the backend API
```bash
uvicorn apps.api.main:app --reload
```
API docs: http://localhost:8000/docs

### Frontend (development)
```bash
cd apps/web
npm install
npm run dev
```

## Testing
```bash
pytest
```

## References

- Dataset: `lemotif` (Li & Parikh, arXiv 2019)
- Dataset: `goemotions` (Demszky et al., ACL 2020)