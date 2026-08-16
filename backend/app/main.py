"""FastAPI 애플리케이션 진입점."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import check_required_secrets, get_settings
from app.core.errors import register_exception_handlers
from app.routers import health

API_PREFIX = "/api/v1"

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 시크릿 누락은 런타임에 터지기 전에 시작 시점에 잡는다.
    check_required_secrets(settings)
    yield


app = FastAPI(
    title="BudgEats SG API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
)

# 쿠키 기반 세션을 쓰므로 allow_origins에 와일드카드를 쓸 수 없다 (SRS NFR-S10).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

register_exception_handlers(app)

app.include_router(health.router, prefix=API_PREFIX)
