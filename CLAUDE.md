# CLAUDE.md

이 파일은 Claude Code가 이 프로젝트에서 작업할 때 항상 참조하는 프로젝트 컨텍스트입니다.

**이 저장소는 모노레포입니다.** 1~9절과 11절은 프론트엔드/백엔드 공통 계약이며 이 파일에서만 관리합니다.
저장소(앱)별 지침인 10절은 [frontend/CLAUDE.md](frontend/CLAUDE.md), [backend/CLAUDE.md](backend/CLAUDE.md)로 분리되어 있고,
Claude Code가 해당 디렉토리에서 작업할 때 이 파일과 함께 자동으로 읽습니다.

---

## 1. 프로젝트 개요

싱가포르로 해외 연수를 오는 **한국 학생**을 대상으로, 예산에 맞는 저렴하고 맛있는 식당을 지도 기반으로 추천하고 자체 리뷰를 축적하는 웹 서비스.

- 개발 기간: 5일 스프린트 (4인)
- 방법론: SecDevOps
- 대상 지역: 싱가포르 (대학가/유학생 밀집 지역 우선)

### 핵심 기능 (MVP)
1. Google Map 위에 식당 핀 표시
2. 가격대별 핀 색상 구분 (초록=저가 / 노랑=중가 / 빨강=고가)
3. Google OAuth2 로그인
4. 우측 사이드바에 구글 평점 기반 추천 리스트 (현재 위치 기준 거리 표시)
5. 지도 우측 하단 (+) 버튼 → 장소 검색 → 자체 리뷰 작성
6. 예산 기반 식사 일정 자동 생성

### MVP 제외 (구현하지 말 것)
즐겨찾기, 리뷰 신고, 일정 저장/공유, 학교별 필터, 구글 리뷰 텍스트 분석
→ 이 기능들은 v2 범위입니다. 요청받지 않은 한 구현하지 마세요.

---

## 2. 아키텍처

프론트엔드와 백엔드는 **서버를 분리**하여 운영합니다.

```
[Browser]
   │
   ├─ Frontend Server (React)
   │     └─ Google Maps JavaScript API 직접 호출 (지도 렌더링 전용)
   │
   └─ Backend Server (API)
         ├─ Google Places API 호출  ← 서버에서만 호출 (키 보호)
         ├─ PostgreSQL (자체 리뷰/사용자/일정)
         └─ Google OAuth2 토큰 처리
```

**원칙**: Places API는 **반드시 백엔드를 경유**합니다. 프론트엔드에서 Places API를 직접 호출하는 코드를 작성하지 마세요. 지도 렌더링용 Maps JavaScript API 키만 프론트에 노출되며, 이 키는 HTTP 리퍼러 제한이 걸려 있습니다.

### 기술 스택
| 영역 | 기술 |
|---|---|
| Frontend | React, Google Maps JavaScript API |
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Pydantic |
| DB | PostgreSQL |
| 인증 | Google OAuth 2.0 |
| CI/CD | GitHub Actions |
| 이슈 관리 | Jira |
| 디자인 | Figma (레이아웃 기준) |

---

## 3. 절대 규칙 (위반 시 정책 위반 또는 보안 사고)

### 3.1 Google Maps Platform 정책
- **place_id 외의 Places API 응답 데이터를 DB에 저장하지 마세요.** 식당명, 주소, 평점, 사진, 영업시간은 저장 금지이며 매 요청마다 실시간 조회합니다.
- 위경도(lat/lng)는 최대 30일까지만 캐싱 가능합니다.
- **place_id는 영구 저장 가능**합니다. 자체 리뷰는 place_id를 외래키로 연결합니다.
- **스크래핑 금지**: Selenium, Puppeteer 등으로 구글 지도 페이지를 크롤링하는 코드를 절대 작성하지 마세요. 약관 위반입니다.
- 지도 및 데이터 표시 시 Google attribution(로고)을 반드시 표시합니다.
- 구글 리뷰 텍스트는 사용하지 않습니다 (API가 5개만 제공하며 저장 불가).

### 3.2 보안 (SecDevOps)
- **시크릿 하드코딩 금지**: API 키, DB 비밀번호, OAuth 클라이언트 시크릿을 코드에 절대 넣지 마세요. 환경변수로만 주입합니다. CI에서 gitleaks가 검출하면 빌드가 실패합니다.
- **토큰 저장**: OAuth2 Access/Refresh Token은 `HttpOnly` + `Secure` 쿠키에 저장합니다. **localStorage / sessionStorage 사용 금지**.
- **입력 검증**: 모든 사용자 입력은 서버 사이드에서 검증 및 sanitization합니다 (XSS 방지). 프론트 검증만으로 끝내지 마세요.
- **인가 검증(IDOR 방지)**: 리뷰 수정/삭제 시 요청자가 실제 작성자인지 **서버에서** 반드시 확인합니다. 프론트에서 버튼을 숨기는 것만으로는 부족합니다.
- **HTTPS 강제**: 모든 통신은 HTTPS.
- **Rate Limiting**: 리뷰 작성 API에 사용자별 요청 제한을 적용합니다.

