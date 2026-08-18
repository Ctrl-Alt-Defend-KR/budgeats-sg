import type { AuthUser } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * 로그인 시작은 `GET /auth/google`로 브라우저를 이동시킨다.
 * 이 엔드포인트는 302 리다이렉트(→ 구글 동의 화면)를 내려주므로 `fetch`/XHR로는
 * 리다이렉트 체인을 따라갈 수 없다 (docs/frontend-agent-plan.md 5절).
 * `LoginButton`과 `ReviewFab`의 로그인 유도 양쪽에서 재사용한다.
 */
export function startGoogleLogin(): void {
  window.location.href = `${API_BASE_URL}/auth/google`;
}

/**
 * 백엔드 연동 전 목(mock) 레이어.
 *
 * 계약 형식(`Promise<AuthUser | null>`)은 실제 구현과 동일하게 유지한다.
 * 컴포넌트/훅은 이 함수가 목인지 실제 호출인지 몰라야 하고, 백엔드가 붙으면
 * 이 파일 안쪽만 바뀐다 (docs/frontend-agent-plan.md 6절).
 *
 * 로그인 상태를 눈으로 확인하려면 아래 값을 로컬에서만 바꿔서 쓴다.
 * (브라우저 저장소에 넣지 않는다 — CLAUDE.md 3.2절. 커밋 전에는 false로 되돌릴 것.)
 */
const MOCK_LOGGED_IN = false;

const MOCK_USER: AuthUser = { id: 1, displayName: '지한' };

const MOCK_DELAY_MS = 250;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

/**
 * 현재 로그인 사용자 조회. 미로그인이면 `null`을 반환한다.
 * 토큰을 클라이언트에 들지 않고, 매번 이 응답으로만 로그인 여부를 판단한다
 * (frontend/CLAUDE.md 인증 절).
 *
 * 백엔드 연동 시 교체할 실제 구현 (시그니처는 그대로 유지):
 * ```ts
 * import { apiFetch, ApiError } from './client';
 * import type { AuthMeResponse } from './types';
 *
 * export async function getMe(): Promise<AuthUser | null> {
 *   try {
 *     const { user } = await apiFetch<AuthMeResponse>('/auth/me');
 *     return user;
 *   } catch (err) {
 *     if (err instanceof ApiError && err.status === 401) return null;
 *     throw err;
 *   }
 * }
 * ```
 */
export async function getMe(): Promise<AuthUser | null> {
  return delay(MOCK_LOGGED_IN ? MOCK_USER : null);
}

/**
 * 백엔드 연동 시: `apiFetch<void>('/auth/logout', { method: 'POST' })`.
 */
export async function logout(): Promise<void> {
  return delay(undefined);
}
