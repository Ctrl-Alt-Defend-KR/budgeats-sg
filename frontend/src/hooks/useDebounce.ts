import { useEffect, useState } from 'react';

/**
 * 값이 delayMs 동안 더 바뀌지 않을 때만 반영한다.
 *
 * 지도 이동 이벤트를 그대로 쓰면 드래그 중 매 프레임마다 API를 호출하게 된다
 * (CLAUDE.md 3.3절, frontend/CLAUDE.md 비용/성능). delayMs는 호출부에서
 * `constants/map.ts`의 `MAP_DEFAULTS.debounceMs`를 넘긴다 — 숫자를 여기 쓰지 않는다.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
