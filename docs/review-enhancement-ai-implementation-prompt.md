# BudgEats SG 리뷰 기능 확장 Backend 구현 프롬프트 (역할 A / B 분업)

> 이 문서는 Backend 작업만 다룬다. Frontend 작업은 범위에서 제외한다.
>
> 두 AI 에이전트가 역할 A(인증·자격·CAPTCHA 쓰기 게이트)와 역할 B(가격 정책·리뷰 데이터 확장·내 리뷰 조회)로 나눠 병렬 작업한다.
> 각 에이전트에게는 "공통 사항" 전체 + 자신의 역할 섹션만 전달한다.
>
> 저장소 기준 경로: C:\Users\user\Documents\GitHub\budgeats-sg
>
> 작성 기준일: 2026-08-20

---

## 공통 사항 (역할 A, B 모두 준수)

### 역할

당신은 BudgEats SG 모노레포의 Backend를 수정하는 구현 에이전트다. 목표는 기존 리뷰·인증·Places 흐름을 보존하면서 아래 추가 요구사항을 최소한의 변경으로 끝까지 구현하고 검증하는 것이다. 설계 문서나 예시를 현재 동작의 증거로 취급하지 말고, 반드시 현재 브랜치의 실제 코드·설정·테스트를 먼저 확인한다.

불확실한 내용을 임의로 지어내지 않는다. 코드로 확인되지 않으면 확실하지 않음이라고 표시하고, 제품 결정이 반드시 필요한 경우에만 구현 전 질문한다.

### 반드시 먼저 읽을 파일

1. CLAUDE.md
2. backend/CLAUDE.md
3. docs/SRS.md
4. docs/backend-agent-plan.md
5. docs/backend-code-process-and-entities.md
6. 이번 작업과 관련된 실제 Backend 소스와 테스트

작업 전 git status를 확인하고 다른 에이전트(또는 사용자)의 기존 변경을 보존한다. 관련 없는 파일과 .claude/settings.local.json은 수정하거나 삭제하지 않는다.

### 구현 원칙

- 새 추상화, factory, 다중 공급자 구조를 미리 만들지 않는다.
- Google Places 응답 중 placeId 외 값은 DB에 저장하지 않는다.
- Google 리뷰 텍스트는 조회·저장·표시하지 않는다.
- 학교 계정 판정, CAPTCHA, 입력 검증, 작성자 인가는 Backend에서 강제한다. Frontend 표시만으로 끝내지 않는다.
- CAPTCHA 실패는 리뷰 저장을 차단한다.
- 리뷰 저장 후 Google Places 보강 조회 실패는 기존 동작대로 리뷰 저장 성공을 막지 않는다.
- 기존 사용자별 리뷰 작성 rate limit을 유지한다.
- CAPTCHA 토큰, OAuth 토큰, 이메일, API 비밀키를 로그에 남기지 않는다.
- 시크릿은 환경변수로만 관리하고 실제 .env 값을 커밋하지 않는다.
- API가 바뀌면 CLAUDE.md의 API 계약과 docs/SRS.md를 함께 갱신한다.
- 구현 후 Backend 테스트·빌드를 모두 실행한다.

### 현재 코드에서 확인된 기준선

구현 전에 아래 사실을 현재 코드에서 다시 검증한다.

**이미 구현된 기능**

- 자체 리뷰 생성·조회·수정·삭제
- 동일 사용자·동일 식당 리뷰 1건 제한
- 작성자 본인만 수정·삭제 가능
- 리뷰 본문 검증과 HTML escape
- 허용 태그 목록 검증
- 사용자별 리뷰 생성 rate limit
- 리뷰 생성 시 서버가 createdAt과 updatedAt을 Instant로 기록
- 장소별 리뷰 최신순 조회
- 리뷰가 없을 때 reviews 빈 배열 반환
- Google 리뷰가 아닌 BudgEats 자체 리뷰만 저장·반환
- GET /api/v1/places/{placeId} 장소 상세
- GET /api/v1/places/{placeId}/reviews 장소별 자체 리뷰
- 리뷰 저장 후 가격 등급과 리뷰 수 갱신
- Google Places 상세 보강 실패가 리뷰 저장 성공을 막지 않는 회귀 처리

