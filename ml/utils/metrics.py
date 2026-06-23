import numpy as np
from scipy.special import expit
from sklearn.metrics import roc_auc_score, average_precision_score


def compute_metrics(eval_pred):
    """Compute evaluation metrics given predictions and labels."""
    predictions, labels = eval_pred
    emotion_logits = predictions

    probs = expit(emotion_logits)
    micro_auc = roc_auc_score(labels, probs, average="micro")
    macro_auc = roc_auc_score(labels, probs, average="macro")

    micro_pr_auc = average_precision_score(labels, probs, average="micro")
    macro_pr_auc = average_precision_score(labels, probs, average="macro")
        
    metrics = {
        "micro_auc": float(micro_auc),
        "macro_auc": float(macro_auc),
        "micro_pr_auc": float(micro_pr_auc),
        "macro_pr_auc": float(macro_pr_auc),
    }
    return metrics


def compute_auc_metrics(logits, labels, label_names=None):
    """Compute AUC metrics for multi-label classification."""
    probs = expit(logits)
    micro_auc = roc_auc_score(labels, probs, average="micro")
    macro_auc = roc_auc_score(labels, probs, average="macro")

    micro_pr_auc = average_precision_score(labels, probs, average="micro")
    macro_pr_auc = average_precision_score(labels, probs, average="macro")

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
        "macro_auc": float(macro_auc),
        "per_label_auc": per_label_aucs,
        "label_names": label_names,
        "micro_pr_auc": float(micro_pr_auc),
        "macro_pr_auc": float(macro_pr_auc),
    }
