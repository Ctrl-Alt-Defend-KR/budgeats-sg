/**
 * 두 좌표 사이의 직선거리(미터). Haversine 공식.
 *
 * 경로 API는 호출하지 않는다 — 사이드바 거리 표시는 직선거리로 충분하고,
 * 경로 API 호출은 그대로 과금이다 (docs/frontend-agent-plan.md 4절 Day2).
 */
export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const EARTH_RADIUS_M = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

const KM_DISPLAY_THRESHOLD_M = 900;
const METER_ROUNDING_STEP = 10;

/** 900m 미만은 10m 단위로 반올림한 미터, 그 이상은 소수점 첫째 자리 킬로미터로 표시한다. */
export function formatDistance(meters: number): string {
  if (meters < KM_DISPLAY_THRESHOLD_M) {
    return `${Math.round(meters / METER_ROUNDING_STEP) * METER_ROUNDING_STEP}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
