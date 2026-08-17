import type { PlaceSummary, PriceTierSource } from './types';
import type { PriceTier } from '../constants/price';

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
 * 백엔드 `PlaceController`가 아직 없다 (docs/backend-agent-plan.md 진행 중).
 * 계약 6.3절 형식 그대로의 목을 반환한다 — 호출부는 목인지 실제인지 몰라야 하고,
 * 백엔드 완료 후에는 **이 함수 몸통만** 아래 실제 호출로 바꾼다.
 *
 * ```ts
 * const query = new URLSearchParams({ lat: String(lat), lng: String(lng) });
 * if (radius) query.set('radius', String(radius));
 * const { places } = await apiFetch<NearbyPlacesResponse>(`/places/nearby?${query}`, { signal });
 * return places;
 * ```
 *
 * 시그니처(`Promise<PlaceSummary[]>`)는 그대로 유지하므로 `hooks/useNearbyPlaces`는
 * 이 교체와 무관하게 동작한다 (docs/frontend-agent-plan.md 6절).
 */
export async function fetchNearbyPlaces(params: FetchNearbyPlacesParams): Promise<PlaceSummary[]> {
  await delay(MOCK_LATENCY_MS, params.signal);
  return generateMockPlaces(params);
}

// ──────────────────────────────────────────────────────────────────────────
// 아래는 목 데이터 구현이다. 백엔드 PlaceController가 나오면 이 구획 전체를 지운다.
// ──────────────────────────────────────────────────────────────────────────

const MOCK_LATENCY_MS = 250;
const MOCK_PLACE_COUNT = 12;
const MOCK_DEFAULT_RADIUS_M = 1500;

/**
 * 목 데이터용 가격 대략치(SGD)다. **실제 등급 경계값이 아니다** — 그건
 * 백엔드 `BudgeatsProperties`에서만 관리한다 (constants/price.ts 주석 참고).
 * 여기서는 그럴듯한 표시값을 만드는 용도로만 쓴다.
 */
const MOCK_PRICE_MIDPOINT_SGD: Record<PriceTier, number> = {
  low: 6,
  mid: 11,
  high: 20,
};

/** fetch의 abort 동작과 동일하게 DOMException('AbortError')로 reject한다. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function generateMockPlaces({ lat, lng, radius }: FetchNearbyPlacesParams): PlaceSummary[] {
  const rng = mulberry32(hashLatLng(lat, lng));
  const spreadKm = (radius ?? MOCK_DEFAULT_RADIUS_M) / 1000;

  return Array.from({ length: MOCK_PLACE_COUNT }, (_, i) => {
    const bearingDeg = (360 / MOCK_PLACE_COUNT) * i + rng() * 20;
    const distanceKm = spreadKm * (0.15 + rng() * 0.85);
    const position = offsetLatLng({ lat, lng }, distanceKm, bearingDeg);

    const priceTier = pickPriceTier(rng);
    const priceTierSource: PriceTierSource = rng() > 0.4 ? 'actual' : 'google';
    const ownReviewCount = priceTierSource === 'actual' ? Math.round(3 + rng() * 10) : 0;

    return {
      placeId: `mock-${Math.round(lat * 1000)}-${Math.round(lng * 1000)}-${i}`,
      name: `[MOCK] 식당 ${i + 1}`,
      address: '싱가포르 (목 데이터 — 백엔드 연동 전)',
      rating: roundTo(3 + rng() * 2, 1),
      userRatingCount: Math.round(20 + rng() * 900),
      lat: position.lat,
      lng: position.lng,
      priceTier,
      priceTierSource,
      actualAvgPricePerPerson:
        priceTierSource === 'actual'
          ? roundTo(MOCK_PRICE_MIDPOINT_SGD[priceTier] + (rng() - 0.5) * 2, 1)
          : null,
      ownReviewCount,
    } satisfies PlaceSummary;
  });
}

function pickPriceTier(rng: () => number): PriceTier {
  const roll = rng();
  if (roll < 0.4) return 'low';
  if (roll < 0.75) return 'mid';
  return 'high';
}

/** 평면 근사. 조회 반경(수 km) 내에서는 오차가 무시할 만하다 — 실제 API에는 쓰지 않는다. */
function offsetLatLng(
  center: { lat: number; lng: number },
  distanceKm: number,
  bearingDeg: number,
): { lat: number; lng: number } {
  const KM_PER_DEGREE_LAT = 111;
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const latOffset = (distanceKm / KM_PER_DEGREE_LAT) * Math.cos(bearingRad);
  const lngOffset =
    (distanceKm / (KM_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180))) *
    Math.sin(bearingRad);

  return { lat: center.lat + latOffset, lng: center.lng + lngOffset };
}

/** 같은 좌표(반올림 기준)로 다시 조회하면 같은 결과가 나오게 시드를 고정한다. */
function hashLatLng(lat: number, lng: number): number {
  const key = `${lat.toFixed(3)}:${lng.toFixed(3)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/** mulberry32 — 테스트 가능한 결정적 PRNG. 암호학적 용도가 아니므로 이걸로 충분하다. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
