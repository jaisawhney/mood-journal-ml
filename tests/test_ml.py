import os
import json
import tempfile
import torch
import numpy as np
import pytest

from pathlib import Path
from transformers import AutoConfig

from ml.calibration import baselines, temperature
from ml.training.trainer import EmotionModel
from ml.export import onnx
from ml.utils.metrics import compute_metrics, compute_auc_metrics

from ml.inference.classifier import EmotionClassifier


@pytest.fixture(scope="module")
def classifier():
    return EmotionClassifier()


# Calibration tests
def test_calibration_baselines_output():
    logits = torch.randn(10, 3)
    labels = ["happy", "sad", "angry"]
    result = baselines.compute_label_baselines(logits, labels)
    assert set(result.keys()) == set(labels)
    for v in result.values():
        assert "mean" in v and "std" in v and "min" in v and "max" in v

    for label_baseline in result.values():
        assert (
            "mean" in label_baseline
            and "std" in label_baseline
            and "min" in label_baseline
            and "max" in label_baseline
        )
    logits = torch.randn(20, 4)
    labels = torch.randint(0, 2, (20, 4)).float()
    temps = temperature.fit_per_label_temperature(logits, labels)
    assert torch.all(temps > 0)
    assert temps.shape[0] == logits.shape[1]


def test_calibration_baselines_file_serialization():
    with tempfile.TemporaryDirectory() as tmpdir:
        baseline_path = os.path.join(tmpdir, "baselines.json")
        sample_baselines = {
            "emotion": {"happy": {"mean": 0.0, "std": 1.0, "min": -1.0, "max": 1.0}},
            "intensity": {"mean": 0.0, "min": -1.0, "max": 1.0},
        }
        with open(baseline_path, "w") as f:
            json.dump(sample_baselines, f)
        assert os.path.exists(baseline_path)

        # Load and validate baselines file
        with open(baseline_path, "r") as f:
            loaded = json.load(f)
        assert "emotion" in loaded
        assert "intensity" in loaded
        assert "happy" in loaded["emotion"]
        for stat in ["mean", "std", "min", "max"]:
            assert stat in loaded["emotion"]["happy"]
        for stat in ["mean", "min", "max"]:
            assert stat in loaded["intensity"]


# Evaluation tests
def test_evaluation_compute_metrics():
    logits = np.array([[0.5, 1.0], [1.5, -1.0]])
    labels = np.array([[1, 0], [0, 1]])
    eval_pred = (logits, labels)
    metrics = compute_metrics(eval_pred)
    assert "micro_auc" in metrics
    assert "macro_auc" in metrics


def test_evaluation_compute_auc_metrics():
    logits = np.array([[0.5, 1.0], [1.5, -1.0]])
    labels = np.array([[1, 0], [0, 1]])
    result = compute_auc_metrics(logits, labels, label_names=["happy", "sad"])
    assert "micro_auc" in result
    assert "macro_auc" in result
    assert "per_label_auc" in result
    assert result["label_names"] == ["happy", "sad"]


# Export tests
def test_export_onnx_torch_runs():
    config = AutoConfig.from_pretrained("distilbert-base-uncased", num_labels=2)
    model = EmotionModel(config)

    class DummyTokenizer:
        def __call__(self, texts, **kwargs):
            return {
                "input_ids": torch.ones((2, 10), dtype=torch.long),
                "attention_mask": torch.ones((2, 10), dtype=torch.long),
            }

    tokenizer = DummyTokenizer()
    with tempfile.TemporaryDirectory() as tmpdir:
        onnx_path = Path(tmpdir) / "model.onnx"
        onnx.export_onnx_torch(model, tokenizer, onnx_path, max_length=10)
        assert onnx_path.exists()


# Training tests
def test_training_emotion_model_forward():
    config = AutoConfig.from_pretrained("distilbert-base-uncased", num_labels=2)
    model = EmotionModel(config)
    input_ids = torch.ones((2, 10), dtype=torch.long)
    attention_mask = torch.ones((2, 10), dtype=torch.long)
    logits_emotion, logits_intensity = model(input_ids=input_ids, attention_mask=attention_mask)
    assert logits_emotion.shape == (2, 2)
    assert logits_intensity.shape == (2, 1)


# Inference tests
def test_inference_classifier_loads(classifier):
    assert hasattr(classifier, "model")
    assert hasattr(classifier, "tokenizer")
    assert isinstance(classifier.labels, list)
    assert len(classifier.labels) > 0


def test_inference_predict_logits_shape(classifier):
    texts = ["I am happy.", "I am sad."]
    logits_emotion, logits_intensity = classifier.predict_logits(texts)
    assert isinstance(logits_emotion, torch.Tensor)
    assert isinstance(logits_intensity, torch.Tensor)
    assert logits_emotion.shape[0] == len(texts)
    assert logits_emotion.shape[1] == len(classifier.labels)
    assert logits_intensity.shape[0] == len(texts)
    assert logits_intensity.shape[1] == 1


def test_inference_predict_logits_empty(classifier):
    logits_emotion, logits_intensity = classifier.predict_logits([])
    assert logits_emotion.shape[0] == 0
    assert logits_intensity.shape[0] == 0
