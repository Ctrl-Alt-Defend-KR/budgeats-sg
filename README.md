# BudgEats SG

싱가포르로 해외 연수를 온 **한국 학생**을 위한 예산 기반 식당 추천 서비스.

지도 위 핀 색상만 보고 "여기 내 예산에 맞나?"를 바로 판단할 수 있게 만드는 것이 목표입니다.
구글 평점만으로는 알 수 없는 **실제 1인당 지출액**, **한국인 입맛 적합도**, **혼밥 가능 여부**를
학생들이 직접 남긴 리뷰로 축적합니다.

- 개발 기간: 5일 스프린트 (4인)
- 방법론: SecDevOps
- 대상 지역: 싱가포르 (대학가 · 유학생 밀집 지역 우선)

---

## 핵심 기능 (MVP)

| # | 기능 | 설명 |
|---|---|---|
| 1 | 지도 + 식당 핀 | Google Map 위에 주변 식당을 핀으로 표시 |
| 2 | 가격대별 핀 색상 | 🟢 저가(~8 SGD) / 🟡 중가(8~15) / 🔴 고가(15~) |
| 3 | Google 로그인 | OAuth 2.0, 세션은 HttpOnly 쿠키 |
| 4 | 추천 사이드바 | 구글 평점 기반 리스트 + 현재 위치 기준 거리 |
| 5 | 자체 리뷰 작성 | (+) 버튼 → 장소 검색 → 가격·태그·평점 입력 |
| 6 | 예산 일정 생성 | 총예산 ÷ (기간 × 끼니수) 로 끼니별 식당 자동 배정 |

> **v2 범위 (지금 구현하지 않음)**: 즐겨찾기, 리뷰 신고, 일정 저장/공유, 학교별 필터, 구글 리뷰 텍스트 분석

---

## 아키텍처

```
[Browser]
   │
   ├─ Frontend (React + Vite)  :5173
   │     └─ Google Maps JavaScript API  ← 지도 렌더링 전용
   │
   └─ Backend (Spring Boot)    :8000
         ├─ Google Places API  ← 서버에서만 호출 (키 보호)
         ├─ H2 (file-backed)   ← 사용자 / 자체 리뷰만 저장
         ├─ Google OAuth 2.0
         └─ 예산 일정 계산     ← 무상태, 저장하지 않음
```

**핵심 원칙**: Places API는 **반드시 백엔드를 경유**합니다.
프론트엔드에 노출되는 키는 리퍼러 제한이 걸린 지도 렌더링용 키 하나뿐입니다.

### 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Vitest, Google Maps JavaScript API |
| Backend | Java 21, Spring Boot, Gradle, Spring Data JPA, JUnit 5, MockMvc |
| DB | H2 (file-backed, 사용자·자체 리뷰만 저장) |
| 인증 | Google OAuth 2.0 (HttpOnly 세션 쿠키) |
| CI/CD | GitHub Actions (gitleaks, Java test/build, npm audit) |
| 이슈 관리 | Jira (`SGF-XX`) |

---

## 저장소 구조

```
budgeats-sg/
├── CLAUDE.md               # 프로젝트 계약서 (개요·규칙·데이터 모델·API 스펙)
├── README.md
├── .gitignore
├── .github/
│   ├── CODEOWNERS          # 경로별 리뷰 자동 라우팅
│   └── workflows/
│       ├── security.yml    # gitleaks 시크릿 스캔
│       └── ci.yml          # lint · typecheck · test · build · 취약점 스캔
├── docs/
│   ├── SRS.md              # 소프트웨어 요구사항 명세
│   └── development-plan.md # 5일 스프린트 개발 계획
├── frontend/
│   ├── CLAUDE.md           # 프론트엔드 전용 지침
│   ├── eslint.config.js    # CLAUDE.md 보안 규칙이 린트로 강제됨
│   ├── src/
│   │   ├── api/            # 백엔드 통신 레이어 (여기서만 fetch 허용)
│   │   └── constants/      # 가격 등급 색상·라벨
│   └── .env.example
└── backend/
    ├── CLAUDE.md           # 백엔드 전용 지침
    ├── build.gradle
    ├── settings.gradle
    ├── gradle/wrapper/
    ├── gradlew / gradlew.bat
    ├── src/
    │   ├── main/java/      # Spring Boot 애플리케이션
    │   ├── main/resources/ # application.yml
    │   └── test/java/      # JUnit 5 · MockMvc 테스트
    └── .env.example
```

> 모노레포지만 두 앱은 **별도 서버로 배포**됩니다. 서로 코드를 import하지 않으며,
> 유일한 연결 지점은 [CLAUDE.md 6절 API 계약](CLAUDE.md)입니다.

---

## 사전 준비

- Node.js 20+
- Java 21
- Google Cloud 프로젝트 (아래 API 활성화)

### Google Cloud 설정

1. **API 활성화**: Maps JavaScript API, Places API (New)
2. **API 키 2개를 분리 발급** — 하나로 돌려쓰지 마세요.

| 키 | 사용처 | 제한 설정 |
|---|---|---|
| 지도용 | `frontend/.env.local` | HTTP 리퍼러 제한 + **Maps JavaScript API만** 허용 |
| Places용 | `backend/.env` | IP 제한 + **Places API만** 허용. 절대 프론트로 내보내지 않음 |

