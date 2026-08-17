# 백엔드 병렬 작업 계획 — Agent 2대

**프로젝트**: BudgEats SG
**대상**: 백엔드 개발 AI 에이전트 2대 (Agent A / Agent B)
**기간**: 3일 (초단기 — 원 계획 5일에서 압축)
**작성일**: 2026-08-17

> 요구사항은 [SRS.md](SRS.md), 구현 규칙·API 계약은 [CLAUDE.md](../CLAUDE.md)가 원본입니다.
> 이 문서는 **두 에이전트가 서로를 기다리지도, 같은 파일을 덮어쓰지도 않게 하는 분업 규칙**만 정의합니다.
> 이 문서와 CLAUDE.md가 충돌하면 CLAUDE.md가 우선합니다.

---

## 1. 이 문서가 해결하는 문제

에이전트 2대를 같은 저장소에 풀면 기능이 아니라 **충돌**에서 시간을 잃습니다. 실패 모드는 셋뿐입니다.

| 실패 모드 | 원인 | 이 문서의 대응 |
|---|---|---|
| 같은 파일을 양쪽이 수정 | 소유권이 없음 | 3절 **파일 소유권 표** — 교집합 0 |
| 한쪽이 다른 쪽 산출물을 기다림 | 공유 타입·시그니처가 없음 | 2절 **Step 0** 에서 seam을 먼저 만들고 동결 |
| 통합 시점에 응답 스키마가 안 맞음 | 계약이 말로만 존재 | 6절 **동결된 API 계약** — 필드명까지 확정 |

**원칙**: Step 0(직렬, 30분)에 공유 지점을 전부 만들고 동결한다. 그 뒤 두 에이전트는 **서로의 파일을 읽기만** 하고 절대 수정하지 않는다.

---

## 2. Step 0 — 공유 seam 구축 (직렬, 에이전트 투입 전)

두 에이전트가 동시에 필요로 하는 것만 만듭니다. **완료 후 이 파일들은 동결**되며, 이후 수정은 양쪽 합의 후 한 명이 단독으로 합니다.

| 파일 | 내용 | 왜 Step 0인가 |
|---|---|---|
| `domain/User.java` | `id`, `googleSub`(unique), `displayName`, `createdAt` | A가 생성(로그인), B가 조회(작성자명) |
| `repository/UserRepository.java` | `findByGoogleSub`, `findById` | 위와 동일 |
| `domain/Review.java` | CLAUDE.md 4절 전 컬럼 + `UNIQUE(user_id, place_id)` | B가 소유하지만 A의 가격 등급 산정이 이 테이블을 읽음 |
| `domain/VisitType.java` | `SOLO`, `FRIENDS`, `GROUP`, `OTHER` enum | 양쪽 DTO에서 참조 |
| `repository/ReviewRepository.java` | **6.7절의 쿼리 시그니처 3개** | A의 `/places/*` 가 그대로 호출. 이 시그니처가 seam의 핵심 |
| `core/PriceTier.java` | `LOW`/`MID`/`HIGH` + `@JsonValue` 소문자 직렬화 | 프론트가 `low`/`mid`/`high` 를 전제 (`frontend/src/constants/price.ts`) |
| `core/PriceTierPolicy.java` | 순수 함수. 실측 평균·건수·`priceLevel` → `PriceTier` | A가 호출, B가 데이터 공급. 상태 없음 |
| `core/CurrentUser.java` | `@CurrentUser` 파라미터 애노테이션 (선언만) | B의 🔒 컨트롤러가 이 애노테이션만 붙이면 됨. 해석기는 A가 구현 |

### Step 0에서 하지 않는 것

- **`build.gradle` 의존성 추가 금지.** 현재 의존성으로 전부 됩니다 (7절 참조). 양쪽이 이 파일을 건드리면 충돌하므로, 정말 필요해지면 그 시점에 한 명이 단독으로 추가하고 상대에게 알립니다.
- **`BudgeatsProperties` 수정 금지.** 필요한 설정 키는 이미 전부 있습니다. 새 키가 필요하면 8절 핸드오프 절차를 따릅니다.
- `PriceTierPolicy` 를 인터페이스로 만들지 않습니다. 구현이 하나뿐이고, 인자로 값을 받는 순수 함수라 주입할 것이 없습니다.

