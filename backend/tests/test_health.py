from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_헬스체크는_공통_성공_형식을_반환한다():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"success": True, "data": {"status": "ok"}}


def test_없는_경로는_공통_실패_형식을_반환한다():
    """FastAPI 기본 {"detail": ...} 가 아니라 CLAUDE.md 6절 형식이어야 한다."""
    response = client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"
