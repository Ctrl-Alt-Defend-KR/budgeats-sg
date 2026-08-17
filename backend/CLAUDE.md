# CLAUDE.md — Backend

> 이 파일은 루트 [CLAUDE.md](../CLAUDE.md)의 **10절(저장소별 지침)** 에 해당합니다.
> 1~9절·11절(프로젝트 개요, 절대 규칙, 데이터 모델, API 계약, Git 컨벤션 등)은 루트 파일이 원본이며,
> Claude Code가 이 디렉토리에서 작업할 때 두 파일을 함께 읽습니다. **여기에 루트 내용을 복사하지 마세요.**

---

## 역할

Spring Boot 기반 API 서버. Google Places API 호출과 DB 접근을 독점하며, 프론트엔드에는 API 계약(루트 6절)만 노출합니다.

## 기술 스택

| 항목 | 선택 |
|---|---|
| 런타임 | Java 21 |
| 프레임워크 | Spring Boot |
| 빌드 | Gradle |
| ORM | Spring Data JPA |
| 검증 | Jakarta Bean Validation |
| DB | H2 file-backed |
| 테스트 | JUnit 5 + MockMvc |

## 디렉토리 구조

```
backend/
├── build.gradle
├── settings.gradle
├── src/
│   ├── main/
│   │   ├── java/com/budgeats/sg/
│   │   │   ├── BudgeatsApplication.java
│   │   │   ├── core/        ← 설정·공통 응답·예외·CORS
│   │   │   └── health/      ← 현재 구현된 헬스체크
│   │   └── resources/application.yml
│   └── test/java/com/budgeats/sg/  ← JUnit 5 · MockMvc
├── gradle/wrapper/
├── gradlew / gradlew.bat
├── .env.example
└── CLAUDE.md
```

기능을 구현할 때만 `auth`, `place`, `review`, `budget` 패키지를 추가합니다. 비어 있는 계층이나
구현체 하나뿐인 인터페이스를 미리 만들지 않습니다.

## 이 저장소의 규칙

### Google Places API
- **Places API 호출은 `place` 패키지 밖에서 하지 마세요.** 컨트롤러가 구글을 직접 호출하는 코드 금지.
- **응답 중 `place_id` 외의 필드를 DB에 저장하는 코드를 작성하지 마세요.** 식당명·주소·평점·사진·영업시간은 전부 실시간 조회 후 응답에 실어 보내고 버립니다.
- 이번 MVP에서는 위경도(lat/lng)를 포함한 Places 응답을 캐시하지 않습니다.
- **필드 마스크를 최소화**하세요. `reviews`, `photos` 필드를 요청하면 상위 SKU로 과금됩니다 (루트 3.3절).
- 스크래핑 코드(Selenium, Puppeteer 등) 절대 금지.

### 입력 검증
- 모든 요청 바디·쿼리 파라미터에 **DTO와 Jakarta Bean Validation을 적용**합니다. `Map`이나 raw `HttpServletRequest`로 받지 마세요.
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
- 가격 경계값(8, 15 SGD), 실측 데이터 채택 최소 건수 N은 **`application.yml` 설정으로만 읽습니다.** 코드에 숫자를 박지 마세요.
- 현재 값은 잠정값입니다 (루트 11절 미확정).

### 에러 처리
- 예외를 삼키지 말고 로깅 후 루트 6절 형식으로 반환합니다:
  `{"success": false, "error": {"code": "INVALID_INPUT", "message": "..."}}`
- Spring MVC 검증·예외 응답도 `@RestControllerAdvice`에서 이 형식으로 감쌉니다.
- **로그에 API 키·토큰·쿠키 값을 남기지 마세요.**

### Rate Limiting
- `POST /reviews`에 사용자별 요청 제한을 적용합니다 (`REVIEW_RATE_LIMIT_PER_HOUR`).

### DB
- H2는 `jdbc:h2:file:./data/budgeats;DB_CLOSE_ON_EXIT=FALSE`를 기본값으로 사용하며 `users`, `reviews`만 저장합니다.
- 예산 일정은 무상태로 계산해 반환합니다. `budget_plans` 엔티티·리포지토리·테이블을 만들지 마세요.
- `reviews` 테이블에 `UNIQUE(user_id, place_id)` 제약이 있어야 합니다 (동일 식당 리뷰 1건).

## 실행

```bash
cd backend
cp .env.example .env
./gradlew bootRun       # Windows: .\gradlew.bat bootRun
```

- **API 스펙을 바꾸면 루트 CLAUDE.md 6절도 같이 갱신하세요.** 프론트와 계약이 깨집니다.

## 체크리스트 (PR 전)

- [ ] `place` 패키지 밖에서 구글 API를 호출한 곳이 없는가
- [ ] Places 응답 필드를 DB에 저장하는 코드가 없는가 (`place_id` 제외)
- [ ] 새 엔드포인트에 DTO와 Bean Validation이 붙어 있는가
- [ ] 리뷰 수정/삭제에 작성자 검증이 걸려 있는가
- [ ] H2에 `users`, `reviews` 외 데이터를 저장하지 않는가
- [ ] 가격 경계값 등 숫자를 하드코딩하지 않았는가
- [ ] 로그·응답에 시크릿이 노출되지 않는가
- [ ] API 스펙 변경 시 루트 6절을 갱신했는가
