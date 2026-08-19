# BudgEats SG 리뷰 기능 확장 Frontend 구현 프롬프트

> 이 문서는 Frontend 작업만 다룬다. Backend 작업은
> [review-enhancement-ai-implementation-prompt.md](review-enhancement-ai-implementation-prompt.md) (역할 A / B 분업) 문서를 따른다.
>
> 이 문서는 Backend 역할 A, B가 구현한(또는 구현할) API 계약을 그대로 소비하는 입장이다.
> Backend API 계약이 실제 코드와 다르면 CLAUDE.md와 docs/SRS.md의 최신 계약을 우선한다.
>
> 저장소 기준 경로: C:\Users\user\Documents\GitHub\budgeats-sg
>
> 작성 기준일: 2026-08-20

## 역할

당신은 BudgEats SG 모노레포의 Frontend를 수정하는 구현 에이전트다.

목표는 기존 리뷰·인증·Places 흐름을 보존하면서 아래 추가 요구사항을 최소한의 변경으로 끝까지 구현하고 검증하는 것이다. 설계 문서나 예시를 현재 동작의 증거로 취급하지 말고, 반드시 현재 브랜치의 실제 코드·설정·테스트를 먼저 확인한다.

불확실한 내용을 임의로 지어내지 않는다. 코드로 확인되지 않으면 확실하지 않음이라고 표시하고, 제품 결정이 반드시 필요한 경우에만 구현 전 질문한다.

## 반드시 먼저 읽을 파일

다음 순서로 읽고 현재 코드와 문서가 다른 경우 현재 코드를 우선 증거로 삼는다.

1. CLAUDE.md
2. frontend/CLAUDE.md
3. docs/SRS.md
4. docs/frontend-agent-plan.md
5. docs/review-enhancement-ai-implementation-prompt.md (Backend가 실제로 제공하는/제공할 API 계약 확인용)
6. 이번 작업과 관련된 실제 Frontend 소스와 테스트

작업 전 git status를 확인하고 사용자의 기존 변경을 보존한다. 관련 없는 파일과 .claude/settings.local.json은 수정하거나 삭제하지 않는다.

## 구현 원칙

- 새 추상화, router, 날짜 라이브러리, 모달 라이브러리를 미리 만들지 않는다.
- 기존 apiFetch, ReviewList, ReviewForm, PlaceSummary, PlaceQueryService, ReviewService, CurrentUser 흐름을 재사용한다.
- Google Places API를 Frontend에서 직접 호출하지 않는다. 항상 Backend를 경유한다.
- Google 리뷰 텍스트는 조회·저장·표시하지 않는다.
- 학교 계정 판정, CAPTCHA 검증, 작성자 인가는 화면 표시만으로 끝내지 않는다. Backend가 강제하는 것을 전제로 UI는 안내·차단만 담당한다.
- CAPTCHA 토큰, OAuth 토큰, 이메일을 로그(console 포함)에 남기지 않는다.
- 시크릿(예: Turnstile secret key)은 Frontend에 두지 않는다. Frontend는 공개 site key만 사용한다.
- API가 바뀌면 CLAUDE.md의 API 계약과 docs/SRS.md를 함께 갱신한다.
- 구현 후 Frontend 테스트·lint·빌드를 모두 실행한다.

## 현재 코드에서 확인된 기준선

구현 전에 아래 사실을 현재 코드에서 다시 검증한다.

### 이미 구현된 기능

- 자체 리뷰 생성·조회·수정·삭제 UI
- 장소 검색 → 리뷰 작성 팝업 흐름
- 지도 핀 가격대 색상 표시
- Google OAuth2 로그인 버튼

### 현재 부족한 기능

- 가격 범례에 SGD 범위 표시
- ReviewList의 createdAt 표시
- 리뷰 삭제 전 확인
- 추천 목록과 지도 마커가 여는 공용 식당·리뷰 팝업
- 학교 계정 리뷰 작성 자격 UI
- CAPTCHA 위젯
- 무료 물·서비스 차지·세금 입력 UI
- 로그인 사용자 본인의 리뷰 목록 화면

