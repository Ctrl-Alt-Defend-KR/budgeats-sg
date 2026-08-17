import { describe, expect, it } from 'vitest';
import { mergePlaceGradePatch } from './useNearbyPlaces';
import type { PlaceGradePatch, PlaceSummary } from '../api/types';

function makePlace(overrides: Partial<PlaceSummary> = {}): PlaceSummary {
  return {
    placeId: 'place-1',
    name: '[MOCK] 식당',
    address: '싱가포르',
    rating: 4.2,
    userRatingCount: 100,
    lat: 1.3521,
    lng: 103.8198,
    priceTier: 'mid',
    priceTierSource: 'google',
    actualAvgPricePerPerson: null,
    ownReviewCount: 0,
    ...overrides,
  };
}

describe('mergePlaceGradePatch', () => {
  it('placeId가 일치하는 항목에만 patch 필드를 덮어쓴다', () => {
    const places = [makePlace({ placeId: 'a' }), makePlace({ placeId: 'b' })];
    const patch: PlaceGradePatch = {
      placeId: 'b',
      priceTier: 'low',
      priceTierSource: 'actual',
      actualAvgPricePerPerson: 6.5,
      ownReviewCount: 4,
    };

    const result = mergePlaceGradePatch(places, patch);

    expect(result[0]).toEqual(places[0]);
    expect(result[1]).toMatchObject(patch);
    // name·rating 등 patch에 없는 필드는 그대로 유지된다
    expect(result[1].name).toBe(places[1].name);
  });

  it('일치하는 placeId가 없으면 원본과 동일한 배열을 반환한다', () => {
    const places = [makePlace({ placeId: 'a' })];
    const patch: PlaceGradePatch = {
      placeId: 'not-in-list',
      priceTier: 'high',
      priceTierSource: 'actual',
      actualAvgPricePerPerson: 20,
      ownReviewCount: 1,
    };

    const result = mergePlaceGradePatch(places, patch);

    expect(result).toEqual(places);
  });

  it('원본 배열을 변형하지 않는다', () => {
    const places = [makePlace({ placeId: 'a' })];
    const original = [...places];

    mergePlaceGradePatch(places, {
      placeId: 'a',
      priceTier: 'high',
      priceTierSource: 'actual',
      actualAvgPricePerPerson: 20,
      ownReviewCount: 1,
    });

    expect(places).toEqual(original);
  });
});