**현재 부족한 기능 (Backend 관련)**

- 학교 계정 리뷰 작성 자격
- CAPTCHA
- 무료 물·서비스 차지·세금
- 로그인 사용자 본인의 리뷰 목록
- 가격 정책 조회 API

### 제품 기본 결정

별도 사용자 지시가 없으면 아래 결정을 사용한다.

**가격 등급**

현재 Backend 설정을 단일 원본으로 사용한다.

- 저가: lowMaxInclusive 이하
- 중가: lowMaxInclusive 초과, midMaxInclusive 이하
- 고가: midMaxInclusive 초과
- 현재 기본값은 8 / 15 SGD

**학교 계정**

일반 Google 로그인은 허용하지만, 검증된 학교 계정만 리뷰를 생성·수정할 수 있다.

- POST /reviews: 학교 자격 필요
- PATCH /reviews/{id}: 학교 자격과 기존 소유권 모두 필요
- DELETE /reviews/{id}: 기존 소유권만 필요
- GET /me/reviews: 로그인 필요

허용 학교는 환경설정의 도메인과 schoolCode 매핑으로 관리한다. 전체 이메일은 DB에 저장하지 않는다.

Google Workspace 조직 계정은 검증된 ID Token의 hd claim으로 판정한다. 로그인 요청의 hd 파라미터나 이메일 suffix 검사는 보안 판정으로 사용하지 않는다.

학교가 Google Workspace를 사용하지 않아 hd claim이 없다면 임의의 email suffix fallback을 구현하지 말고 사용자에게 별도 학교 이메일 인증 정책이 필요하다고 보고한다.

참고:

- Google OpenID Connect: https://developers.google.com/identity/openid-connect/reference
- Google ID Token 검증: https://developers.google.com/identity/openid-connect/openid-connect

**CAPTCHA**

Cloudflare Turnstile을 기본 공급자로 사용하고 별도의 범용 CAPTCHA interface나 factory는 만들지 않는다.

- Backend는 secret key로 Siteverify를 호출한다.
- 신규 POST /reviews에만 적용한다.
- PATCH와 DELETE에는 CAPTCHA를 요구하지 않는다.
- success, action, hostname을 확인한다.
- timeout과 공급자 장애는 fail-closed로 처리하고 리뷰를 저장하지 않는다.

참고:

- Turnstile 서버 검증: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

**신규 리뷰 정보**

데이터는 의미가 분명한 3상태 필드로 관리한다.

- freeWater: true / false / null
- serviceCharge: true / false / null
- taxCharge: true / false / null
- null은 모름 또는 미응답을 뜻한다.

taxCharge는 최종 결제에 세금이 부과되는지라는 의미로 구현한다. 표시 가격에 이미 포함되어 있는지를 뜻해야 한다는 별도 지시가 오면 필드명과 문구를 먼저 다시 확정한다.

학교는 사용자가 자유 입력하거나 선택하는 리뷰 태그가 아니라, 검증된 로그인 계정에서 파생한 schoolCode로 취급한다.

- User에 nullable schoolCode를 저장한다.
- 기존 사용자는 null이며 재로그인 전까지 리뷰 작성 자격이 없다.
- 로그인할 때 기존 사용자도 schoolCode를 갱신한다.
- 익명 공개 리뷰에는 schoolCode를 노출하지 않는다.
- 내 리뷰 화면에는 자신의 schoolCode를 표시할 수 있다.

### 목표 API 계약

공통 성공·실패 envelope은 기존 형식을 유지한다.

**가격 정책 — GET /api/v1/meta/price-tiers** (역할 B)

응답 data:

~~~json
{
  "currency": "SGD",
  "lowMaxInclusive": 8,
  "midMaxInclusive": 15,
  "actualMinReviews": 3
}
~~~

값은 BudgeatsProperties에서 읽고 Controller에 숫자를 하드코딩하지 않는다.

**현재 사용자 — GET /api/v1/auth/me** (역할 A)

응답 data:

~~~json
{
  "user": {
    "id": 1,
    "displayName": "지한",
    "reviewEligible": true,
    "school": "NUS"
  }
}
~~~

