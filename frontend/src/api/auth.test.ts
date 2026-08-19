import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMe, logout } from './auth';
import { lastRequest, stubApiError, stubApiSuccess } from './testing';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getMe', () => {
  it('/auth/me 응답에서 user를 꺼내 반환한다', async () => {
    const spy = stubApiSuccess({ user: { id: 1, displayName: '지한', reviewEligible: true, school: 'NUS' } });

    await expect(getMe()).resolves.toEqual({ id: 1, displayName: '지한', reviewEligible: true, school: 'NUS' });
    expect(lastRequest(spy).url).toContain('/auth/me');
  });

  it('401은 예외가 아니라 null로 바꿔 돌려준다 (미로그인은 정상 흐름)', async () => {
    stubApiError('UNAUTHENTICATED', '로그인이 필요합니다.', 401);

    await expect(getMe()).resolves.toBeNull();
  });

  it('401 외의 오류는 삼키지 않고 그대로 올린다', async () => {
    stubApiError('ERROR', '서버 오류', 500);

    await expect(getMe()).rejects.toMatchObject({ status: 500 });
  });
});

describe('logout', () => {
  it('POST /auth/logout을 호출한다', async () => {
    const spy = stubApiSuccess(null);

    await logout();

    const { url, init } = lastRequest(spy);
    expect(url).toContain('/auth/logout');
    expect(init.method).toBe('POST');
  });
});