### `PriceTierPolicy` 계산 규칙 (CLAUDE.md 5.1절)

```
실측 리뷰 건수 >= priceActualMinReviews (N)  →  실측 평균 price_per_person 으로 등급 산정
                                    미달  →  Google price_level 매핑 (fallback)

실측:  ~ N(8) SGD → LOW     |  N ~ M(15) → MID  |  M(15) ~ → HIGH
구글:  price_level 0~1 → LOW |  2 → MID          |  3~4 → HIGH
priceLevel 자체가 null (구글 미제공) → MID 로 간주하고 priceTierSource="unknown"
```

경계값 `8`/`15`와 `N=3`은 **`BudgeatsProperties` 에서만 읽습니다.** 코드에 숫자를 쓰지 마세요 (CLAUDE.md 8절).

---

## 3. 파일 소유권 (교집합 0)

**자기 소유가 아닌 파일은 읽기만 합니다.** 수정이 필요하면 8절 핸드오프.

| 경로 | 소유 | 비고 |
|---|---|---|
| `core/session/**` | **A** | 세션 쿠키 발급·검증, `@CurrentUser` 해석기 |
| `controller/AuthController` | **A** | `/auth/*` 4개 |
| `service/auth/**` | **A** | OAuth2 코드 교환, 사용자 생성 |
| `service/places/**` | **A** | Google Places 호출 격리 (CLAUDE.md 3.1절 — 여기 밖에서 호출 금지) |
| `controller/PlaceController` | **A** | `/places/nearby`, `/places/search`, `/places/:placeId` |
| `dto/auth/**`, `dto/place/**` | **A** | |
| `controller/ReviewController` | **B** | `/reviews` 3개 + `/places/:placeId/reviews` |
| `service/review/**` | **B** | 검증·sanitization·작성자 검증·rate limit |
| `service/budget/**` | **B** | 무상태 일정 계산 |
| `controller/BudgetPlanController` | **B** | `POST /budget-plans` |
| `dto/review/**`, `dto/budget/**` | **B** | |
| `src/test/**/auth`, `**/place` | **A** | |
| `src/test/**/review`, `**/budget` | **B** | |
| Step 0 산출물 (2절) | **동결** | 양쪽 읽기 전용 |
| `application.yml`, `BudgeatsProperties`, `build.gradle` | **동결** | 8절 핸드오프 |
| `ApiResponse`, `GlobalExceptionHandler`, `WebConfig`, `ApiContractTest` | **동결** | 이미 동작 중. 건드릴 이유 없음 |

> `/places/:placeId` 는 구글 상세 + 자체 리뷰 요약을 함께 반환하므로 두 영역에 걸칩니다.
> **A가 소유**하고, 리뷰 요약은 `ReviewRepository`(Step 0에서 시그니처 동결)를 호출해 가져옵니다.

---

## 4. Agent A — 인증 · Places 연동

**한 줄 목표**: 로그인이 되고, 지도에 색이 칠해진 진짜 식당 핀 데이터가 내려간다.

담당 요구사항: FR-101~106, FR-201~206, FR-301~305 (조회 API 측면)

### Day 1 — OAuth 2.0 전 과정

가장 깨지기 쉬운 항목이라 첫날에 둡니다 (`development-plan.md` 1.1절 리스크 표).

- `GET /auth/google` — Google 인가 URL로 302. `state` 파라미터로 CSRF 방어
- `GET /auth/google/callback` — 코드 → 토큰 교환 → `google_sub`/`name` 추출 → 사용자 upsert → 세션 쿠키 설정 → `oauthSuccessRedirect` 로 302
- `POST /auth/logout` 🔒 — 세션 무효화 + 쿠키 만료
- `GET /auth/me` 🔒 — 6.2절 형식
- `@CurrentUser` 해석기 — 세션 없으면 **401 자동 반환**. B가 이 애노테이션만 붙이고 세션 코드를 한 줄도 쓰지 않게 만드는 것이 이 작업의 목적