- email과 googleSub는 반환하지 않는다.
- school은 자격이 없으면 null이다.

**리뷰 생성 — POST /api/v1/reviews** (역할 A + 역할 B 공동, 아래 "파일 소유·협업 규칙" 참고)

기존 필드에 아래 필드를 추가한다.

~~~json
{
  "freeWater": true,
  "serviceCharge": false,
  "taxCharge": null,
  "captchaToken": "opaque-single-use-token"
}
~~~

- freeWater / serviceCharge / taxCharge는 역할 B가 추가한다.
- captchaToken은 역할 A가 추가하며, 생성 요청 전용으로 저장·응답하지 않는다.

권장 오류 (역할 A):

- 403 SCHOOL_ACCOUNT_REQUIRED
- 422 CAPTCHA_INVALID
- 503 CAPTCHA_UNAVAILABLE

현재 GlobalExceptionHandler가 상태별 일반 코드만 반환한다면 필요한 최소 범위에서 도메인 오류 코드를 표현한다. 전체 오류 시스템을 재설계하지 않는다.

**내 리뷰 — GET /api/v1/me/reviews** (역할 B)

- 로그인 사용자만 접근 가능
- 임의의 userId 파라미터를 받지 않음
- 최신순
- Review 응답에 placeId 포함
- 결과가 없으면 reviews 빈 배열

응답 data:

~~~json
{
  "reviews": [
    {
      "id": 12,
      "placeId": "ChIJ...",
      "rating": 4,
      "pricePerPerson": 7.5,
      "content": "가성비가 좋습니다.",
      "tasteTags": [],
      "studentTags": [],
      "freeWater": true,
      "serviceCharge": false,
      "taxCharge": null,
      "visitType": "SOLO",
      "revisit": true,
      "isAnonymous": false,
      "createdAt": "2026-08-20T01:00:00Z",
      "updatedAt": "2026-08-20T01:00:00Z",
      "mine": true
    }
  ]
}
~~~

식당명·주소는 리뷰 테이블에 저장하지 않는다.

---

## 파일 소유·협업 규칙

두 역할이 겹치지 않는 파일에서 대부분 작업하지만, 리뷰 생성 계약(POST /reviews)이 두 역할의 요구사항을 함께 담기 때문에 일부 파일은 공유된다.

**역할 A 전담 파일**

- AuthService (ID Token 검증)
- User 엔티티의 schoolCode 필드·갱신 메서드
- AuthMeResponse / 관련 매핑
- CAPTCHA(Turnstile) 검증 클래스, 관련 설정
- ProductionSecretsValidator
- 학교 자격 검사 로직 (ReviewService 내 별도 메서드로 분리 권장)

**역할 B 전담 파일**

- ReviewRepository (사용자별 최신순 조회 추가)
- ReviewService 내 내 리뷰 조회 메서드
- GET /me/reviews 컨트롤러 메서드
- GET /meta/price-tiers 컨트롤러·서비스
- Review 엔티티의 freeWater / serviceCharge / taxCharge 필드

**공유 파일 (양쪽 모두 수정, additive하게만 변경)**

- ReviewCreateRequest: A는 captchaToken, B는 freeWater/serviceCharge/taxCharge를 각자 추가한다. 서로의 필드를 삭제하지 않는다.
- ReviewUpdateRequest: B는 freeWater/serviceCharge/taxCharge를 추가한다. A는 captchaToken이 여기에 섞이지 않도록 확인만 한다(수정 요청 전용 DTO이므로 A의 변경은 없음).
- ReviewResponse: B가 freeWater/serviceCharge/taxCharge + placeId를 추가한다.
- ReviewController: A는 POST /reviews에 학교 자격·CAPTCHA 검사를 추가하고, B는 GET /meta/price-tiers, GET /me/reviews 메서드를 새로 추가한다. 서로 다른 메서드이므로 충돌 가능성은 낮다.
- ReviewService.createReview: 처리 순서는 인증과 학교 자격(A) → 저비용 rate limit(기존) → CAPTCHA(A) → 신규 필드 매핑(B) → 리뷰 저장 순으로 맞춘다. A가 가드 절을 메서드 상단에 추가하고, B는 엔티티 매핑 부분만 건드리는 방식으로 병합 충돌을 줄인다.
- GlobalExceptionHandler: A만 새 오류 코드(SCHOOL_ACCOUNT_REQUIRED, CAPTCHA_INVALID, CAPTCHA_UNAVAILABLE)를 추가한다. B는 이 파일을 수정하지 않는다.
- BudgeatsProperties / .env.example: A는 허용 학교 도메인 매핑과 Turnstile site/secret key를 추가한다. B는 기존 가격 정책 설정값을 그대로 읽기만 하며 이 파일을 수정하지 않는다(이미 8/15 SGD, N=3 값이 존재).

