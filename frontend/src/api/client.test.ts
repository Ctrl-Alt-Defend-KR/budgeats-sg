import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from './client';

function mockFetch(status: number, body: unknown, isJson = true) {
  const response = {
    status,
    json: isJson
      ? () => Promise.resolve(body)
      : () => Promise.reject(new SyntaxError('Unexpected token')),
  };
  const spy = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('성공 응답에서 data만 꺼내 반환한다', async () => {
    mockFetch(200, { success: true, data: { id: 1 } });

    await expect(apiFetch('/places/nearby')).resolves.toEqual({ id: 1 });
  });

  it('세션 쿠키 전송을 위해 credentials: include를 항상 붙인다', async () => {
    const spy = mockFetch(200, { success: true, data: null });

    await apiFetch('/auth/me');

    expect(spy.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('실패 응답을 ApiError로 변환한다', async () => {
    mockFetch(400, {
      success: false,
      error: { code: 'INVALID_INPUT', message: '평점은 1~5 사이여야 합니다.' },
    });

    await expect(apiFetch('/reviews')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      status: 400,
    });
  });

  it('JSON이 아닌 응답도 삼키지 않고 ApiError로 올린다', async () => {
    mockFetch(502, null, false);

    await expect(apiFetch('/places/nearby')).rejects.toBeInstanceOf(ApiError);
  });
});
