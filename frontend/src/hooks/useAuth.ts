import { useCallback, useEffect, useState } from 'react';
import { getMe, logout as logoutRequest } from '../api/auth';
import type { AuthUser } from '../api/types';

interface UseAuthResult {
  user: AuthUser | null;
  /** `GET /auth/me` 응답을 아직 못 받았으면 true — 로그인 게이트를 조급하게 판단하지 않기 위함 */
  isLoading: boolean;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
}

/**
 * 로그인 여부는 `GET /auth/me` 응답으로만 판단한다.
 * 토큰을 클라이언트에 들지 않는다 (frontend/CLAUDE.md 인증 절).
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 마운트 시 1회 조회. setState를 effect 본문에서 동기적으로 호출하지 않도록
    // 이펙트가 아니라 이 프라미스 콜백 안에서만 상태를 바꾼다 (react-hooks/set-state-in-effect).
    getMe()
      .then((result) => {
        if (!cancelled) setUser(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  return { user, isLoading, isLoggedIn: user !== null, logout };
}