3. **OAuth 2.0 클라이언트 ID 생성**
   - 승인된 리디렉션 URI: `http://localhost:8000/api/v1/auth/google/callback`

---

## 실행 방법

### 1. 저장소 클론

```bash
git clone <repository-url>
cd budgeats-sg
```

### 2. 데이터베이스

별도 설치 없이 Spring Boot가 file-backed H2를 사용합니다. H2에는 `users`, `reviews`만 저장하며,
예산 일정은 요청마다 계산해 반환하고 저장하지 않습니다.

### 3. Backend

```bash
cd backend
cp .env.example .env
./gradlew bootRun       # Windows: .\gradlew.bat bootRun
```

- API 서버: http://localhost:8000
- 헬스체크: http://localhost:8000/api/v1/health
- H2 기본 URL: `jdbc:h2:file:./data/budgeats;DB_CLOSE_ON_EXIT=FALSE`

> 현재 Java 골격에는 헬스체크·설정·공통 응답/예외·CORS만 구현되어 있습니다.
> `users`, `reviews` 엔티티와 인증·Places 연동은 다음 수직 슬라이스에서 추가합니다.

`SESSION_SECRET` 생성:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env.local    # VITE_GOOGLE_MAPS_API_KEY 채우기
npm install
npm run dev
```

- 웹: http://localhost:5173

---

## 환경변수

각 앱의 `.env.example`에 전체 목록과 설명이 있습니다.

| 파일 | 적용 방식 | 주의 |
|---|---|---|
| `frontend/.env.example` | `.env.local` | `VITE_` 값은 **브라우저 번들에 그대로 노출**됩니다. 시크릿 금지 |
| `backend/.env.example` | `.env` | Spring Boot가 로컬 `.env`를 읽습니다. Places 키·OAuth 시크릿 커밋 금지 |

**로컬 환경 파일은 `.gitignore`에 포함되어 있으며, CI에서 gitleaks가 시크릿 유출을 검사합니다.**

---

## 개발 명령어

PR을 열기 전에 아래를 로컬에서 통과시키면 CI에서 되돌아올 일이 줄어듭니다.

**Frontend** (`cd frontend`)

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run lint` | ESLint. `src/api` 밖 `fetch`, `localStorage` 사용을 차단 |
| `npm run typecheck` | 타입 검사 |
| `npm test` | Vitest |
| `npm run build` | 타입 검사 + 프로덕션 빌드 |

**Backend** (`cd backend`)

| 명령 | 설명 |
|---|---|
| `./gradlew bootRun` | 개발 서버 (Windows: `.\gradlew.bat bootRun`) |
| `./gradlew test` | JUnit 5 · MockMvc 테스트 |
| `./gradlew bootJar` | 실행 JAR 빌드 |
| `./gradlew check` | 전체 검증 |

---

## 개발 컨벤션

### 브랜치

```
main       ← 배포 (Day 5)
 └ develop ← 통합 (매일 저녁)
    ├ feature/SGF-XX-설명
    └ fix/SGF-XX-설명
```

`main`, `develop` 직접 push 금지. 머지 조건은 **CI 통과 + 리뷰어 1명 승인**입니다.

### 커밋 메시지

```
SGF-12 feat: 가격대별 핀 색상 적용
SGF-15 fix: 리뷰 중복 작성 검증 누락 수정
```

- 반드시 Jira 이슈 키로 시작 (Jira 자동 연동)
- 타입: `feat` `fix` `refactor` `docs` `test` `chore`

### PR

제목 형식: `[SGF-XX] 내용`

---

## 반드시 지켜야 할 규칙

Google Maps Platform 약관과 보안 요구사항에서 나온 항목들입니다. 전문은 [CLAUDE.md 3절](CLAUDE.md)을 보세요.

- ❌ **Places API 응답을 DB에 저장 금지** — 식당명·주소·평점·사진은 매 요청 실시간 조회.
  자체 리뷰 연결용 `place_id`만 저장하며, 위경도를 포함한 Places 응답은 캐시하지 않음.
- ❌ **구글 지도 스크래핑 금지** (Selenium/Puppeteer 등) — 약관 위반
- ❌ **토큰을 localStorage/sessionStorage에 저장 금지** — HttpOnly + Secure 쿠키만 사용
- ❌ **시크릿 하드코딩 금지** — 환경변수로만 주입
- ✅ **입력 검증은 서버에서** — 프론트 검증만으로 끝내지 않음
- ✅ **리뷰 수정/삭제 시 작성자 검증은 서버에서** (IDOR 방지)
- ✅ **지도에 Google attribution 표시**
- ✅ **Places API 필드 마스크 최소화** — 불필요한 필드는 상위 SKU로 과금

---

## 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 프로젝트 계약서. 데이터 모델·API 스펙·절대 규칙의 **원본** |
| [docs/SRS.md](docs/SRS.md) | 소프트웨어 요구사항 명세 (기능/비기능 요구사항) |
| [docs/development-plan.md](docs/development-plan.md) | 5일 스프린트 일정, 역할 분담, CI/CD 및 보안 활동 |
| [docs/backend-agent-plan.md](docs/backend-agent-plan.md) | 백엔드 에이전트 2대 병렬 분업 — 파일 소유권, 동결된 API 계약 |

> API 스펙을 변경하면 **CLAUDE.md 6절 API 계약을 함께 갱신**하세요.
> 프론트/백엔드가 병렬로 개발되므로 이 문서가 유일한 계약서입니다.
