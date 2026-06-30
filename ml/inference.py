import nltk
import numpy as np
import scipy.special
from sklearn.metrics import f1_score
import torch

from setfit import SetFitHead, SetFitModel
from ml.config import load_config
from scipy.optimize import minimize
from sklearn.metrics import log_loss

cfg = load_config()

nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


def segment_sentences(text: str) -> list[str]:
    """Segments the input text into overlapping chunks."""
    sentences = [s.strip() for s in nltk.sent_tokenize(text) if s.strip()]

    if not sentences:
        return []

    return [
        sentences[0] if i == 0 else f"{sentences[i - 1]} {sentences[i]}"
        for i in range(len(sentences))
    ]


def lse_pool(logits: np.ndarray, tau: float = cfg.inference.tau) -> np.ndarray:
    return (scipy.special.logsumexp(tau * logits, axis=0) - np.log(logits.shape[0])) / tau


def fit_temperatures(
    y_true: np.ndarray,
    logits: np.ndarray,
) -> np.ndarray:
    """Fits a temperature scaling parameter for each label to calibrate the predicted probabilities."""
    temperatures = np.ones(logits.shape[1])

    for i in range(logits.shape[1]):

        def objective(log_T):
            T = np.exp(log_T[0])
            probs = scipy.special.expit(logits[:, i] / T)
            return log_loss(y_true[:, i], probs)

        result = minimize(
            objective,
            x0=[0.0],
            method="L-BFGS-B",
        )

        temperatures[i] = np.exp(result.x[0])

    return temperatures


def predict_document_logits(
    model: SetFitModel,
    texts: list[str],
    tau: float = cfg.inference.tau,
) -> np.ndarray:
    """Predicts the logits for each document by segmenting it into overlapping chunks and pooling the logits."""
    outputs = []

    for text in texts:
        # for pylance
        assert model.model_body is not None
        assert isinstance(model.model_head, SetFitHead)

        chunks = segment_sentences(text) or [text]
        embeddings = model.model_body.encode(
            chunks,
            convert_to_tensor=True,
            device=DEVICE,
        ).clone()

        with torch.no_grad():
            logits, _ = model.model_head(embeddings)

        outputs.append(
            lse_pool(
                logits.cpu().numpy(),
                tau=tau,
            )
        )

    return np.asarray(outputs)


def predict_document_proba(
    model: SetFitModel,
    texts: list[str],
    tau: float = cfg.inference.tau,
    temperatures: np.ndarray | None = None,
) -> np.ndarray:
    """Predicts the probabilities for each document by segmenting it into overlapping chunks, pooling the logits, and applying temperature scaling."""
    logits = predict_document_logits(
        model,
        texts,
        tau=tau,
    )
    if temperatures is not None:
        logits = logits / temperatures

    return scipy.special.expit(logits)


def optimize_thresholds(
    y_true: np.ndarray,
    y_score: np.ndarray,
) -> np.ndarray:
    """Optimizes the thresholds for each label to maximize the F1 score."""
    thresholds = np.zeros(y_true.shape[1])

    for i in range(y_true.shape[1]):
        best_t = 0.5
        best_f1 = -1.0

        scores = y_score[:, i]

        for t in np.unique(scores):
            pred = (scores >= t).astype(int)

            score = f1_score(
                y_true[:, i],
                pred,
                zero_division=0,
            )

            if score > best_f1:
                best_f1 = score
                best_t = t

        thresholds[i] = best_t
    return thresholds