**완료 기준**
- [ ] 브라우저에서 로그인 → `/auth/me` 가 사용자 반환
- [ ] 쿠키에 `HttpOnly`, `SameSite`, (`COOKIE_SECURE=true` 시) `Secure` 확인
- [ ] `document.cookie` 와 `localStorage` 에서 토큰이 보이지 않음 (FR-103 검증 기준)
- [ ] 미인증 상태로 `/auth/me` 호출 → 401 + 6절 에러 형식
- [ ] 액세스/리프레시 토큰이 **응답 바디에 없음**

### Day 2 — Places 격리 계층 + 조회 3종

- `service/places/PlacesClient` — `RestClient` 로 Places API (New) 호출. **필드 마스크 최소** (NFR-C1/C2)
  - `nearby`/`detail`: `id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel`
  - `search`: `id,displayName,formattedAddress` — 더 줄임 (리뷰 작성 팝업엔 평점 불필요)
  - **`reviews`, `photos` 필드 절대 요청 금지** — 상위 SKU 과금
- `GET /places/nearby` — 위 응답 + `PriceTierPolicy` 적용 → 6.3절 형식
- `GET /places/search` — 6.4절
- `GET /places/:placeId` — 6.5절
- 응답을 DB에 쓰는 코드 없음. `place_id` 외 전부 응답에 실어 보내고 버림 (CLAUDE.md 3.1절)

**완료 기준**
- [ ] `service/places` 밖에서 구글을 호출하는 코드가 없음 (grep 확인)
- [ ] Places 응답 필드를 저장하는 코드가 없음 — 캐시·엔티티·컬럼 모두 없음
- [ ] 필드 마스크에 `reviews`/`photos` 없음
- [ ] 자체 리뷰 N건 이상인 place는 `priceTierSource: "actual"` 로 내려감
- [ ] 구글 키가 응답·로그에 노출되지 않음

### Day 3 — 통합 · 운영 설정

- CORS·쿠키 운영 설정 점검 (와일드카드 없음, `COOKIE_SECURE=true` 강제는 이미 `ProductionSecretsValidator` 가 담당)
- **CLAUDE.md 6절 API 계약을 이 문서 6절 내용으로 동기화** (A 단독 작업 — 8절 참조)
- B와 통합 테스트

---

## 5. Agent B — 리뷰 · 예산

**한 줄 목표**: 리뷰를 쓰면 핀 색이 바뀌고, 예산을 넣으면 일정표가 나온다.

담당 요구사항: FR-401~411, FR-501~507, NFR-S3/S4/S6

### Day 1 — 리뷰 쓰기·읽기

- `dto/review/ReviewCreateRequest` — Bean Validation: `rating` `@Min(1) @Max(5)`, `pricePerPerson` `@Positive`, `content` `@NotBlank @Size(max=…)`
  - **`placeId` 외 구글 필드를 받는 필드를 만들지 마세요** (FR-403). 식당명·평점 파라미터가 있으면 계약 위반
  - `content` 최대 길이는 `BudgeatsProperties.reviewContentMaxLength` 에서 읽습니다 — 애노테이션에 `1000` 을 쓰지 마세요
- `POST /reviews` 🔒 — `@CurrentUser Long userId` 로 작성자 확보. `UNIQUE(user_id, place_id)` 위반 시 **409 CONFLICT** (프론트가 수정 모드로 전환하는 신호, FR-407)
- `GET /places/:placeId/reviews` — 최신순. **`isAnonymous=true` 면 `authorName` 을 응답에서 제외** (`null`). 프론트에서 숨기는 방식 금지 (SRS 6.3절)
- XSS: `content` 를 서버에서 sanitize. **새 의존성 없이** Spring 의 `HtmlUtils.htmlEscape` 사용 (7절)

**완료 기준**
- [ ] 리뷰 작성 → `GET /places/:placeId/reviews` 에 최신순으로 나옴
- [ ] 같은 식당 두 번째 작성 → 409
- [ ] `<script>` 포함 본문이 이스케이프되어 저장됨
- [ ] 익명 리뷰 응답에 `authorName` 이 없음 (JSON 자체에서 부재)
- [ ] 미인증 `POST /reviews` → 401

