# CLAUDE.md — Backend

> 이 파일은 루트 [CLAUDE.md](../CLAUDE.md)의 **10절(저장소별 지침)** 에 해당합니다.
> 1~9절·11절(프로젝트 개요, 절대 규칙, 데이터 모델, API 계약, Git 컨벤션 등)은 루트 파일이 원본이며,
> Claude Code가 이 디렉토리에서 작업할 때 두 파일을 함께 읽습니다. **여기에 루트 내용을 복사하지 마세요.**

---

## 역할

FastAPI 기반 API 서버. Google Places API 호출과 DB 접근을 독점하며, 프론트엔드에는 API 계약(루트 6절)만 노출합니다.

## 기술 스택

| 항목 | 선택 |
|---|---|
| 런타임 | Python 3.11+ |
| 프레임워크 | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2.x |
| 검증 | Pydantic v2 |
| 마이그레이션 | Alembic |
| DB | PostgreSQL |

## 디렉토리 구조

루트 10절 원문은 Express 기준(`src/routes`, `src/middlewares`)이었으나, FastAPI 확정에 따라 아래 구조로 대응합니다.

```
backend/
├── app/
│   ├── routers/        ← (원문 routes) 엔드포인트 정의. 라우터당 파일 1개
│   ├── services/       ← 비즈니스 로직
│   │   └── places/     ← Google Places API 호출을 여기에만 격리
│   ├── models/         ← SQLAlchemy 모델 (users, reviews, budget_plans)
│   ├── schemas/        ← Pydantic 요청/응답 스키마
│   ├── dependencies/   ← (원문 middlewares) 인증·인가·rate limit Depends
│   ├── core/           ← 설정(Settings), 예외, 상수
│   └── main.py
├── alembic/
├── tests/
├── .env.example
└── CLAUDE.md
```

## 이 저장소의 규칙

### Google Places API
- **Places API 호출은 `app/services/places` 밖에서 하지 마세요.** 라우터가 `httpx`로 구글을 직접 부르는 코드 금지.
- **응답 중 `place_id` 외의 필드를 DB에 저장하는 코드를 작성하지 마세요.** 식당명·주소·평점·사진·영업시간은 전부 실시간 조회 후 응답에 실어 보내고 버립니다.
  - 예외: 위경도(lat/lng)는 최대 30일 캐싱 허용 (루트 3.1절).
- **필드 마스크를 최소화**하세요. `reviews`, `photos` 필드를 요청하면 상위 SKU로 과금됩니다 (루트 3.3절).
- 스크래핑 코드(Selenium, Puppeteer 등) 절대 금지.

### 입력 검증
- 모든 요청 바디·쿼리 파라미터에 **Pydantic 스키마를 적용**합니다. `dict`나 raw `Request`로 받지 마세요.
- 리뷰 `content`는 최대 1000자 제한 + HTML sanitization을 서버에서 수행합니다 (XSS 방지).
- `rating`은 1~5, `price_per_person`은 양수 검증.

### 인가 (IDOR 방지)
- `PATCH /reviews/:id`, `DELETE /reviews/:id`에 **작성자 검증 의존성을 필수로 붙입니다.**
  요청자 `user_id`와 리뷰의 `user_id`가 다르면 403을 반환하세요.
- 인증 필요 엔드포인트(루트 6절 🔒)는 전부 세션 의존성을 통과해야 합니다.

### 인증 / 세션
- OAuth2 토큰은 응답 바디로 절대 내보내지 않습니다. `HttpOnly` + `Secure` + `SameSite` 쿠키로만 설정합니다.
- 로컬 개발에서만 `COOKIE_SECURE=false`를 허용하고, 운영 설정에서는 `true`를 강제하세요.

### 설정 / 상수
- 가격 경계값(8, 15 SGD), 실측 데이터 채택 최소 건수 N은 **`app/core/config.py`의 Settings로만 읽습니다.** 코드에 숫자를 박지 마세요.
- 현재 값은 잠정값입니다 (루트 11절 미확정).

### 에러 처리
- 예외를 삼키지 말고 로깅 후 루트 6절 형식으로 반환합니다:
  `{"success": false, "error": {"code": "INVALID_INPUT", "message": "..."}}`
- FastAPI 기본 422 응답 형식도 이 형식으로 감싸는 예외 핸들러를 둡니다.
- **로그에 API 키·토큰·쿠키 값을 남기지 마세요.**

### Rate Limiting
- `POST /reviews`에 사용자별 요청 제한을 적용합니다 (`REVIEW_RATE_LIMIT_PER_HOUR`).

### DB
- 스키마 변경은 반드시 Alembic 마이그레이션으로 관리합니다. `create_all()`로 운영 스키마를 만들지 마세요.
- `reviews` 테이블에 `UNIQUE(user_id, place_id)` 제약이 있어야 합니다 (동일 식당 리뷰 1건).

## 실행

```bash
cd backend
cp .env.example .env           # 값 채우기
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs (Swagger UI)
- **API 스펙을 바꾸면 루트 CLAUDE.md 6절도 같이 갱신하세요.** 프론트와 계약이 깨집니다.

## 체크리스트 (PR 전)

- [ ] `app/services/places` 밖에서 구글 API를 호출한 곳이 없는가
- [ ] Places 응답 필드를 DB에 저장하는 코드가 없는가 (`place_id` 제외)
- [ ] 새 엔드포인트에 Pydantic 스키마가 붙어 있는가
- [ ] 리뷰 수정/삭제에 작성자 검증이 걸려 있는가
- [ ] 가격 경계값 등 숫자를 하드코딩하지 않았는가
- [ ] 로그·응답에 시크릿이 노출되지 않는가
- [ ] API 스펙 변경 시 루트 6절을 갱신했는가
