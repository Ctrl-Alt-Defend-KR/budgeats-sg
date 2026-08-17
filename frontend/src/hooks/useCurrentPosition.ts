import { useEffect, useState } from 'react';
import { MAP_DEFAULTS } from '../constants/map';
import type { MapCenter } from './useNearbyPlaces';

const GEOLOCATION_TIMEOUT_MS = 5000;

interface UseCurrentPositionResult {
  /** 실제 위치를 못 구하면 `MAP_DEFAULTS.center`로 폴백한다. */
  position: MapCenter;
  /** false면 `position`이 폴백값이라는 뜻 — 이때는 거리 표시를 생략한다. */
  isActualPosition: boolean;
}

/**
 * 사용자 현재 위치.
 *
 * 권한 거부·타임아웃·미지원 브라우저 등 모든 실패 케이스에서 기본 지도 중심으로
 * 조용히 폴백하고 화면을 깨뜨리지 않는다 (docs/frontend-agent-plan.md 4절 완료 기준).
 */
export function useCurrentPosition(): UseCurrentPositionResult {
  const [result, setResult] = useState<UseCurrentPositionResult>({
    position: MAP_DEFAULTS.center,
    isActualPosition: false,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setResult({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          isActualPosition: true,
        });
      },
      () => {
        // 권한 거부·타임아웃 등 — 초기값(MAP_DEFAULTS.center, isActualPosition: false)을
        // 그대로 유지한다. 사용자에게 에러를 보여주지 않는다 — 거리 표시만 생략된다.
      },
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }, []);

  return result;
}
