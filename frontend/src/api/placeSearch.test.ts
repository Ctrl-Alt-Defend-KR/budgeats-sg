import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchPlaces } from './placeSearch';
import { lastRequest, stubApiSuccess } from './testing';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchPlaces', () => {
  it('빈 검색어는 서버를 호출하지 않고 빈 배열을 반환한다', async () => {
    const spy = stubApiSuccess({ places: [] });

    await expect(searchPlaces('  ')).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('검색어를 URL 인코딩해 /places/search로 보낸다', async () => {
    const spy = stubApiSuccess({ places: [] });

    await searchPlaces('치킨 라이스 & 국수');

    const { url } = lastRequest(spy);
    expect(url).toContain('/places/search?query=');
    // 공백·&가 그대로 들어가면 쿼리스트링이 깨진다
    expect(url).not.toMatch(/query=[^&]*[ &]/);
  });

  it('응답의 places 배열을 그대로 반환한다', async () => {
    const places = [{ placeId: 'ChIJ1', name: 'Maxwell Food Centre', address: '1 Kadayanallur St' }];
    stubApiSuccess({ places });

    await expect(searchPlaces('Maxwell')).resolves.toEqual(places);
  });
});
