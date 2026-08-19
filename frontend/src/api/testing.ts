import { vi } from 'vitest';

/**
 * `apiFetch`가 쓰는 전역 `fetch`를 가로채는 테스트 헬퍼.
 *
 * API 레이어 테스트는 **요청을 올바르게 조립하는지**와 **응답 래퍼를 벗겨 넘기는지**를 본다.
 * 실제 네트워크로 나가면 백엔드 기동 여부에 테스트가 묶이므로 여기서 끊는다.
 */
export function stubApiSuccess<T>(data: T, status = 200) {
  const spy = vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve({ success: true, data }),
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

export function stubApiError(code: string, message: string, status: number) {
  const spy = vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve({ success: false, error: { code, message } }),
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** stub된 fetch에 실제로 들어온 요청(URL·옵션)을 꺼낸다. */
export function lastRequest(spy: ReturnType<typeof vi.fn>): { url: string; init: RequestInit } {
  const [url, init] = spy.mock.calls.at(-1) as [string, RequestInit];
  return { url, init };
}
