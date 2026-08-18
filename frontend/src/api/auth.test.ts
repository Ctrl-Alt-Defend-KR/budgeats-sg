import { describe, expect, it } from 'vitest';
import { getMe, logout } from './auth';

describe('getMe (mock)', () => {
  it('백엔드 연동 전에는 미로그인 상태(null)를 반환한다', async () => {
    await expect(getMe()).resolves.toBeNull();
  });
});

describe('logout (mock)', () => {
  it('예외 없이 resolve된다', async () => {
    await expect(logout()).resolves.toBeUndefined();
  });
});
