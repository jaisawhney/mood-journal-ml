import json

import numpy as np
import pandas as pd
import torch
import scipy.special

from setfit import SetFitModel
from sklearn.metrics import (
    classification_report,
    f1_score,
    hamming_loss,
    roc_auc_score,
)

from ml.data import load_journaling_dataset
from ml.inference import (
    fit_temperatures,
    optimize_thresholds,
    predict_document_logits,
)

from ml.config import load_config

cfg = load_config()

THRESHOLD_PATH = cfg.evaluation.threshold_file
TEMPERATURE_PATH = cfg.evaluation.temperature_file

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def validate_model():
    dataset, label_names, _, _ = load_journaling_dataset()

    model = SetFitModel.from_pretrained(
        cfg.training.output_dir,
        device=DEVICE,
    )

    y_true = np.asarray(dataset["validation"]["labels"])

    logits = predict_document_logits(
        model,
        dataset["validation"]["text"],
    )

    temperatures = fit_temperatures(
        y_true,
        logits,
    )

    y_score = scipy.special.expit(logits / temperatures)

    thresholds = optimize_thresholds(
        y_true,
        y_score,
    )

    THRESHOLD_PATH.parent.mkdir(parents=True, exist_ok=True)
    TEMPERATURE_PATH.parent.mkdir(parents=True, exist_ok=True)

    with THRESHOLD_PATH.open("w") as f:
        json.dump(
            dict(zip(label_names, thresholds.tolist())),
            f,
            indent=2,
        )
    with TEMPERATURE_PATH.open("w") as f:
        json.dump(
            dict(zip(label_names, temperatures.tolist())),
            f,
            indent=2,
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
    metrics, report = validate_model()

    print("=" * 60)
    print("Validation Metrics")
    print("=" * 60)
    metrics_df = pd.DataFrame(
        metrics.items(),
        columns=["Metric", "Score"],
    ).round(3)
    print(metrics_df)
    report_df = pd.DataFrame(report).T.round(3)

    print("\nClassification Report:")
    print(report_df)
