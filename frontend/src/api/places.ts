import { apiFetch } from './client';
import type { NearbyPlacesResponse, PlaceDetail, PlaceSummary } from './types';

export function fetchPlaceDetail(placeId: string, signal?: AbortSignal): Promise<PlaceDetail> {
  return apiFetch<PlaceDetail>(`/places/${encodeURIComponent(placeId)}`, { signal });
}

/**
 * `/places/nearby` 조회 파라미터.
 * `radius` 생략 시 백엔드 기본값(`placesNearbyDefaultRadiusM`)을 따른다 (계약 6.3절).
 */
export interface FetchNearbyPlacesParams {
  lat: number;
  lng: number;
  radius?: number;
  signal?: AbortSignal;
}

/**
 * 주변 식당 조회.
 *
 * Places API는 백엔드가 호출한다 — 프론트에서 구글을 직접 부르지 않는다
 * (CLAUDE.md 2절, 3.1절). 정렬(`rating` 내림차순)과 가격 등급 산정도 서버 책임이라
 * 여기서 다시 정렬하거나 등급을 계산하지 않는다 (FR-302, 계약 6.3절).
 */
export async function fetchNearbyPlaces({
  lat,
  lng,
  radius,
  signal,
}: FetchNearbyPlacesParams): Promise<PlaceSummary[]> {
  const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radius !== undefined) {
    query.set('radius', String(radius));
  }

  const { places } = await apiFetch<NearbyPlacesResponse>(`/places/nearby?${query}`, { signal });
  return places;
}
