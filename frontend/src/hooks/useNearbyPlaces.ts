import { useEffect, useRef, useState } from 'react';
import { fetchNearbyPlaces } from '../api/places';
import type { PlaceSummary } from '../api/types';
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
        // 에러를 삼키지 않는다 (CLAUDE.md 8절). 사용자용 로딩/에러 UI는 Day 3에서 다룬다
        // (docs/frontend-agent-plan.md 4절) — 지금은 원인 추적용 로그만 남긴다.
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
  }, [lat, lng, radius]);

  return { places, loading, error };
}
