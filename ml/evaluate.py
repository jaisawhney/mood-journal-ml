import json

import numpy as np
import pandas as pd
import scipy
import torch

from setfit import SetFitModel
from sklearn.metrics import (
    classification_report,
    f1_score,
    hamming_loss,
    roc_auc_score,
)

from ml.config import load_config
from ml.data import load_journaling_dataset
from ml.inference import predict_document_logits

cfg = load_config()

THRESHOLD_PATH = cfg.evaluation.threshold_file
TEMPERATURE_PATH = cfg.evaluation.temperature_file

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def evaluate_model():

    dataset, label_names, _, _ = load_journaling_dataset()

    model = SetFitModel.from_pretrained(
        cfg.training.output_dir,
        device=DEVICE,
    )

    with THRESHOLD_PATH.open() as f:
        threshold_dict = json.load(f)

    with TEMPERATURE_PATH.open() as f:
        temperature_dict = json.load(f)

    temperatures = np.asarray(
        [temperature_dict[label] for label in label_names],
        dtype=float,
    )

    y_true = np.asarray(dataset["test"]["labels"])

    logits = predict_document_logits(
        model,
        dataset["test"]["text"],
    )

    y_score = scipy.special.expit(logits / temperatures)

    thresholds = np.asarray(
        [threshold_dict[label] for label in label_names],
        dtype=float,
    )

    y_pred = (y_score >= thresholds).astype(int)

    macro_f1 = f1_score(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )

    micro_f1 = f1_score(
        y_true,
        y_pred,
        average="micro",
        zero_division=0,
    )

    macro_auc = roc_auc_score(
        y_true,
        y_score,
        average="macro",
    )

    hamming = hamming_loss(y_true, y_pred)

    metrics = {
        "Macro F1": macro_f1,
        "Micro F1": micro_f1,
        "Macro ROC AUC": macro_auc,
        "Hamming Loss": hamming,
    }

    report = classification_report(
        y_true,
        y_pred,
        target_names=label_names,
        output_dict=True,
        zero_division=0,
    )

    return metrics, report


if __name__ == "__main__":
    metrics, report = evaluate_model()

    print("=" * 60)
    print("Test Metrics")
    print("=" * 60)
    metrics_df = pd.DataFrame(
        metrics.items(),
        columns=["Metric", "Score"],
    ).round(3)
    print(metrics_df)
    report_df = pd.DataFrame(report).T.round(3)

    print("\nClassification Report:")
    print(report_df)
