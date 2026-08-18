# 프론트엔드 병렬 작업 계획 — Agent 2대

**프로젝트**: BudgEats SG
**대상**: 프론트엔드 개발 AI 에이전트 2대 (Agent A / Agent B)
**기간**: 3일 (초단기 — 원 계획 5일에서 압축)
**작성일**: 2026-08-17

> 요구사항은 [SRS.md](SRS.md), 구현 규칙은 [CLAUDE.md](../CLAUDE.md)와 [frontend/CLAUDE.md](../frontend/CLAUDE.md)가 원본입니다.
> **API 응답 스키마는 [backend-agent-plan.md 6절](backend-agent-plan.md)이 원본입니다** — 이 문서에 복제하지 않습니다.
> 이 문서는 **두 에이전트가 서로를 기다리지도, 같은 파일을 덮어쓰지도 않게 하는 분업 규칙**만 정의합니다.
> 이 문서와 CLAUDE.md가 충돌하면 CLAUDE.md가 우선합니다.

---

## 1. 이 문서가 해결하는 문제

프론트엔드는 백엔드보다 파일 충돌이 잘 납니다. 화면 하나를 여럿이 만들기 때문에
`App.tsx`·`index.css` 같은 **단일 진입점**을 양쪽이 동시에 건드리게 됩니다.

| 실패 모드 | 원인 | 이 문서의 대응 |
|---|---|---|
| 같은 파일을 양쪽이 수정 | 소유권이 없음 | 3절 **파일 소유권 표** — 교집합 0 |
| 레이아웃 셸·전역 CSS 충돌 | 진입점이 하나 | 2절에서 슬롯·카드 룩을 먼저 확정하고 동결 |
| 목 데이터가 실제 응답과 안 맞음 | 계약을 눈대중으로 씀 | 6절 — 백엔드 문서 6절 스키마를 **그대로** 사용 |
| 리뷰 저장 후 핀 색이 안 바뀜 | 두 레인이 만나는 지점이 정의 안 됨 | 2절 `onPlaceUpdated` seam 동결 |

**원칙**: Step 0(직렬, 30분)에 공유 지점을 만들고 동결한다. 그 뒤 두 에이전트는 **서로의 파일을 읽기만** 한다.

---

## 2. Step 0 — 공유 seam 구축 (직렬, 에이전트 투입 전)

### 이미 완료된 것 (develop에 있음)

| 파일 | 상태 |
|---|---|
| `api/client.ts` | `apiFetch` — 쿠키 전송·`{success,data}` 언래핑·`ApiError` 변환 |
| `constants/price.ts` | `PriceTier` = `low`/`mid`/`high` + 색상·라벨 |
| `constants/map.ts` | 좌표·줌·디바운스 환경변수 파싱 |
| `components/MapView.*` | 지도 렌더링 + Google attribution 확보 |
| `index.css` | 전역 토큰·리셋·`.overlay-card`·`.overlay-top-left` |

### Step 0에서 만들 것

| 파일 | 내용 | 왜 Step 0인가 |
|---|---|---|
| `api/types.ts` | 백엔드 문서 6절 응답 타입 (`PlaceSummary`, `ReviewItem`, `AuthUser`, `BudgetPlan`, `PlaceGradePatch`) | A는 핀·사이드바에, B는 예산 일정과 리뷰 응답에 **같은 `PlaceSummary`** 를 씁니다 |
| `App.tsx` 슬롯 확정 | 아래 슬롯만 두고 로직 없음 | 양쪽이 컴포넌트를 꽂을 자리를 먼저 정해야 이 파일을 다시 안 엽니다 |

```tsx
// App.tsx — Step 0 이후 동결. 각 에이전트는 자기 슬롯에 컴포넌트 1개만 꽂는다.
<div className="app">
  <MapView />                    {/* A */}
  <div className="overlay-top-left">
    <header className="overlay-card brand">…</header>
    <PriceTierLegend />          {/* A */}
  </div>
  {/* 슬롯: 오른쪽 위 — 추천 사이드바 (A) */}
  {/* 슬롯: 오른쪽 위 헤더 — 로그인 버튼 (B) */}
  {/* 슬롯: 오른쪽 아래 — (+) 리뷰 작성 버튼 (B) */}
  {/* 슬롯: 모달 — 장소 검색·리뷰 폼·예산 일정 (B) */}
</div>
```

