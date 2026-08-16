/**
 * 백엔드 통신 레이어.
 *
 * 컴포넌트와 훅에서 fetch를 직접 호출하지 말고 반드시 이 레이어를 경유한다 (frontend/CLAUDE.md).
 * 여기에 인증·에러 처리를 모아두면 개별 호출부에서 빠뜨릴 여지가 없어진다.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** 백엔드 공통 응답 형식 (CLAUDE.md 6절) */
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 응답 본문이 JSON이 아닐 때(프록시 502, 서버 크래시 등) 쓰는 코드 */
const NON_JSON_ERROR_CODE = 'INVALID_RESPONSE';

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // 세션은 HttpOnly 쿠키로만 유지된다. 토큰을 localStorage에 두지 않으므로
    // 이 옵션이 빠지면 인증이 통째로 동작하지 않는다 (CLAUDE.md 3.2절).
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    // 에러를 삼키지 않고 표준 형태로 변환한다 (CLAUDE.md 8절).
    throw new ApiError(
      NON_JSON_ERROR_CODE,
      '서버 응답을 해석할 수 없습니다.',
      response.status,
    );
  }

  if (!body.success) {
    throw new ApiError(body.error.code, body.error.message, response.status);
  }

  return body.data;
}
