# CLAUDE.md — Frontend

> 이 파일은 루트 [CLAUDE.md](../CLAUDE.md)의 **10절(저장소별 지침)** 에 해당합니다.
> 1~9절·11절(프로젝트 개요, 절대 규칙, 데이터 모델, API 계약, Git 컨벤션 등)은 루트 파일이 원본이며,
> Claude Code가 이 디렉토리에서 작업할 때 두 파일을 함께 읽습니다. **여기에 루트 내용을 복사하지 마세요.**

> **프론트엔드는 에이전트 2대가 병렬로 작업합니다.**
> 파일 소유권·일별 작업·충돌 방지 규칙은 [docs/frontend-agent-plan.md](../docs/frontend-agent-plan.md)에 있습니다.
> 세션을 시작하면 그 문서의 **3절(파일 소유권)** 과 자기 담당(**4절** Agent A / **5절** Agent B)을 먼저 확인하세요.
> API 응답 스키마 원본은 [docs/backend-agent-plan.md](../docs/backend-agent-plan.md) **6절**입니다.

---

## 역할

React SPA. 지도 렌더링과 사용자 인터랙션만 담당하며, 데이터는 전부 백엔드 API에서 받아옵니다.

## 기술 스택

| 항목 | 선택 |
|---|---|
| 빌드 도구 | Vite 8 |
| 언어 | TypeScript |
| 프레임워크 | React 19 |
| 지도 | Google Maps JavaScript API (렌더링 전용) |
| 서버 통신 | `fetch` + `credentials: 'include'` (`src/api/client.ts`) |
| 테스트 | Vitest |

## 디렉토리 구조

```
frontend/
├── src/
│   ├── api/          ← 백엔드 통신 레이어 (엔드포인트당 함수 1개)
│   │   └── client.ts ← apiFetch: 쿠키 전송·응답 언래핑·에러 변환을 여기서만 처리
│   ├── components/   ← 재사용 UI (Map, PinMarker, ReviewForm, Sidebar ...)
│   ├── pages/        ← 라우트 단위 화면
│   ├── hooks/        ← useDebounce, useCurrentPosition, useAuth ...
│   └── constants/    ← 핀 색상, 가격 등급 라벨 등 (매직 넘버 금지)
├── eslint.config.js
├── vite.config.ts
├── .env.example
└── CLAUDE.md
```

> `components/`, `pages/`, `hooks/`는 아직 비어 있습니다. 각 담당자가 첫 파일을 만들면서 생성하세요.

## 이 저장소의 규칙

> 아래 규칙 중 **`fetch` 직접 호출 금지**와 **브라우저 저장소 사용 금지**는
> `eslint.config.js`에 린트 규칙으로 박혀 있어 `npm run lint`에서 걸립니다.
> 리뷰에서 놓쳐도 CI가 잡습니다.

### 통신
- **백엔드 통신은 반드시 `src/api` 레이어를 경유합니다.** 컴포넌트/훅에서 직접 `fetch`를 호출하지 마세요.
- 모든 요청에 `credentials: 'include'`를 붙입니다 (HttpOnly 세션 쿠키 전송).
- 응답은 루트 6절의 `{ success, data | error }` 형식을 전제로 `src/api`에서 언래핑하고, 컴포넌트에는 `data`만 넘깁니다.

### Google Maps
- **Places API를 프론트에서 직접 호출하지 마세요.** 장소 검색·상세 조회는 전부 백엔드 `/places/*` 엔드포인트를 씁니다.
  - 리뷰 작성 팝업의 장소 검색도 `GET /places/search?query=` 를 호출합니다 (Places Autocomplete 위젯 직접 사용 금지).
- `VITE_GOOGLE_MAPS_API_KEY`는 **지도 렌더링(Maps JavaScript API) 전용**입니다. HTTP 리퍼러 제한이 걸려 있습니다.
- 지도에 Google attribution(로고)이 가려지지 않도록 오버레이/사이드바 레이아웃을 잡으세요.

### 인증
- **토큰을 localStorage / sessionStorage에 저장하는 코드를 작성하지 마세요.** 세션은 HttpOnly 쿠키로만 유지됩니다.
- 로그인 여부는 `GET /auth/me` 응답으로 판단합니다. 클라이언트에 토큰을 들고 있지 않습니다.
- 리뷰 수정/삭제 버튼을 작성자에게만 노출하는 것은 UX일 뿐이며, 실제 인가는 서버가 합니다. 프론트 분기를 보안 수단으로 취급하지 마세요.

### 비용 / 성능
- 지도 이동(`dragend`)·줌 변경 시 `/places/nearby` 호출에 **디바운스를 적용**합니다 (권장 300~500ms).
- 동일 뷰포트에 대한 중복 호출을 피하고, 이전 요청은 `AbortController`로 취소하세요.

### 표시 데이터
- 구글에서 온 식당명·주소·평점·사진은 **화면에 렌더링만 하고 저장하지 않습니다.** localStorage·IndexedDB 캐싱 금지.
- 핀 색상 경계값은 하드코딩하지 말고 `src/constants`에 두거나, 백엔드가 내려주는 가격 등급(`priceTier`) 필드를 그대로 사용하세요.

## 실행

```bash
cd frontend
cp .env.example .env.local     # 값 채우기
npm install
npm run dev                    # http://localhost:5173
```

## 체크리스트 (PR 전)

- [ ] `src/api` 밖에서 `fetch`를 직접 호출한 곳이 없는가
- [ ] `localStorage` / `sessionStorage` 사용이 없는가
- [ ] Places API를 직접 호출한 곳이 없는가
- [ ] 지도 이동 핸들러에 디바운스가 걸려 있는가
- [ ] `.env.local` 값이 커밋에 포함되지 않았는가