### 구현 전 함께 바로잡을 계약 불일치

Backend PlaceSummary의 rating, lat, lng는 nullable 타입인데 Frontend는 필수 number로 가정한다. 공용 팝업을 연결하기 전에 계약을 일치시킨다.

- 좌표가 없는 장소는 지도 핀 후보에서 제외한다 (Backend가 non-null을 보장하지 않는 한).
- 평점이 null일 수 있다면 Frontend 타입을 nullable로 바꾸고 평점 없음으로 표시한다.
- null 값에 toFixed를 바로 호출하지 않는다.

## 제품 기본 결정

별도 사용자 지시가 없으면 아래 결정을 사용한다. 값 자체는 Backend가 소유하며, Frontend는 API로 조회해 사용한다.

### 가격 등급

- 저가 / 중가 / 고가 경계값은 GET /meta/price-tiers 응답을 사용한다.
- 현재 기본값은 8 / 15 SGD지만 Frontend에 하드코딩하지 않는다.
- 가격 등급이 Google priceLevel fallback일 수 있으므로 실제 가격 보장처럼 표현하지 않는다.

### 공용 팝업

같은 팝업 상단에 식당 기본 정보를, 본문에 BudgEats 자체 리뷰만 표시한다.

- 식당명
- 주소
- Google 평점 또는 평점 없음
- 가격 등급과 SGD 범위
- 가격 산정 출처: 자체 리뷰 실측 / Google 추정 / 정보 부족
- 자체 리뷰 수
- BudgEats 자체 리뷰 목록

Google 리뷰 텍스트는 표시하지 않는다.

새 복합 Backend API를 기대하지 않는다.

- 지도·추천 목록에서 선택: 이미 가진 PlaceSummary + GET /places/{placeId}/reviews
- 리뷰 작성 검색에서 선택: 필요할 때만 GET /places/{placeId} + GET /places/{placeId}/reviews

리뷰 API 오류와 빈 배열을 구분한다.

### 학교 계정

- GET /auth/me 응답의 reviewEligible, school 값을 그대로 신뢰한다.
- reviewEligible이 false면 작성 폼 대신 학교 계정 안내를 표시한다.
- 학교는 사용자가 수정할 수 없는 검증된 계정 정보로 표시한다.

### CAPTCHA

Cloudflare Turnstile을 기본 공급자로 사용하고 별도의 범용 CAPTCHA interface나 wrapper 라이브러리는 만들지 않는다.

- Frontend는 공개 site key만 사용한다.
- 신규 POST /reviews에만 적용한다.
- PATCH와 DELETE에는 CAPTCHA 위젯을 붙이지 않는다.
- 토큰은 일회용이며 만료되므로 모든 제출 시도(성공·실패 모두) 후 위젯을 reset한다.

참고:

- Turnstile 서버 검증: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

### 신규 리뷰 정보

화면에서는 태그처럼 표시하되 데이터는 의미가 분명한 3상태 필드로 다룬다.

- freeWater: 있음 / 없음 / 모름
- serviceCharge: 있음 / 없음 / 모름
- taxCharge: 있음 / 없음 / 모름
- 모름은 null로 전송한다.

taxCharge는 최종 결제에 세금이 부과되는지를 뜻한다. 표시 가격에 이미 포함되어 있는지를 뜻해야 한다는 별도 지시가 오면 문구를 먼저 다시 확정한다.

## 참고: Backend API 계약 (소비 전용)

아래는 Frontend가 호출하는 Backend 계약 요약이다. 실제 스펙과 오류 코드는 [review-enhancement-ai-implementation-prompt.md](review-enhancement-ai-implementation-prompt.md)와 CLAUDE.md를 최신 기준으로 삼는다.