### Day 2 — 인가 · Rate Limit · 실측 평균

- `PATCH /reviews/:id` 🔒, `DELETE /reviews/:id` 🔒 — **서버에서 작성자 검증. 불일치 시 403** (NFR-S4)
  - 없는 id → 404, 남의 것 → 403. 두 코드를 구분하세요
- `POST /reviews` rate limit — 사용자별 시간당 `reviewRateLimitPerHour` 건. 초과 시 429
  - H2 file-backed 단일 인스턴스이므로 인메모리 카운터가 정답입니다. Redis를 넣지 마세요
  - `ponytail:` 주석으로 천장(다중 인스턴스 시 무효)을 남기세요
- `ReviewRepository` 의 Step 0 쿼리 3종 구현 (6.7절) — **A의 `/places/*` 가 이걸 호출합니다. 최우선.**

**완료 기준**
- [ ] 타인 리뷰 id로 `PATCH`/`DELETE` → 403 (SRS 부록 A 항목)
- [ ] 존재하지 않는 id → 404
- [ ] rate limit 초과 → 429 + 6절 에러 형식
- [ ] 리뷰 N건 도달 시 `/places/nearby` 의 `priceTier` 가 실측 기준으로 바뀜 (A와 함께 확인)

### Day 3 — 예산 일정 (무상태)

- `POST /budget-plans` — 6.6절 형식
  - 끼니당 예산 = `totalBudgetSgd ÷ (days × mealsPerDay)` (FR-502)
  - 끼니당 예산 → 목표 `PriceTier` → 해당 등급 식당 배정 (FR-503)
  - 후보 부족 시 `notice` 로 사유 안내 (FR-507)
- **`budget_plans` 엔티티·리포지토리·테이블을 만들지 마세요.** 계산해서 반환하고 끝입니다 (CLAUDE.md 4절)
- 후보 식당 조회는 A의 `/places/nearby` 서비스를 재사용합니다. 구글을 직접 호출하지 마세요

**완료 기준**
- [ ] 예산 입력 → 일자·끼니 단위 일정 반환
- [ ] 후보 부족 시 `notice` 채워짐
- [ ] `budget_plans` 관련 엔티티·테이블이 없음 (H2 콘솔/스키마 확인)

---

## 6. 동결된 API 계약

**두 에이전트는 이 스키마를 협상하지 않습니다.** 여기 적힌 필드명·타입 그대로 구현합니다.
공통 래퍼는 `{ "success": true, "data": … }` / `{ "success": false, "error": { "code", "message" } }` (CLAUDE.md 6절).
아래 예시는 **`data` 안쪽만** 보여줍니다.

- JSON은 **camelCase** (`frontend/CLAUDE.md` 가 `priceTier` 를 전제)
- 금액은 JSON number, 서버 내부는 `BigDecimal`
- 시각은 ISO-8601 UTC 문자열
- `priceTier`: `"low" | "mid" | "high"` (소문자 — `frontend/src/constants/price.ts` 와 일치해야 핀 색이 맞습니다)
- `priceTierSource`: `"actual" | "google" | "unknown"`

### 6.1 place 요약 객체 (공용)

`/places/nearby` 와 `/budget-plans` 가 같은 모양을 씁니다.

```json
{
  "placeId": "ChIJ...",
  "name": "Maxwell Food Centre",
  "address": "1 Kadayanallur St, Singapore",
  "rating": 4.3,
  "userRatingCount": 812,
  "lat": 1.2803,
  "lng": 103.8451,
  "priceTier": "low",
  "priceTierSource": "actual",
  "actualAvgPricePerPerson": 6.5,
  "ownReviewCount": 4
}
```

`priceTierSource` 가 `"actual"` 이 아니면 `actualAvgPricePerPerson` 은 `null`.

### 6.2 `GET /auth/me` 🔒

```json
{ "user": { "id": 1, "displayName": "지한" } }
```

`googleSub` 은 **응답에 넣지 않습니다** (내부 식별자).

### 6.3 `GET /places/nearby?lat=&lng=&radius=`