### 3.3 비용 관리
- Places API 호출 시 **필드 마스크를 최소화**하세요. 필요 없는 필드(리뷰, 사진 등)를 요청하면 더 비싼 SKU로 과금됩니다.
- 불필요한 반복 호출을 피하고, 지도 이동 시 디바운스를 적용하세요.

---

## 4. 데이터 모델

### users
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | PK | |
| google_sub | string | Google OAuth2 고유 식별자 (unique) |
| display_name | string | |
| created_at | timestamp | |

### reviews (자체 리뷰)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | PK | |
| user_id | FK → users.id | |
| place_id | string | Google place_id (저장 허용) |
| rating | int | 1~5, 필수 |
| price_per_person | decimal | SGD, 필수 |
| content | text | 최대 1000자, 필수 |
| taste_tags | array/jsonb | 한국인 입맛 맞음, 안 짜요, 향신료 약함, 매운맛 있음 |
| student_tags | array/jsonb | 가성비, 양 많음, 혼밥 가능, 포장 가능, 카드 결제 가능 |
| visit_type | enum | 혼밥/친구/단체/기타 |
| revisit | boolean | 재방문 의사 |
| is_anonymous | boolean | 익명 표시 여부 |
| created_at / updated_at | timestamp | |

**제약**: `UNIQUE(user_id, place_id)` — 동일 사용자는 동일 식당에 리뷰 1건만 작성 가능 (수정은 허용)

### budget_plans
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | PK | |
| user_id | FK → users.id | |
| total_budget | decimal | SGD |
| days | int | |
| meals_per_day | int | |
| plan_data | jsonb | 생성된 일정 (place_id 리스트) |
| created_at | timestamp | |

---

## 5. 핵심 비즈니스 로직

### 5.1 핀 색상 산정 (데이터 소스 이원화)
```
1. 해당 place_id의 자체 리뷰 실측 가격 데이터가 N건 이상 존재
   → 실측 평균값(price_per_person)으로 등급 산정
2. 부족하면
   → Google Places API의 price_level(0~4) 매핑값 사용 (fallback)
```

| 등급 | 색상 | 1인 비용 (SGD) | price_level |
|---|---|---|---|
| 저가 | 초록 | ~ 8 | 0~1 |
| 중가 | 노랑 | 8 ~ 15 | 2 |
| 고가 | 빨강 | 15 ~ | 3~4 |

> 확정 필요: N값(예: 3건), SGD 경계값

### 5.2 자체 리뷰 작성 플로우
1. 지도 우측 하단 (+) 플로팅 버튼 클릭
2. 미로그인 시 → Google OAuth2 로그인 유도
3. 장소 검색 팝업 (Places Autocomplete)
4. 식당 선택 → **place_id만 서버로 전송** (식당명 등 다른 필드 전송/저장 금지)
5. 리뷰 폼 입력 → 저장
6. 해당 식당 실측 가격 평균 재계산 → 핀 색상 갱신

### 5.3 예산 일정 생성
```
끼니당 예산 = 총예산 ÷ (기간 × 하루 끼니수)
→ 끼니당 예산 범위에 맞는 가격 등급의 식당 매칭
→ 동일 카테고리 연속 배정 회피
→ 일정표 출력, 개별 항목 교체 가능
```

---

## 6. API 계약

