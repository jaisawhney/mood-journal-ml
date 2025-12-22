from fastapi.testclient import TestClient
import pytest
from apps.api.main import app

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_and_teardown():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_predict_single_text():
    response = client.post("/predict", json={"texts": ["I am very happy today!"]})
    assert response.status_code == 200

    data = response.json()
    assert "predictions" in data
    assert len(data["predictions"]) == 1
    prediction = data["predictions"][0]
    assert "predicted" in prediction
    assert "confidence" in prediction
    assert "scores" in prediction

    assert isinstance(prediction["predicted"], str)
    assert isinstance(prediction["confidence"], float)
    assert isinstance(prediction["scores"], dict)

    assert 0.0 <= prediction["confidence"] <= 1.0
    assert abs(sum(prediction["scores"].values()) - 1.0) < 1e-5  # Scores should sum to 1


def test_predict_multiple_texts():
    payload = {
        "texts": [
            "I am very happy today!",
            "I feel so sad and down.",
            "This is the best day ever!",
        ]
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "predictions" in data
    assert len(data["predictions"]) == len(payload["texts"])
