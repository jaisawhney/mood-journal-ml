import numpy as np
from sklearn.calibration import expit
from sklearn.metrics import roc_auc_score
from scipy.stats import spearmanr


# this function is used for both emotion and intensity metrics
def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    if isinstance(predictions, tuple) or isinstance(predictions, list):
        emotion_logits, intensity_logits = predictions
        labels, intensity_labels = labels
    else:
        emotion_logits = predictions
        intensity_logits = None
        intensity_labels = None

    probs = expit(emotion_logits)
    micro_auc = roc_auc_score(labels.ravel(), probs.ravel())

    aucs = []
    for i in range(labels.shape[1]):
        y = labels[:, i]
        if np.unique(y).size < 2:
            continue
        aucs.append(roc_auc_score(y, probs[:, i]))

    metrics = {
        "micro_auc": float(micro_auc),
        "macro_auc": float(np.mean(aucs)),
    }

    if intensity_logits is not None and intensity_labels is not None:
        metrics["intensity_spearmanr"] = float(
            spearmanr(intensity_labels, intensity_logits).correlation
        )
    return metrics


def compute_auc_metrics(logits, labels, label_names=None):
    probs = expit(logits)
    micro_auc = roc_auc_score(labels.ravel(), probs.ravel())

    aucs = []
    per_label_aucs = []
    for i in range(labels.shape[1]):
        y = labels[:, i]
        if np.unique(y).size < 2:
            per_label_aucs.append(0.0)
            continue
        auc = roc_auc_score(y, probs[:, i])
        aucs.append(auc)
        per_label_aucs.append(auc)

    if label_names is None:
        label_names = [f"label_{i}" for i in range(labels.shape[1])]

    return {
        "micro_auc": float(micro_auc),
        "macro_auc": float(np.mean(aucs)) if aucs else 0.0,
        "per_label_auc": per_label_aucs,
        "label_names": label_names,
    }
