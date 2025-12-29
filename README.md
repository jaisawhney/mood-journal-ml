# Mood Journal

A full-stack emotion classification Progressive Web App (PWA) consisting of a REST API back-end and a ReactJS front-end for mood journaling and analysis. Uses fine-tuned transformer models (DistilBERT, MiniLM) for emotion detection from user-inputted text.

## Overview

- Emotion classification API: FastAPI inference for real-time predictions
- Progressive Web App: Offline-capable frontend for mood journaling
- Model fine-tuning based on the `empathetic-dialogues` dataset
- Full training, evaluation, and benchmarking workflow

## Project Structure

```
├── apps/
│   ├── api/            # FastAPI backend for emotion classification
│   └── web/            # Web app frontend
├── ml/
│   ├── training/       # Model training scripts
│   ├── inference/      # Inference wrapper
│   ├── evaluation/     # Analysis and metrics
│   ├── configs/        # YAML configs
├── notebooks/          # Jupyter notebooks
├── tests/              # Pytest
└── pyproject.toml      # Python project configuration
```

## Quick Start

### Prerequisites
- Python 3.10+
- Set `MODEL_CONFIG` environment variable (e.g., `distilbert.yaml`)

### Installation

```bash
pip install -e ".[api,ml]"
```

### Train the Model

```bash
export MODEL_CONFIG=distilbert.yaml
python -m ml.training.train
```
The above will:
- Download the `dair-ai/emotion` dataset
- Fine-tune the model specified in the config
- Save the trained model to `ml/artifacts/` directory

### Run the API

```bash
uvicorn apps.api.main:app --reload
```

The API will be available at `http://localhost:8000` with docs at `/docs`.

### API Usage

Make a prediction:
```bash
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["I am feeling wonderful!"]}'
```

## Development

Run tests:
```bash
pytest
```

## References

Dataset: `empathetic-dialogues` (Rashkin et al., ACL 2019).