### 동결 seam — 리뷰 저장 → 핀 색상 갱신

백엔드 계약상 `POST`/`PATCH`/`DELETE /reviews` 응답에 **갱신된 `place` 등급이 함께 옵니다**
(backend-agent-plan.md 6.6절). 그러므로 **핀을 다시 칠하려고 `/places/nearby`를 재호출하지 않습니다.**
불필요한 Places 호출은 그대로 과금입니다 (CLAUDE.md 3.3절).

```ts
// api/types.ts — 시그니처 동결. 바꾸면 양쪽이 깨진다.
export type PlaceGradePatch = Pick<
  PlaceSummary,
  'placeId' | 'priceTier' | 'priceTierSource' | 'actualAvgPricePerPerson' | 'ownReviewCount'
>;
```

- **B**: 리뷰 저장·삭제 성공 시 응답의 `place`를 `onPlaceUpdated(patch)`로 올려보냅니다. 지도 상태를 직접 건드리지 않습니다.
- **A**: `onPlaceUpdated`를 구현해 **해당 핀 하나만** 갱신합니다.
- 배선은 `App.tsx`에서 A가 합니다.

### Step 0에서 하지 않는 것

- **의존성 추가 금지.** 현재 3개로 전부 됩니다 (7절 참조).
- **라우터 도입 금지.** MVP는 단일 화면입니다. 모달은 상태로 처리합니다.
- 상태관리 라이브러리를 넣지 않습니다. `useState` + props로 충분한 규모입니다.
- `api/client.ts`를 손대지 않습니다. `apiFetch` 시그니처가 바뀌면 양쪽이 전부 깨집니다.

---

## 3. 파일 소유권 (교집합 0)

**자기 소유가 아닌 파일은 읽기만 합니다.** 수정이 필요하면 8절 핸드오프.

| 경로 | 소유 | 비고 |
|---|---|---|
| `components/MapView.*` | **A** | 이미 존재 |
| `components/PinMarker.*` | **A** | `AdvancedMarker` — Map ID 필요 |
| `components/PriceTierLegend.*` | **A** | 이미 존재 |
| `components/Sidebar.*` | **A** | 추천 리스트 |
| `api/places.ts` | **A** | `/places/nearby` |
| `hooks/useDebounce.ts`, `useNearbyPlaces.ts`, `useCurrentPosition.ts` | **A** | |
| `constants/map.ts` | **A** | 이미 존재 |
| `components/LoginButton.*` | **B** | |
| `components/ReviewFab.*` | **B** | (+) 플로팅 버튼 |
| `components/PlaceSearchDialog.*` | **B** | `/places/search` — Autocomplete 위젯 금지 |
| `components/ReviewForm.*`, `ReviewList.*` | **B** | |
| `components/BudgetPlanForm.*`, `BudgetPlanTable.*` | **B** | |
| `components/BudgetPlanButton.*` | **B** | 예산 일정 진입 버튼. Step 0 슬롯 표에 전용 자리가 없어 Day 3에 추가, `App.tsx`/`index.css`의 `overlay-bottom-right`에 `ReviewFab`과 함께 배치 (핸드오프 기록) |
| `api/auth.ts`, `api/reviews.ts`, `api/budgetPlans.ts` | **B** | |
| `api/placeSearch.ts` | **B** | `/places/search`. `api/places.ts`(A)는 `/places/nearby` 전용이라 별도 파일로 분리 (Day 1 작업 중 누락 발견, FE-B가 문서 관리자 권한으로 추가) |
| `hooks/useAuth.ts` | **B** | A는 쓰지 않습니다 |
| `constants/review.ts` | **B** | 태그 항목 (CLAUDE.md 11절 확정 후) |
| `api/client.ts`, `api/types.ts`, `constants/price.ts` | **동결** | 양쪽 읽기 전용 |
| `App.tsx`, `index.css` | **동결** | Step 0 이후. 8절 핸드오프 |
| `package.json`, `vite.config.ts`, `eslint.config.js`, `.env.example`, `vite-env.d.ts` | **동결** | 8절 핸드오프 |