```json
{ "places": [ /* 6.1절 객체 배열 */ ] }
```

`radius` 생략 시 `placesNearbyDefaultRadiusM`. 정렬은 `rating` 내림차순 (FR-302).

### 6.4 `GET /places/search?query=`

```json
{ "places": [ { "placeId": "ChIJ...", "name": "…", "address": "…" } ] }
```

평점·좌표를 넣지 않습니다 — 리뷰 작성 팝업에 불필요하고 SKU가 올라갑니다.

### 6.5 `GET /places/:placeId`

6.1절 객체 + 자체 리뷰 요약:

```json
{
  "placeId": "ChIJ...", "name": "…", "address": "…",
  "rating": 4.3, "userRatingCount": 812,
  "lat": 1.2803, "lng": 103.8451,
  "priceTier": "low", "priceTierSource": "actual",
  "actualAvgPricePerPerson": 6.5, "ownReviewCount": 4,
  "ownRatingAverage": 4.2
}
```

### 6.6 리뷰

**`POST /reviews` 🔒 요청** — `placeId` 외 구글 데이터 필드 없음:

```json
{
  "placeId": "ChIJ...",
  "rating": 4,
  "pricePerPerson": 7.5,
  "content": "가성비 좋고 안 짜요",
  "tasteTags": ["안 짜요", "향신료 약함"],
  "studentTags": ["가성비", "혼밥 가능"],
  "visitType": "SOLO",
  "revisit": true,
  "isAnonymous": false
}
```

`PATCH /reviews/:id` 🔒 는 `placeId` 를 제외한 위 필드의 부분 집합을 받습니다.

**리뷰 객체 응답** (`GET /places/:placeId/reviews` 의 배열 원소, `POST`/`PATCH` 의 `review`):

```json
{
  "id": 12,
  "authorName": "지한",
  "isAnonymous": false,
  "rating": 4,
  "pricePerPerson": 7.5,
  "content": "…",
  "tasteTags": ["안 짜요"],
  "studentTags": ["가성비"],
  "visitType": "SOLO",
  "revisit": true,
  "createdAt": "2026-08-17T09:00:00Z",
  "updatedAt": "2026-08-17T09:00:00Z",
  "mine": true
}
```

- `isAnonymous: true` → `authorName` 은 `null`
- `mine` 은 UX용 편의 필드입니다. **인가는 서버가 합니다** — 프론트가 이 값을 보안 수단으로 쓰지 않는다는 전제 (frontend/CLAUDE.md)

**`POST` / `PATCH` / `DELETE` 응답** — 저장 후 갱신된 등급을 함께 내려 프론트가 핀을 다시 칠하게 합니다 (FR-411):

```json
{
  "review": { /* 위 객체, DELETE 시 없음 */ },
  "place": { "placeId": "ChIJ...", "priceTier": "mid", "priceTierSource": "actual",
             "actualAvgPricePerPerson": 9.2, "ownReviewCount": 5 }
}
```

**상태 코드**: 생성 201 / 수정·삭제 200 / 검증 실패 422 `INVALID_INPUT` / 미인증 401 `UNAUTHENTICATED` /
타인 리뷰 403 `FORBIDDEN` / 없는 id 404 `NOT_FOUND` / **중복 작성 409 `CONFLICT`** / rate limit 429 `RATE_LIMITED`

### 6.7 `POST /budget-plans`

요청:

```json
{ "totalBudgetSgd": 300, "days": 5, "mealsPerDay": 3, "lat": 1.2966, "lng": 103.7764, "radius": 1500 }
```

응답:

```json
{
  "perMealBudgetSgd": 20.0,
  "targetPriceTier": "high",
  "days": [
    { "day": 1, "meals": [ { "mealIndex": 1, "place": { /* 6.1절 객체 */ } } ] }
  ],
  "notice": "조건에 맞는 식당이 부족해 일부 끼니를 비워 두었습니다."
}
```

배정 실패한 끼니는 `"place": null`. 모두 배정되면 `notice` 는 `null`.

### 6.8 `ReviewRepository` 쿼리 시그니처 (Step 0 동결 — A/B seam)

