import { ApiError, apiFetch } from './client';
import type { AuthMeResponse, AuthUser } from './types';

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
 * 현재 로그인 사용자 조회. 미로그인이면 `null`을 반환한다.
 * 토큰을 클라이언트에 들지 않고, 매번 이 응답으로만 로그인 여부를 판단한다
 * (frontend/CLAUDE.md 인증 절).
 *
 * 미인증은 정상 흐름이라 401을 `null`로 바꿔 돌려준다 — 호출부가 예외로 다루지 않게 한다.
 * 그 밖의 오류(네트워크·5xx)는 삼키지 않고 그대로 올린다 (CLAUDE.md 8절).
 */
export async function getMe(): Promise<AuthUser | null> {
  try {
    const { user } = await apiFetch<AuthMeResponse>('/auth/me');
    return user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' });
}