**병합 순서 권장**: 두 역할은 병렬로 작업하되, 먼저 완료되는 쪽이 브랜치를 통합 브랜치에 먼저 병합한다. 나중에 병합하는 역할은 병합 전 최신 상태를 받아 위 공유 파일에서 상대방이 추가한 필드/메서드를 지우지 않았는지 확인한다. 최종적으로 한쪽(또는 별도 통합 단계)이 ReviewCreateRequest, ReviewResponse, ReviewController, ReviewService.createReview를 한 번에 열어 순서와 필드 누락을 검증한다.

---

## 역할 A: 인증 검증·학교 자격·CAPTCHA (리뷰 쓰기 경로 게이트)

### A-1. OAuth 검증과 학교 자격

현재 AuthService가 ID Token payload만 Base64 decode하는지 확인한다. 그렇다면 학교 claim을 사용하기 전에 다음 검증을 구현한다.

- Google 서명
- issuer
- audience가 현재 OAuth client ID와 일치
- expiration
- email_verified
- hd allowlist

JWT 서명 검증을 직접 구현하지 말고 검증된 라이브러리를 사용한다. 기존 수동 OAuth 흐름 전체를 불필요하게 교체하지 말고, 현재 흐름에 안전한 ID Token verifier를 최소 범위로 추가한다.

필요 변경:

- BudgeatsProperties와 환경변수 예제에 허용 학교 매핑 추가
- User.schoolCode nullable 필드와 갱신 메서드
- 로그인 때 신규·기존 사용자 모두 schoolCode 갱신
- AuthMeResponse에 reviewEligible과 school 추가
- 리뷰 생성·수정 서버 자격 검사 (ReviewService에 별도 가드 메서드로 추가해 B의 신규 필드 매핑과 겹치지 않게 함)
- 기존 사용자와 기존 세션 처리 정책 테스트

실제 학교 도메인은 코드나 .env.example에 시크릿처럼 임의로 만들지 않는다. 환경변수 형식과 테스트용 값만 제공한다.

### A-2. CAPTCHA

- Turnstile Siteverify 호출 클래스 하나 추가
- site key와 secret key 설정 추가
- ProductionSecretsValidator가 운영 secret 누락을 차단하도록 갱신
- CAPTCHA 검증은 DB write transaction 전에 끝냄
- 처리 순서: 인증과 학교 자격 → 저비용 rate limit → CAPTCHA → 리뷰 저장
- 토큰 누락·실패·만료·재사용·timeout 시 저장하지 않음
- 토큰이나 secret을 로그에 출력하지 않음
- 테스트에서는 실제 외부 요청을 하지 않고 verifier를 대체

### A 필수 테스트

- ID Token 서명·issuer·audience·expiration 검증
- 허용 hd, 비허용 hd, 누락 hd
- email_verified가 false인 계정
- 학교 미인증 사용자의 POST/PATCH 거부
- 학교 자격을 잃은 작성자의 본인 DELETE 허용
- 기존 사용자의 schoolCode 갱신
- CAPTCHA 누락·실패·만료·재사용·timeout
- CAPTCHA 실패 시 리뷰 DB row가 생성되지 않음
- 정상 CAPTCHA 작성 201 (freeWater 등 B의 필드는 null 허용 상태로만 검증하고, 필드 자체의 정합성 테스트는 역할 B 담당)
- 기존 타인 수정·삭제 403 회귀

### A 완료 조건

- 학교 자격과 CAPTCHA를 Backend가 강제함
- CAPTCHA 토큰이 저장·응답되지 않음
- 실제 외부 Google OAuth·Turnstile을 검증하지 않았다면 완료 보고에서 EXTERNAL_UNVERIFIED로 명시함

