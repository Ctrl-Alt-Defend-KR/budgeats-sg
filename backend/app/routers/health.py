"""헬스체크.

배포 환경의 기동 확인용이며 CLAUDE.md 6절 API 계약에 추가되었다.
구글 데이터나 사용자 정보를 다루지 않는다.
"""

from fastapi import APIRouter

from app.core.errors import success_response

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    return success_response({"status": "ok"})
