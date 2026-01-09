from fastapi.testclient import TestClient
import pytest
from apps.api.main import app

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_and_teardown():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_models_static_serving():
    response = client.get("/api/models/")
    assert response.status_code in (200, 404)


def test_spa_fallback():
    response = client.get("/random/path")
    assert response.status_code in (200, 404)
