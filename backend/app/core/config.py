"""환경변수 설정.

backend/.env.example 과 짝을 이룬다. 새 설정을 추가하면 양쪽을 함께 갱신할 것.

시크릿에 기본값을 주는 이유: 테스트와 CI는 .env 없이 앱을 import할 수 있어야 한다.
대신 로컬이 아닌 환경에서 시작할 때 check_required_secrets()가 누락을 잡는다.
"""

from decimal import Decimal
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── 서버 ──
    app_env: str = "local"
    port: int = 8000
    log_level: str = "info"
    frontend_origin: str = "http://localhost:5173"

    # ── DB ──
    database_url: str = "postgresql+psycopg://budgeats:budgeats@localhost:5432/budgeats"

    # ── Google Places (서버 전용. 절대 응답으로 내보내지 말 것) ──
    google_places_api_key: str = ""

    # ── Google OAuth 2.0 ──
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    oauth_success_redirect: str = "http://localhost:5173"

    # ── 세션 / 쿠키 ──
    session_secret: str = ""
    session_max_age_seconds: int = 604800
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    # ── 비즈니스 규칙 상수 (매직 넘버 금지 — CLAUDE.md 8절) ──
    # 잠정값. CLAUDE.md 11절 미확정 항목이므로 팀 확정 후 .env로 덮어쓸 것.
    price_tier_low_max_sgd: Decimal = Decimal("8")
    price_tier_mid_max_sgd: Decimal = Decimal("15")
    price_actual_min_reviews: int = 3
    review_content_max_length: int = 1000
    geo_cache_ttl_days: int = 30
    places_nearby_default_radius_m: int = 1500

    # ── Rate Limiting ──
    review_rate_limit_per_hour: int = 10


# 운영에서 비어 있으면 안 되는 설정. 누락 시 조용히 넘어가면
# OAuth가 런타임에 깨지거나 세션이 서명 없이 발급된다.
REQUIRED_IN_PRODUCTION = (
    "google_places_api_key",
    "google_oauth_client_id",
    "google_oauth_client_secret",
    "session_secret",
)


def check_required_secrets(settings: "Settings") -> None:
    """로컬이 아닌 환경에서 필수 시크릿 누락을 시작 시점에 잡는다."""
    if settings.app_env == "local":
        return

    missing = [name for name in REQUIRED_IN_PRODUCTION if not getattr(settings, name)]
    if missing:
        raise RuntimeError(
            f"필수 환경변수가 비어 있습니다: {', '.join(missing)}. "
            "backend/.env.example 을 참고해 주입하세요."
        )

    if not settings.cookie_secure:
        raise RuntimeError("운영 환경에서는 COOKIE_SECURE=true 여야 합니다 (CLAUDE.md 3.2절).")


@lru_cache
def get_settings() -> Settings:
    return Settings()
