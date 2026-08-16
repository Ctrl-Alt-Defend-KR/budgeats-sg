import pytest

from app.core.config import Settings, check_required_secrets


def test_로컬에서는_시크릿이_비어도_통과한다():
    """테스트와 CI가 .env 없이 앱을 import할 수 있어야 한다."""
    check_required_secrets(Settings(app_env="local"))


def test_운영에서_시크릿이_비면_시작을_막는다():
    settings = Settings(app_env="production", cookie_secure=True)

    with pytest.raises(RuntimeError, match="필수 환경변수"):
        check_required_secrets(settings)


def test_운영에서_cookie_secure가_꺼져_있으면_시작을_막는다():
    settings = Settings(
        app_env="production",
        google_places_api_key="x",
        google_oauth_client_id="x",
        google_oauth_client_secret="x",
        session_secret="x",
        cookie_secure=False,
    )

    with pytest.raises(RuntimeError, match="COOKIE_SECURE"):
        check_required_secrets(settings)
