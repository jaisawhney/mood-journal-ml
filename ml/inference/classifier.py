import torch

from pathlib import Path
from typing import Any, Dict, List
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ml.config import load_config

PLUTCHIK_MAP = {
    "joy": {
        "joyful",
        "excited",
        "content",
        "confident",
        "grateful",
        "proud",
        "impressed",
    },
    "sadness": {
        "sad",
        "devastated",
        "disappointed",
        "lonely",
        "nostalgic",
        "sentimental",
    },
    "anger": {
        "angry",
        "furious",
        "annoyed",
        "jealous",
        "guilty",
    },
    "fear": {
        "afraid",
        "anxious",
        "apprehensive",
        "terrified",
    },
    "trust": {
        "trusting",
        "faithful",
        "caring",
    },
    "disgust": {
        "disgusted",
        "ashamed",
        "embarrassed",
    },
    "surprise": {
        "surprised",
    },
    "anticipation": {
        "anticipating",
        "hopeful",
        "prepared",
    },
}

FINE_TO_PARENT = {fine: parent for parent, fines in PLUTCHIK_MAP.items() for fine in fines}


def aggregate_plutchik(probs: dict):
    # Group fine-grained emotion probabilities into Plutchik's primary emotions
    parent_scores = {p: 0.0 for p in PLUTCHIK_MAP}

    # Sum probabilities for each parent emotion
    for label, prob in probs.items():
        parent = FINE_TO_PARENT.get(label)
        if parent:
            parent_scores[parent] += prob

    # Determine the primary emotion
    primary = max(parent_scores, key=parent_scores.get)
    return primary, parent_scores


class EmotionClassifier:
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

        # Tokenize input texts
        encoded = self.tokenizer(
            texts,
            truncation=True,
            max_length=self.cfg["model"]["max_length"],
            padding=True,
            return_tensors="pt",
        ).to(self.device)

        # Get model outputs and compute probabilities
        outputs = self.model(**encoded)
        probs = torch.softmax(outputs.logits, dim=-1).cpu()
        results = []
        for row in probs:
            scores = dict(zip(self.labels, row.tolist()))

            primary, wheel = aggregate_plutchik(scores)
            results.append(
                {
                    "primary": primary,
                    "wheel": wheel,
                }
            )
        return results


__all__ = ["EmotionClassifier"]
