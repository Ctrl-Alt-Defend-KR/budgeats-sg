import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPriceTierMetadata } from './meta';
import { lastRequest, stubApiSuccess } from './testing';

afterEach(() => vi.unstubAllGlobals());
describe('fetchPriceTierMetadata', () => {
  it('서버 가격 정책을 그대로 반환한다', async () => {
    const metadata = { currency: 'SGD', lowMaxInclusive: 8, midMaxInclusive: 15, actualMinReviews: 3 };
    const spy = stubApiSuccess(metadata);
    await expect(fetchPriceTierMetadata()).resolves.toEqual(metadata);
    expect(lastRequest(spy).url).toContain('/meta/price-tiers');
  });
});
