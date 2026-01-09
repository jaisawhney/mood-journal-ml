import torch

from pathlib import Path
from typing import List
from transformers import AutoConfig, AutoTokenizer

from ml.training.trainer import EmotionModel
from ml.utils.config import load_config


class EmotionClassifier:
    def __init__(self, device: str = None):
        self.cfg = load_config()
        model_dir = Path(self.cfg["paths"]["artifacts_dir"] + "/final_model")

        if not model_dir.exists():
            raise FileNotFoundError(f"Model directory not found: {model_dir}.")

        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        # Load model and tokenizer
        config = AutoConfig.from_pretrained(model_dir)
        model = EmotionModel.from_pretrained(model_dir, config=config)
        tokenizer = AutoTokenizer.from_pretrained(model_dir)

        self.tokenizer = tokenizer
        self.model = model
        self.model.to(self.device)
        self.model.eval()

        id2label = self.model.config.id2label
        if not id2label:
            raise ValueError("Model config is missing id2label")

        self.labels: List[str] = [label for _, label in sorted(id2label.items())]

    @torch.no_grad()
    def predict_logits(self, texts: List[str]) -> tuple[torch.Tensor, torch.Tensor]:
        if not texts:
            return torch.empty(0, len(self.labels)), torch.empty(0, 1)

        encoded = self.tokenizer(
            texts,
            truncation=True,
            max_length=self.cfg["model"]["max_length"],
            padding=True,
            return_tensors="pt",
        ).to(self.device)

        logits_emotion, logits_intensity = self.model(**encoded)
        return logits_emotion.cpu(), logits_intensity.cpu()


__all__ = ["EmotionClassifier"]