**Base URL**: `/api/v1`
**인증**: HttpOnly 쿠키 기반 세션. 인증 필요 엔드포인트는 🔒 표시.

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/health` | 서버 기동 확인 (배포 헬스체크용) |
| GET | `/auth/google` | Google OAuth2 로그인 시작 |
| GET | `/auth/google/callback` | OAuth2 콜백 |
| POST | `/auth/logout` 🔒 | 로그아웃 |
| GET | `/auth/me` 🔒 | 현재 로그인 사용자 정보 |
| GET | `/places/nearby?lat=&lng=&radius=` | 주변 식당 목록 (핀/사이드바용). 가격 등급 포함 |
| GET | `/places/search?query=` | 장소 검색 (리뷰 작성 팝업용). place_id 반환 |
| GET | `/places/:placeId` | 식당 상세 (구글 정보 실시간 조회 + 자체 리뷰 요약) |
| GET | `/places/:placeId/reviews` | 해당 식당의 자체 리뷰 목록 (최신순) |
| POST | `/reviews` 🔒 | 자체 리뷰 작성 |
| PATCH | `/reviews/:id` 🔒 | 리뷰 수정 (작성자 본인만) |
| DELETE | `/reviews/:id` 🔒 | 리뷰 삭제 (작성자 본인만) |
| POST | `/budget-plans` | 예산 일정 생성 |

### 응답 형식 (공통)
```json
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": { "code": "INVALID_INPUT", "message": "..." } }
```

> API 스펙 변경 시 **반드시 이 파일과 Swagger 문서를 함께 갱신**하세요. 프론트/백엔드가 다른 세션에서 개발되므로 이 파일이 유일한 계약서입니다.

---

## 7. Git / Jira 컨벤션

### 브랜치
```
main       ← 배포 (Day 5)
 └ develop ← 통합 (매일 저녁)
    ├ feature/SGF-XX-설명
    └ fix/SGF-XX-설명
```

### 커밋 메시지
```
SGF-12 feat: 가격대별 핀 색상 적용
SGF-15 fix: 리뷰 중복 작성 검증 누락 수정
```
- 반드시 **Jira 이슈 키로 시작** (Jira 자동 연동)
- 타입: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- **커밋 메시지 본문에 Claude Code 관련 서명이나 광고 문구를 넣지 마세요.**

### PR
- 제목: `[SGF-XX] 내용`
- `main`, `develop` 직접 push 금지
- 머지 조건: CI 통과 + 리뷰어 1명 승인

---

## 8. 코딩 규칙

- 주석과 커밋 메시지는 한국어, 코드 식별자는 영어
- 매직 넘버 금지 — 가격 경계값(8, 15 SGD), 가중치 등은 상수/설정으로 분리
- 에러는 삼키지 말고 로깅 후 표준 에러 응답 형식으로 반환
- 5일 일정이므로 **과도한 추상화 금지**. 지금 필요한 것만 구현하세요.
- UI는 Figma 레이아웃을 기준으로 하되, 픽셀 단위 정합보다 **기능 동작 우선**입니다.

---

## 9. 작업 시 주의사항 (Claude Code 대상)

- **요청받지 않은 기능을 임의로 추가하지 마세요.** MVP 범위(1절)를 벗어나는 제안은 코드로 작성하기 전에 먼저 물어보세요.
- 3절 "절대 규칙"에 위배되는 코드를 요청받으면, 작성하기 전에 위반 사항을 알려주세요.
- API 스펙에 없는 엔드포인트를 임의로 만들지 말고, 필요하면 6절에 추가 제안 후 진행하세요.
- 새 라이브러리 추가 시 의존성 취약점 스캔이 CI에서 돌아간다는 점을 고려하세요. 꼭 필요한 것만 추가합니다.
- 테스트 실행 결과가 길 경우 서브에이전트에 위임하여 실패 항목만 요약받으세요.

---

## 10. 저장소별 지침

앱별 상세 지침은 각 디렉토리의 CLAUDE.md에 있습니다. 해당 디렉토리에서 작업할 때 자동으로 함께 로드됩니다.

| 앱 | 지침 파일 | 요약 |
|---|---|---|
| Frontend | [frontend/CLAUDE.md](frontend/CLAUDE.md) | React + Vite. Places API 직접 호출 금지, `src/api` 경유, 토큰 localStorage 금지, 지도 이동 디바운스 |
| Backend | [backend/CLAUDE.md](backend/CLAUDE.md) | FastAPI. Places 호출은 `app/services/places`에 격리, Pydantic 입력 검증, 작성자 검증 의존성 필수 |

> 모노레포지만 프론트/백엔드는 **별도 서버로 배포**됩니다 (2절). 두 앱 사이에 코드를 직접 import하지 마세요.
> 유일한 연결 지점은 6절 API 계약입니다.

---

## 11. 미확정 사항 (구현 전 팀 확인 필요)

- [ ] 핀 색상 SGD 경계값 및 실측 데이터 채택 최소 건수 N
      → `backend/.env.example`에 **잠정값**(8 / 15 SGD, N=3)이 설정으로 들어가 있습니다. 팀 확정 후 값만 교체하세요.
- [ ] 예산 배분 알고리즘 세부 규칙 (여유분 비율 등)
- [ ] 데이터 수집 대상 지역 범위 (어느 대학가 우선)
- [ ] 태그 항목 최종 확정
- [ ] 이미지 업로드 저장소 및 용량 정책
- [x] ~~백엔드 프레임워크 확정~~ → **FastAPI (Python)** 로 확정 (2026-08-16)
