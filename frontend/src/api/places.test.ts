import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNearbyPlaces } from './places';
import { PRICE_TIERS } from '../constants/price';

const SINGAPORE_CENTER = { lat: 1.3521, lng: 103.8198 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchNearbyPlaces (mock)', () => {
  it('계약 6.1절 형식의 place 배열을 반환한다', async () => {
    const promise = fetchNearbyPlaces(SINGAPORE_CENTER);
    await vi.runAllTimersAsync();
    const places = await promise;

    expect(places.length).toBeGreaterThan(0);
    for (const place of places) {
      expect(typeof place.placeId).toBe('string');
      expect(PRICE_TIERS).toContain(place.priceTier);
      expect(place.rating).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(place.lat)).toBe(true);
      expect(Number.isFinite(place.lng)).toBe(true);
    }
  });

  it('priceTierSource가 actual이 아니면 actualAvgPricePerPerson은 null이다', async () => {
    const promise = fetchNearbyPlaces(SINGAPORE_CENTER);
    await vi.runAllTimersAsync();
    const places = await promise;

    for (const place of places) {
      if (place.priceTierSource !== 'actual') {
        expect(place.actualAvgPricePerPerson).toBeNull();
      } else {
        expect(place.actualAvgPricePerPerson).not.toBeNull();
      }
    }
  });

  it('같은 좌표로 조회하면 같은 결과를 반환한다 (결정적 시드)', async () => {
    const first = fetchNearbyPlaces(SINGAPORE_CENTER);
    await vi.runAllTimersAsync();
    const firstResult = await first;

    const second = fetchNearbyPlaces(SINGAPORE_CENTER);
    await vi.runAllTimersAsync();
    const secondResult = await second;

    expect(secondResult).toEqual(firstResult);
  });

  it('생성된 좌표가 중심 근처(반경 5배 이내)에 있다', async () => {
    const radius = 1500;
    const promise = fetchNearbyPlaces({ ...SINGAPORE_CENTER, radius });
    await vi.runAllTimersAsync();
    const places = await promise;

    for (const place of places) {
      const latDiffKm = Math.abs(place.lat - SINGAPORE_CENTER.lat) * 111;
      expect(latDiffKm).toBeLessThan((radius / 1000) * 5);
    }
  });

  it('호출 전에 이미 취소된 signal이면 AbortError로 reject한다', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchNearbyPlaces({ ...SINGAPORE_CENTER, signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('대기 중 취소하면 AbortError로 reject하고 그 뒤로도 값을 반환하지 않는다', async () => {
    const controller = new AbortController();
    const promise = fetchNearbyPlaces({ ...SINGAPORE_CENTER, signal: controller.signal });

    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
  });
});