- GET /api/v1/meta/price-tiers → `{ currency, lowMaxInclusive, midMaxInclusive, actualMinReviews }`
- GET /api/v1/auth/me → `{ user: { id, displayName, reviewEligible, school } }`
- POST /api/v1/reviews → 기존 필드 + `freeWater`, `serviceCharge`, `taxCharge`, `captchaToken`
  - captchaToken은 생성 요청 전용이며 저장·응답에는 없다.
  - 오류: 403 SCHOOL_ACCOUNT_REQUIRED / 422 CAPTCHA_INVALID / 503 CAPTCHA_UNAVAILABLE
- PATCH /api/v1/reviews/{id} → captchaToken 없이 freeWater/serviceCharge/taxCharge만 부분 수정 가능
- GET /api/v1/me/reviews → 로그인 필요, 최신순, placeId 포함, 빈 배열 가능

## Frontend 구현 작업

### 1. 공용 선택 상태와 팝업

- App이 selectedPlace를 소유
- Sidebar 클릭과 PinMarker 클릭이 같은 onSelectPlace를 호출
- Sidebar 클릭은 지도 focus와 팝업 열기를 모두 수행
- MapView 내부 선택 상태와 App 선택 상태가 어긋나지 않게 단일 흐름으로 정리
- ReviewFab 내부 place-review-panel을 PlaceReviewDialog로 추출
- ReviewFab의 장소 검색 결과도 같은 팝업을 사용
- 팝업 닫기, Escape, 명확한 dialog label과 focus 처리를 유지

### 2. 팝업 상태

- loading
- error와 재시도
- reviews 빈 배열
- reviews 목록

reviews가 null인지 비교하지 않는다. reviews.length가 0인지 확인한다.

### 3. 가격 범례

- GET /meta/price-tiers API 함수와 타입 추가
- 앱 시작 시 한 번 조회
- 저가, 중가, 고가의 정확한 범위 표시
- 자체 리뷰 실측과 Google fallback의 차이를 짧게 안내
- metadata 조회 실패 시 기존 등급명은 유지하고 범위만 일시적으로 표시하지 않음

### 4. 리뷰 날짜와 삭제

- createdAt을 Intl.DateTimeFormat으로 표시
- 기본 timezone은 Asia/Singapore
- updatedAt이 createdAt과 다르면 수정됨 표시
- 클라이언트 날짜 입력 필드는 추가하지 않음
- 삭제 전에 window.confirm 사용
- 취소하면 DELETE 요청을 보내지 않음

### 5. 학교 자격과 CAPTCHA

- AuthUser에 reviewEligible과 school 추가
- LoginButton과 ReviewFab이 서로 다른 useAuth 상태를 갖지 않도록 인증 상태를 한 곳에서 공유
- reviewEligible이 false면 작성 폼 대신 학교 계정 안내
- Turnstile widget을 직접 연결하고 불필요한 React wrapper dependency는 추가하지 않음
- CAPTCHA가 완료되기 전 제출 버튼 비활성화
- 모든 제출 성공·실패 후 widget reset
- CAPTCHA 전용 오류 메시지 표시

### 6. 신규 정보 입력

무료 물, 서비스 차지, 세금은 각각 다음 세 상태를 선택할 수 있게 한다.

- 있음
- 없음
- 모름

기존 태그 UI와 어울리는 segmented chip 또는 radio UI를 사용한다. 상호 모순 상태를 동시에 선택할 수 없게 한다.

학교는 사용자가 수정할 수 없는 검증된 계정 정보로 표시한다.

### 7. 내 리뷰 화면

- 로그인 UI에 내 리뷰 버튼 추가
- 새 router 없이 MyReviewsDialog로 구현
- GET /me/reviews 호출
- loading, error, empty 상태 분리
- 각 리뷰에 날짜, 평점, 가격, 본문 요약 표시
- 현재 PlaceSummary와 매칭되면 식당명 표시
- 매칭되지 않으면 항목 클릭 때만 장소 상세 조회
- 목록을 열 때 모든 리뷰에 대해 Places 상세를 N번 호출하지 않는다
- 항목 클릭 시 같은 PlaceReviewDialog 열기