---

## 역할 B: 가격 정책 조회·신규 리뷰 데이터·내 리뷰 조회

### B-1. 가격 정책 조회

- BudgeatsProperties 값을 반환하는 public metadata endpoint 추가 (GET /api/v1/meta/price-tiers)
- currency는 SGD
- 현재 PriceTierPolicy의 inclusive 경계와 정확히 일치
- actualMinReviews도 함께 반환
- 설정값을 바꾼 테스트에서 응답도 바뀌는지 검증

### B-2. 신규 리뷰 정보

- Review에 nullable Boolean 필드 세 개(freeWater, serviceCharge, taxCharge) 추가
- 생성·수정 DTO, entity update, 응답 매핑에 추가 (ReviewCreateRequest/ReviewUpdateRequest/ReviewResponse는 A의 captchaToken 필드를 삭제하지 않도록 주의)
- 기존 row의 null은 unknown으로 유지하고 무리한 backfill을 하지 않음
- 기존 tasteTags와 studentTags는 삭제하지 않음
- 현재 H2 file DB에서 nullable 컬럼 추가가 정상 동작하는지 검증
- 새 migration framework는 이 변경만을 위해 추가하지 않음

### B-3. 내 리뷰 조회

- ReviewRepository에 사용자별 최신순 조회 추가
- ReviewService에 current user 전용 목록 추가
- GET /api/v1/me/reviews 추가
- ReviewResponse에 placeId 추가
- 익명 리뷰도 작성자의 내 리뷰 목록에는 포함
- 다른 사용자 정보가 섞이지 않도록 계약 테스트 추가

### B 필수 테스트

- 가격 metadata가 설정값을 반환
- 신규 3상태 필드 생성·부분 수정·기존 null row
- createdAt은 서버 생성, 수정 후에도 변경되지 않음
- GET /me/reviews 미로그인 401
- 본인 리뷰만 최신순, placeId 포함, 빈 배열
- Google Places 보강 실패에도 201과 리뷰 저장 유지 (회귀)
- 중복 리뷰 409와 rate limit 회귀

### B 완료 조건

- 내 리뷰 API가 현재 사용자 이외의 데이터를 노출하지 않음
- 가격 등급이 Google priceLevel fallback일 수 있으므로 실제 가격 보장처럼 표현하지 않음
- 신규 3상태 필드가 null(모름)을 기본으로 안전하게 처리함

---

## 통합 단계 (양쪽 역할 완료 후)

1. 공유 파일(ReviewCreateRequest, ReviewUpdateRequest, ReviewResponse, ReviewController, ReviewService.createReview)을 열어 두 역할의 변경이 모두 남아 있는지 확인한다.
2. ReviewService.createReview의 처리 순서가 인증/학교 자격 → rate limit → CAPTCHA → 신규 필드 매핑 → 저장 순서를 지키는지 확인한다.
3. CLAUDE.md의 API 계약과 docs/SRS.md를 최종 계약 기준으로 갱신한다.
4. 전체 Backend 테스트를 재실행한다.

---

## 실행할 검증 명령

PowerShell 기준:

~~~powershell
cd backend
.\gradlew.bat test bootJar
~~~

네트워크 제한으로 Gradle 배포나 의존성 다운로드가 실패하면 애플리케이션 실패와 구분해 보고하고, 필요한 권한으로 동일 명령을 다시 실행한다.

2026-08-20 기준 확인된 기존 테스트 기준선: Backend 44 tests, 0 failures/errors. 이 수치는 현재 상태 기준이며 구현 후 실제 결과를 다시 보고해야 한다.

---

## 최종 보고 형식 (역할 A, B 각자 보고)

1. 구현 결과
2. 변경된 API 계약
3. 변경 파일
4. 테스트·빌드 결과
5. 실제 외부 연동 검증 여부
6. 남은 불확실성 또는 운영 설정
7. 공유 파일에서 다른 역할의 변경과 충돌한 부분이 있었다면 별도로 명시

컴파일 성공을 통합 테스트 성공으로 표현하지 말고, 실행하지 못한 검증은 실행한 것처럼 말하지 않는다.
