import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchNearbyPlaces } from './places';
import { lastRequest, stubApiSuccess } from './testing';
import type { PlaceSummary } from './types';

const SINGAPORE_CENTER = { lat: 1.3521, lng: 103.8198 };

const SAMPLE: PlaceSummary = {
  placeId: 'ChIJ1',
  name: 'Maxwell Food Centre',
  address: '1 Kadayanallur St, Singapore',
  rating: 4.3,
  userRatingCount: 812,
  lat: 1.2803,
  lng: 103.8451,
  priceTier: 'low',
  priceTierSource: 'actual',
  actualAvgPricePerPerson: 6.5,
  ownReviewCount: 4,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchNearbyPlaces', () => {
  it('응답의 places 배열을 그대로 반환한다', async () => {
    stubApiSuccess({ places: [SAMPLE] });

    await expect(fetchNearbyPlaces(SINGAPORE_CENTER)).resolves.toEqual([SAMPLE]);
  });

  it('lat·lng를 쿼리로 붙인다', async () => {
    const spy = stubApiSuccess({ places: [] });

    await fetchNearbyPlaces(SINGAPORE_CENTER);

    const { url } = lastRequest(spy);
    expect(url).toContain('/places/nearby?');
    expect(url).toContain('lat=1.3521');
    expect(url).toContain('lng=103.8198');
  });

  it('radius를 생략하면 쿼리에 넣지 않는다 (백엔드 기본값 사용)', async () => {
    const spy = stubApiSuccess({ places: [] });

    await fetchNearbyPlaces(SINGAPORE_CENTER);

    expect(lastRequest(spy).url).not.toContain('radius');
  });

  it('radius를 주면 쿼리에 포함한다', async () => {
    const spy = stubApiSuccess({ places: [] });

    await fetchNearbyPlaces({ ...SINGAPORE_CENTER, radius: 800 });

    expect(lastRequest(spy).url).toContain('radius=800');
  });

  it('AbortSignal을 fetch로 넘긴다 (지도 이동 시 이전 요청 취소)', async () => {
    const spy = stubApiSuccess({ places: [] });
    const controller = new AbortController();

    await fetchNearbyPlaces({ ...SINGAPORE_CENTER, signal: controller.signal });

    expect(lastRequest(spy).init.signal).toBe(controller.signal);
  });
});