> 컴포넌트 스타일은 **`components/<Name>.css`** 에 두고 해당 컴포넌트에서 import합니다.
> `index.css`에 기능별 스타일을 쌓지 마세요 — 여기가 프론트엔드 최대 충돌 지점입니다.
> 지도 위 카드는 전역 `.overlay-card`를 함께 붙여 재사용합니다.

---

## 4. Agent A — 지도 · 핀 · 사이드바

**한 줄 목표**: 지도에 색이 칠해진 진짜 식당 핀이 뜨고, 사이드바에서 고르면 그 핀으로 이동한다.

### Day 1 — 핀 렌더링 + 디바운스

- `api/places.ts` — `fetchNearbyPlaces({ lat, lng, radius, signal })` → 백엔드 6.3절
- `hooks/useDebounce` — `MAP_DEFAULTS.debounceMs` 사용. 숫자를 컴포넌트에 쓰지 마세요
- `hooks/useNearbyPlaces` — 지도 중심 변경 시 조회. **이전 요청은 `AbortController`로 취소**
- `components/PinMarker` — `AdvancedMarker` + `PRICE_TIER_COLOR[priceTier]`
- `MapView`에 `dragend`·`zoom_changed` 핸들러 연결 (디바운스 경유)

> `AdvancedMarker`는 **Map ID**를 요구합니다. `VITE_GOOGLE_MAPS_MAP_ID`가 `.env.example`에
> 준비돼 있으니, Google Cloud Console에서 Vector Map ID를 발급해 `.env.local`에 넣으세요.

**완료 기준**
- [ ] 지도 드래그 1회당 `/places/nearby` 호출이 **1건** (네트워크 탭 확인)
- [ ] 핀이 등급별 3색으로 구분됨
- [ ] 빠르게 여러 번 드래그해도 이전 요청이 취소되고 마지막 응답만 반영됨
- [ ] Google attribution(왼쪽 아래)이 핀·오버레이에 가려지지 않음
- [ ] 목 → 실제 API 전환 시 컴포넌트 코드 변경이 없음 (`api/places.ts`만 바뀜)

### Day 2 — 추천 사이드바

- `components/Sidebar` — 백엔드가 `rating` 내림차순으로 이미 정렬해 내려줍니다 (FR-302). **프론트에서 다시 정렬하지 마세요**
- `hooks/useCurrentPosition` — Geolocation. **거부·실패 시 `MAP_DEFAULTS.center`로 폴백**하고 거리 표시를 생략
- 현재 위치 기준 거리 계산 (직선거리로 충분. 경로 API를 호출하지 마세요 — 과금)
- 항목 클릭 → 지도 해당 핀으로 이동 + 핀 강조
- `onPlaceUpdated` 구현 (2절 seam)

**완료 기준**
- [ ] 사이드바 항목 클릭 시 지도가 해당 핀으로 이동
- [ ] 위치 권한을 거부해도 화면이 깨지지 않음
- [ ] 구글에서 온 식당명·주소·평점을 **저장하지 않음** (localStorage·IndexedDB 없음)
- [ ] 색상만으로 등급을 구분하지 않음 (라벨 병기 — SRS NFR-U2)

### Day 3 — 상태 처리 · 반응형 · 통합

- 로딩 / 에러 / 빈 상태 (조건에 맞는 식당 0건)
- 모바일 뷰포트 대응 (밀리면 6.2절 순서대로 버립니다)
- B와 통합 — `onPlaceUpdated` 실제 배선 검증

---

## 5. Agent B — 인증 UI · 리뷰 · 예산

**한 줄 목표**: 로그인해서 리뷰를 쓰면 핀 색이 바뀌고, 예산을 넣으면 일정표가 나온다.

### Day 1 — 인증 UI + 리뷰 작성

- `api/auth.ts` — `getMe()`, `logout()`
- `hooks/useAuth` — `GET /auth/me` 응답으로 로그인 여부 판단. **토큰을 클라이언트에 들지 않습니다**
- `components/LoginButton` — 로그인 시작은 `/auth/google`로 **브라우저를 이동**시킵니다 (`fetch` 아님 — 302 리다이렉트라 XHR로는 안 됩니다)
- `components/ReviewFab` — 미로그인 시 로그인 유도
- `components/PlaceSearchDialog` — `GET /places/search`. **Places Autocomplete 위젯 직접 사용 금지**
- `components/ReviewForm` — 백엔드 6.6절 요청 형식. **`placeId` 외 구글 데이터를 전송하지 마세요**

