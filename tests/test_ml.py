import numpy as np
import pytest
from setfit import SetFitModel

from ml.inference import (
    DEVICE,
    lse_pool,
    optimize_thresholds,
    predict_document_logits,
    predict_document_proba,
    segment_sentences,
)

MODEL_PATH = "artifacts/experiments/journaling_model/v1"


@pytest.fixture(scope="module")
def model():
    return SetFitModel.from_pretrained(
        MODEL_PATH,
        device=DEVICE,
    )


def test_segment_sentences_empty():
    assert segment_sentences("") == []


def test_segment_sentences_single():
    assert segment_sentences("Hello world.") == ["Hello world."]


def test_segment_sentences_overlapping():
    assert segment_sentences("Hello world. How are you? I'm fine.") == [
        "Hello world.",
        "Hello world. How are you?",
        "How are you? I'm fine.",
    ]


def test_lse_pool_shape():
    logits = np.random.randn(5, 13)

    pooled = lse_pool(logits)

    assert pooled.shape == (13,)


def test_lse_pool_single_chunk_identity():
    logits = np.random.randn(1, 13)

    pooled = lse_pool(logits)

    np.testing.assert_allclose(
        pooled,
        logits.squeeze(),
        atol=1e-6,
    )


def test_predict_document_logits_shape(model):
    texts = [
        "I feel great today.",
        "Everything is terrible.",
    ]

    logits = predict_document_logits(model, texts)

    assert logits.shape == (2, 13)


def test_predict_document_proba_shape(model):
    texts = [
        "Happy.",
        "Sad.",
    ]

    probs = predict_document_proba(model, texts)

    assert probs.shape == (2, 13)
    assert np.all(probs >= 0.0)
    assert np.all(probs <= 1.0)


def test_optimize_thresholds_shape():
    y_true = np.array(
        [
            [1, 0],
            [0, 1],
            [1, 1],
        ]
    )

    y_score = np.array(
        [
            [0.9, 0.2],
            [0.1, 0.8],
            [0.7, 0.9],
        ]
    )

    thresholds = optimize_thresholds(
        y_true,
        y_score,
    )

    assert thresholds.shape == (2,)
    assert np.all(thresholds >= 0.0)
    assert np.all(thresholds <= 1.0)