**A가 이 세 개를 호출합니다. B가 구현합니다. 시그니처를 바꾸면 A가 깨집니다.**

```java
// place 여러 개의 실측 통계를 한 번에 (N+1 방지 — /places/nearby 가 place 20개를 받습니다)
List<PlacePriceStats> findPriceStatsByPlaceIdIn(Collection<String> placeIds);

// place 하나의 실측 통계 + 자체 평점 평균 (/places/:placeId)
Optional<PlaceReviewSummary> findReviewSummaryByPlaceId(String placeId);

// 목록 조회 (최신순)
List<Review> findByPlaceIdOrderByCreatedAtDesc(String placeId);
```

```java
// core/PlacePriceStats.java — Step 0 동결
public record PlacePriceStats(String placeId, long reviewCount, BigDecimal avgPricePerPerson) {}

// core/PlaceReviewSummary.java — Step 0 동결
public record PlaceReviewSummary(long reviewCount, BigDecimal avgPricePerPerson, BigDecimal avgRating) {}
```

> `findPriceStatsByPlaceIdIn` 이 **핀 20개에 쿼리 1번**을 보장합니다. place별로 반복 호출하면
> NFR-P2(2초)를 지도 이동마다 놓칩니다. B는 이걸 Day 2 최우선으로 구현하세요 — A가 막힙니다.

---

## 7. 새 의존성을 추가하지 않는 이유

`build.gradle` 은 양쪽이 건드리면 충돌하는 파일이고, 새 의존성은 CI 취약점 스캔 대상도 늘립니다.
현재 의존성으로 다음이 전부 됩니다.

| 필요 | 새 라이브러리 대신 | 근거 |
|---|---|---|
| Google OAuth2 코드 교환 | `RestClient` (starter-web 에 포함) | `spring-boot-starter-oauth2-client` 는 Spring Security 를 끌고 와 전 엔드포인트 인증 설정과 싸워야 합니다. 3일 일정에서 수동 플로우(약 60줄)가 더 빠르고 쿠키 제어도 직접 됩니다 |
| `id_token` 에서 `sub`/`name` 추출 | `Base64` 디코드 (JDK) | 토큰을 **우리 서버가 `oauth2.googleapis.com` 에 클라이언트 시크릿으로 직접 교환해 TLS로 받은 응답**이므로 서명 검증 없이 신뢰할 수 있습니다. ⚠️ **단, 클라이언트가 보낸 `id_token` 을 받는 코드를 만든다면 서명 검증이 필수입니다** — 그 경로를 만들지 마세요 |
| Places API 호출 | `RestClient` | 위와 동일 |
| XSS sanitization | `HtmlUtils.htmlEscape` (spring-web) | 리뷰 본문은 평문입니다. 서식 있는 HTML을 허용할 계획이 없으므로 이스케이프로 충분하고, sanitizer 라이브러리는 과합니다 |
| Rate limiting | `ConcurrentHashMap` 인메모리 | H2 file-backed 단일 인스턴스입니다. Redis·Bucket4j 를 넣을 이유가 없습니다 |

정말 필요해지면 8절 절차로 한 명이 단독 추가하고 상대에게 알립니다.

---

## 8. 충돌 방지 규칙

### 8.1 작업 공간

두 에이전트를 **같은 워킹 디렉토리에서 돌리지 마세요.** 서로의 미저장 변경을 덮어씁니다.

```bash
git worktree add ../budgeats-agent-a -b feature/SGF-XX-auth-places develop
git worktree add ../budgeats-agent-b -b feature/SGF-YY-reviews-budget develop
```

- 브랜치는 `develop` 에서 각각 분기. 서로의 브랜치를 rebase 하지 않습니다
- 하루 저녁에 `develop` 으로 통합 (`development-plan.md` 5.3절)
- `main`/`develop` 직접 push 금지

### 8.2 동결 파일 핸드오프

`application.yml`, `BudgeatsProperties`, `build.gradle`, Step 0 산출물을 수정해야 하면:

1. 상대 에이전트 작업을 멈추고, 사람(BE 담당자)에게 이유와 diff를 보고
2. **한 명이 단독으로** 수정 → `develop` 에 즉시 머지
3. 양쪽이 `develop` 를 pull 한 뒤 재개