**완료 기준**
- [ ] `localStorage` / `sessionStorage`에 아무것도 저장되지 않음 (CI 린트가 잡지만 직접 확인)
- [ ] 리뷰 작성 요청 페이로드에 식당명·주소·평점이 없음 — `placeId`만
- [ ] 미로그인 상태로 (+) 클릭 → 로그인 유도

### Day 2 — 리뷰 목록 · 수정 · 삭제

- `constants/review.ts` — 태그 항목. CLAUDE.md 11절 미확정 항목이므로 **확정 후** 작성
- `components/ReviewList` — `GET /places/:placeId/reviews`
- 응답의 `mine` 필드로 수정·삭제 버튼 노출. **이건 UX일 뿐이고 인가는 서버가 합니다**
- 상태 코드별 처리: `409 CONFLICT` → **수정 모드로 전환** / `422` → 필드 에러 / `429` → 재시도 안내 / `403` → 권한 없음
- 저장·삭제 성공 시 `onPlaceUpdated(response.place)` 호출 (2절 seam)

**완료 기준**
- [ ] 같은 식당에 두 번째 리뷰 시도 → 409를 받아 수정 모드로 전환
- [ ] `isAnonymous: true` 리뷰는 작성자명이 표시되지 않음 (`authorName`이 `null`)
- [ ] 리뷰 저장 후 핀 색상이 갱신됨 — **`/places/nearby` 재호출 없이**

### Day 3 — 예산 일정

- `api/budgetPlans.ts` — `POST /budget-plans` (백엔드 6.7절)
- `components/BudgetPlanForm` — 총예산·기간·끼니수 입력
- `components/BudgetPlanTable` — 일정표. `place: null`인 끼니는 빈 칸으로, `notice`를 그대로 표시
- **일정 저장·조회 UI를 만들지 마세요.** `POST /budget-plans`는 무상태 계산 API입니다 (CLAUDE.md 4절)

**완료 기준**
- [ ] 예산 입력 → 일정표 생성
- [ ] 식당 부족 시 `notice` 문구가 사용자에게 보임
- [ ] 일정을 저장하는 코드·UI가 없음

---

## 6. 백엔드 계약 사용 규칙

**스키마 원본은 [backend-agent-plan.md 6절](backend-agent-plan.md)입니다.** 여기에 복제하지 않습니다 —
두 곳에 적으면 반드시 어긋납니다. 프론트가 지킬 것만 적습니다.

- JSON은 **camelCase**. 금액은 number, 시각은 ISO-8601 UTC 문자열
- `priceTier`는 **소문자** `"low" | "mid" | "high"` — `constants/price.ts`와 일치합니다
- `visitType`은 **대문자** `"SOLO" | "FRIENDS" | "GROUP" | "OTHER"` — 대소문자가 섞이는 지점이니 주의
- `priceTierSource`가 `"actual"`이 아니면 `actualAvgPricePerPerson`은 `null`
- 백엔드가 아직 없는 동안은 **계약 형식 그대로의 목**을 `api/*.ts` 안에서만 반환합니다.
  컴포넌트는 목인지 실제인지 몰라야 하고, 전환 시 `api/*.ts`만 바뀌어야 합니다
- 계약이 실제와 다르면 **직접 고치지 말고** 문서 관리자(FE-B, development-plan.md 2절)를 경유합니다

---

## 7. 새 의존성을 추가하지 않는 이유

현재 런타임 의존성은 `react`, `react-dom`, `@vis.gl/react-google-maps` 셋뿐입니다.

- CI에서 `npm audit --audit-level=moderate`가 돌아 **moderate 취약점 하나로 빌드가 멈춥니다**
- `package.json`·`package-lock.json`은 양쪽이 건드리면 충돌하고, lock 충돌은 해결 비용이 큽니다
- 라우터·상태관리·폼·UI 킷은 이 규모(단일 화면, 컴포넌트 10개 내외)에 필요하지 않습니다

정말 필요해지면 8절 핸드오프를 따릅니다.

---

## 8. 충돌 방지 규칙

### 8.1 작업 공간

두 에이전트를 **같은 워킹 디렉토리에서 돌리지 마세요.** 서로의 미저장 변경을 덮어씁니다.