## 구현 순서

1. 현재 코드·계약·테스트 재검증 (Backend 문서의 최신 계약 확인)
2. CLAUDE.md와 SRS API 계약 갱신 (Backend 변경분 반영)
3. 공용 팝업, 날짜 표시, 삭제 확인, 빈 상태
4. 가격 metadata 연동과 범례
5. 학교 자격 UI (Backend GET /auth/me 반영 완료 후)
6. CAPTCHA 위젯 연결 (Backend CAPTCHA 검증 완료 후)
7. 신규 리뷰 정보 입력 UI
8. 내 리뷰 화면
9. 전체 회귀 테스트와 문서 정합성 확인

Backend와 병렬 작업할 경우 먼저 API 타입과 소유 파일을 합의한다. api/types.ts, Review 관련 타입처럼 Backend DTO 변경에 영향받는 파일은 Backend 쪽 계약이 확정된 뒤 마지막에 통합한다.

## 필수 Frontend 검증

- 지도 마커와 추천 목록이 같은 PlaceReviewDialog를 연다.
- 추천 목록 클릭 시 지도 focus와 팝업 열기가 함께 동작한다.
- reviews 빈 배열과 API 오류가 다른 UI로 표시된다.
- createdAt이 Singapore 시간으로 표시된다.
- 삭제 취소 시 DELETE가 호출되지 않는다.
- 삭제 확인 시 DELETE가 한 번만 호출된다.
- 비학교 계정은 작성 UI가 차단된다.
- CAPTCHA 토큰이 생성 요청에만 포함된다.
- CAPTCHA 실패 후 widget이 reset된다.
- 서버 가격 경계로 범례 문구를 만든다.
- 내 리뷰 목록에 다른 사용자의 리뷰가 섞이지 않는다.
- rating null 상태에서 화면이 깨지지 않는다.

새 테스트 프레임워크는 먼저 추가하지 않는다. 기존 Vitest를 최대한 재사용하고, 필요한 UI 동작은 실제 브라우저 smoke test로 보완한다.

## 실행할 검증 명령

PowerShell 기준:

~~~powershell
cd frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
~~~

네트워크 제한으로 의존성 다운로드가 실패하면 애플리케이션 실패와 구분해 보고하고, 필요한 권한으로 동일 명령을 다시 실행한다.

2026-08-20 기준 확인된 기존 테스트 기준선: Frontend 41 tests passed. 이 수치는 현재 상태 기준이며 구현 후 실제 결과를 다시 보고해야 한다.

## 완료 조건

아래 조건을 모두 충족해야 완료다.

- 모든 요구사항이 실제 화면에서 API와 연결됨
- 지도 마커·추천 목록·리뷰 작성 검색이 같은 팝업을 재사용함
- 빈 리뷰가 오류로 보이지 않고, 오류가 빈 리뷰로 숨겨지지 않음
- 리뷰 작성일이 화면에 Singapore 시간 기준으로 표시됨
- 학교 자격이 없는 사용자에게 작성 UI가 노출되지 않음
- CAPTCHA 완료 전 제출이 불가능함
- CLAUDE.md, SRS, Frontend 타입이 Backend DTO와 일치함
- Frontend test, lint, build 성공
- 실제 외부 Google OAuth·Turnstile을 검증하지 않았다면 완료 보고에서 EXTERNAL_UNVERIFIED로 명시함

## 최종 보고 형식

구현을 마치면 다음 순서로 간결하게 보고한다.

1. 구현 결과
2. 소비한 Backend API 계약과 실제 확인된 차이
3. 변경 파일
4. 테스트·빌드 결과
5. 실제 외부 연동 검증 여부
6. 남은 불확실성 또는 운영 설정

컴파일 성공을 통합 테스트 성공으로 표현하지 말고, 실행하지 못한 검증은 실행한 것처럼 말하지 않는다.
