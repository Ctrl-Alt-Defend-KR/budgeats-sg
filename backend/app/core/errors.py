"""공통 응답 형식 (CLAUDE.md 6절).

프론트엔드의 src/api/client.ts 가 이 형식을 전제로 응답을 언래핑한다.
형식을 바꾸면 프론트가 통째로 깨지므로 CLAUDE.md 6절과 함께 갱신할 것.

    성공: { "success": true,  "data": { ... } }
    실패: { "success": false, "error": { "code": "...", "message": "..." } }
"""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def success_response(data: Any) -> dict[str, Any]:
    return {"success": True, "data": data}


def error_response(code: str, message: str) -> dict[str, Any]:
    return {"success": False, "error": {"code": code, "message": message}}


# HTTP 상태 코드 → 에러 코드. 프론트가 분기에 쓰므로 임의로 바꾸지 말 것.
_STATUS_TO_CODE = {
    status.HTTP_400_BAD_REQUEST: "INVALID_INPUT",
    status.HTTP_401_UNAUTHORIZED: "UNAUTHENTICATED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_409_CONFLICT: "CONFLICT",
    status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMITED",
}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = _STATUS_TO_CODE.get(exc.status_code, "ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(code, str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # FastAPI 기본 422 응답을 공통 형식으로 감싼다.
        first = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(part) for part in first.get("loc", ())[1:])
        message = first.get("msg", "입력값이 올바르지 않습니다.")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response(
                "INVALID_INPUT",
                f"{field}: {message}" if field else message,
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        # 에러를 삼키지 말고 로깅 후 표준 형식으로 반환한다 (CLAUDE.md 8절).
        # 예외 내용은 로그에만 남긴다. 응답에 스택 트레이스를 노출하지 않는다 (SRS NFR-S8).
        logger.exception("처리되지 않은 예외", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response("INTERNAL_ERROR", "서버 오류가 발생했습니다."),
        )