```bash
git worktree add ../budgeats-fe-a -b feature/SGF-XX-map-pins-sidebar develop
git worktree add ../budgeats-fe-b -b feature/SGF-YY-auth-review-budget develop
```

각 워크트리에서 `npm install`과 `.env.local` 복사를 따로 해야 합니다
(`node_modules`와 `.env.local`은 커밋되지 않으므로 공유되지 않습니다).

- 브랜치는 `develop`에서 각각 분기. 서로의 브랜치를 rebase 하지 않습니다
- 하루 저녁에 `develop`으로 통합 (development-plan.md 5.3절)
- `main`/`develop` 직접 push 금지

### 8.2 동결 파일 핸드오프

`App.tsx`, `index.css`, `api/client.ts`, `api/types.ts`, `package.json`, `.env.example`,
`vite-env.d.ts`를 수정해야 하면:

1. 상대 에이전트 작업을 멈추고, 사람(FE 담당자)에게 이유와 diff를 보고
2. **한 명이 단독으로** 수정 → `develop`에 즉시 머지
3. 양쪽이 `develop`을 pull한 뒤 재개

환경변수를 추가할 때는 `.env.example`과 `vite-env.d.ts`를 **함께** 고치고,
상대는 자기 `.env.local`을 직접 갱신해야 한다는 것을 알립니다.

> 이 절차가 번거롭게 느껴지도록 일부러 만들었습니다. 동결 파일을 자주 고치고 있다면
> 분업선이 잘못 그어진 것이고, 그건 규칙보다 먼저 고쳐야 합니다.

### 8.3 문서 갱신

개발 중에는 **아무도 `CLAUDE.md`를 수정하지 않습니다.** 백엔드 문서 8.3절과 같은 규칙입니다.
프론트 쪽 계약 관련 갱신이 필요하면 이 문서에 적고, Day 3에 문서 관리자가 한 번에 동기화합니다.

### 8.4 테스트 파일

각자 자기 소유 파일 옆에 테스트를 둡니다. **상대의 테스트 파일에 추가하지 마세요.**
현재 `api/client.test.ts`와 `constants/map.test.ts`는 통과 중이며 A/B 모두 건드릴 이유가 없습니다.

> 컴포넌트 테스트를 도입하려면 `jsdom`과 testing-library가 필요합니다 — 의존성 추가이므로
> 8.2 핸드오프 대상입니다. 3일 일정에서는 로직(훅·API 레이어) 테스트만 두는 편을 권합니다.

### 8.5 커밋

Jira 키로 시작 (CLAUDE.md 7절). 에이전트별로 다른 이슈 키를 씁니다.

```
SGF-31 feat: 가격대별 핀 색상 및 지도 이동 디바운스 적용
SGF-35 feat: 자체 리뷰 작성 폼 및 장소 검색 팝업
```

키를 모르면 임의로 만들지 말고 사람에게 확인하세요.

---

## 9. 3일로 압축하며 버리는 것

일정이 밀리면 development-plan.md 6.2절 순서를 따릅니다.

1. 사이드바 가격 등급 필터 (FR-306, Should)
2. 예산 일정 개별 항목 교체 (FR-506) → 재생성으로 대체
3. 모바일 반응형 → 데스크톱 데모로 한정

**절대 축소하지 않는 것**: 보안 요구사항(NFR-S)과 정책 준수(NFR-L).
구체적으로 — 토큰을 브라우저 저장소에 두지 않는 것, Places를 프론트에서 직접 호출하지 않는 것,
Google attribution을 가리지 않는 것, 구글 데이터를 캐싱하지 않는 것. 이 넷은 기능이 아니라 전제입니다.

---

## 10. 통합 체크포인트

| 시점 | 확인 |
|---|---|
| 매일 저녁 | `develop` 통합 후 지도·핀·리뷰·예산이 한 화면에서 동시에 동작 |
| Day 2 저녁 | `onPlaceUpdated` 배선 — B가 리뷰를 저장하면 A의 핀 색이 바뀌는지 |
| Day 3 | 로그인 → 검색 → 리뷰 작성 → 핀 갱신 → 예산 일정까지 한 흐름으로 수동 검증 |
| Day 3 | frontend/CLAUDE.md PR 전 체크리스트 전 항목 |