> 이 절차가 번거롭게 느껴지도록 일부러 만들었습니다. 동결 파일을 자주 고치고 있다면
> 분업선이 잘못 그어진 것이고, 그건 규칙보다 먼저 고쳐야 합니다.

### 8.3 문서 갱신

CLAUDE.md 6절(API 계약)은 **한 파일**이므로 양쪽이 동시에 쓰면 반드시 충돌합니다.

- 개발 중에는 **아무도 CLAUDE.md 를 수정하지 않습니다.** 이 문서 6절이 임시 계약서입니다
- Day 3에 **Agent A가 단독으로** 이 문서 6절 → CLAUDE.md 6절로 동기화 (커밋 1개, `docs:` 타입)

### 8.4 테스트 파일

`ApiContractTest` 는 이미 통과하고 있습니다. **양쪽 모두 이 파일에 추가하지 마세요.**
A는 `AuthContractTest`/`PlaceContractTest`, B는 `ReviewContractTest`/`BudgetPlanTest` 를 새로 만듭니다.

### 8.5 커밋

Jira 키로 시작 (CLAUDE.md 7절). 에이전트별로 다른 이슈 키를 씁니다.

```
SGF-21 feat: Google OAuth2 로그인 및 세션 쿠키 구현
SGF-25 feat: 자체 리뷰 작성·조회 API 구현
```

---

## 9. 3일로 압축하며 버리는 것

`development-plan.md` 6.2절의 축소 순서를 **미리 적용**합니다. Day 3에 판단할 시간이 없습니다.

| 항목 | 원 요구사항 | 3일 대응 |
|---|---|---|
| 카테고리 연속 회피 | FR-504 | **미구현.** 단순 등급 매칭만 |
| 일정 항목 개별 교체 | FR-506 | **미구현.** 프론트가 `POST /budget-plans` 재호출 |
| 사이드바 등급 필터 | FR-306 (Should) | **미구현.** 프론트 클라이언트 필터로 대체 |
| 위경도 30일 캐싱 | CON-2 (허용사항) | **캐시 안 함.** 캐시는 허용일 뿐 의무가 아니고, 안 만드는 쪽이 정책 위반 여지가 0입니다 |

**절대 축소하지 않는 것** — 기능이 아니라 전제 조건입니다:

- NFR-S 전체: 작성자 검증(403), 입력 검증, HttpOnly 쿠키, rate limit, CORS 단일 오리진
- NFR-L 전체: `place_id` 외 저장 금지, 필드 마스크 최소화, 스크래핑 금지

---

## 10. 통합 체크포인트

에이전트를 풀어놓고 방치하면 3일째 저녁에 안 맞는 걸 발견합니다. 하루 두 번 확인합니다.

| 시점 | 확인 | 실패 시 |
|---|---|---|
| Day 1 저녁 | 양쪽 `develop` 머지 → `./gradlew clean test bootJar` 통과 | Step 0 동결 위반 여부부터 확인 |
| Day 2 점심 | **A→B seam**: `/places/nearby` 가 실측 기준 `priceTier` 를 내리는가 | 6.8절 시그니처 불일치 확인 |
| Day 2 저녁 | 로그인 → 리뷰 작성 → 핀 색상 갱신 한 흐름 | 서비스 핵심 루프. 여기서 막히면 예산 일정보다 먼저 고칩니다 |
| Day 3 오전 | SRS 부록 A 인수 기준 백엔드 항목 전체 | |
| Day 3 오후 | 기능 동결. 버그 수정만 | |

**백엔드 최종 확인** (SRS 부록 A 발췌):

- [ ] 타 사용자 리뷰를 API로 직접 수정·삭제 → 403
- [ ] DB에 식당명·주소·평점 컬럼이 없음
- [ ] `budget_plans` 테이블이 없음
- [ ] 리뷰 N건 이상 식당이 실측 평균 기준 색상으로 내려감
- [ ] 같은 식당 두 번째 리뷰 → 409
- [ ] CI (gitleaks · test · bootJar) 통과
