import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNearbyPlaces } from '../api/places';
import type { PlaceGradePatch, PlaceSummary } from '../api/types';
import { MAP_DEFAULTS } from '../constants/map';
import { useDebounce } from './useDebounce';

export interface MapCenter {
  lat: number;
  lng: number;
}

interface UseNearbyPlacesResult {
  places: PlaceSummary[];
  loading: boolean;
  error: Error | null;
  /**
   * 리뷰 저장·삭제 응답의 `place`로 핀 하나만 갱신한다 (docs/frontend-agent-plan.md 2절 seam).
   * `placeId`가 현재 목록에 없으면 아무 일도 하지 않는다 — 뷰포트 밖 식당의 리뷰는 무시한다.
   */
  applyPlaceGradePatch: (patch: PlaceGradePatch) => void;
  /** 조회 실패 시 사용자가 다시 시도할 수 있게 한다. 중심이 그대로여도(디바운스 우회) 재조회한다. */
  retry: () => void;
}

/** `places` 배열에서 `patch.placeId`와 일치하는 항목에만 patch 필드를 덮어쓴다. */
export function mergePlaceGradePatch(
  places: PlaceSummary[],
  patch: PlaceGradePatch,
): PlaceSummary[] {
  return places.map((place) => (place.placeId === patch.placeId ? { ...place, ...patch } : place));
}

/**
 * 지도 중심이 바뀔 때마다 `/places/nearby`를 조회한다.
 *
 * - **디바운스**: `MAP_DEFAULTS.debounceMs` 동안 중심이 안정된 뒤에만 호출한다
 * - **취소**: 안정되기 전에 중심이 또 바뀌면 이전 요청을 `AbortController`로 취소한다.
 *   그렇지 않으면 느린 응답이 나중에 도착해 최신 뷰포트를 덮어쓸 수 있다
 *
 * (CLAUDE.md 3.3절, frontend/CLAUDE.md 비용/성능 절)
 */
export function useNearbyPlaces(center: MapCenter | null, radius?: number): UseNearbyPlacesResult {
  const debouncedCenter = useDebounce(center, MAP_DEFAULTS.debounceMs);
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // retry()가 값을 바꿔 재조회를 강제한다. 디바운스를 거치지 않는다 —
  // 사용자가 직접 누른 재시도까지 늦출 이유가 없다.
  const [retryToken, setRetryToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // debouncedCenter는 매 안정 시점마다 새 객체이므로, 무한 재실행을 막기 위해
  // 좌표값(원시 타입)을 의존성으로 쓴다.
  const lat = debouncedCenter?.lat;
  const lng = debouncedCenter?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // 비동기 함수로 감싼다 — 조회 시작(loading/error 초기화)과 완료 처리를
    // 한 흐름으로 유지하면서, effect 콜백 본문에서 setState를 동기 호출하지 않는다.
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchNearbyPlaces({ lat, lng, radius, signal: controller.signal });
        setPlaces(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        // 에러를 삼키지 않는다 (CLAUDE.md 8절). 사용자용 에러·재시도 UI는 이 훅을 쓰는
        // 쪽(Sidebar)이 error/retry로 보여준다 — 여기서는 원인 추적용 로그만 남긴다.
        const normalized = err instanceof Error ? err : new Error('알 수 없는 오류');
        console.error('[useNearbyPlaces] 조회 실패', normalized);
        setError(normalized);
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [lat, lng, radius, retryToken]);

  const applyPlaceGradePatch = useCallback((patch: PlaceGradePatch) => {
    setPlaces((prev) => mergePlaceGradePatch(prev, patch));
  }, []);

  const retry = useCallback(() => {
    setRetryToken((token) => token + 1);
  }, []);

  return { places, loading, error, applyPlaceGradePatch, retry };
}
