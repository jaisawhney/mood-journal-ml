import torch

from pathlib import Path
from typing import Any, Dict, List
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ml.config import load_config


class EmotionClassifier:
    """
    Emotion classification model for predicting emotions in text.
    Loads a pre-trained model and tokenizer from the specified output directory.
    """

    def __init__(self, device: str = None):
        self.cfg = load_config()
        model_dir = Path(self.cfg["paths"]["output_dir"])

        if not model_dir.exists():
            raise FileNotFoundError(f"Model directory not found: {model_dir}.")

        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_dir)
        self.model.to(self.device)
        self.model.eval()

        id2label = self.model.config.id2label
        if not id2label:
            raise ValueError("Model config is missing id2label")

        self.labels: List[str] = [label for _, label in sorted(id2label.items())]

    @torch.no_grad()
    def predict(self, texts: List[str]) -> List[Dict[str, Any]]:
        if not texts:
            return []
        encoded = self.tokenizer(
            texts,
            truncation=True,
            max_length=self.cfg["model"]["max_length"],
            padding=True,
            return_tensors="pt",
        )
        encoded = {k: v.to(self.device) for k, v in encoded.items()}
        outputs = self.model(**encoded)
        probs = torch.softmax(outputs.logits, dim=-1).cpu()

        predictions = []
        for row in probs:
            pred_id = row.argmax(dim=-1).item()
            predicted_label = self.labels[pred_id]
            confidence = row[pred_id].item()
            label_scores = list(zip(self.labels, row.tolist()))
            predictions.append(
                {
                    "predicted": predicted_label,
                    "confidence": confidence,
                    "scores": {label: float(score) for label, score in label_scores},
                }
            )
        return predictions


__all__ = ["EmotionClassifier"]
