import { describe, expect, it } from 'vitest';
import { searchPlaces } from './placeSearch';

describe('searchPlaces (mock)', () => {
  it('빈 검색어는 빈 배열을 반환한다', async () => {
    await expect(searchPlaces('  ')).resolves.toEqual([]);
  });

  it('이름에 검색어가 포함된 장소만 반환한다', async () => {
    const results = await searchPlaces('Maxwell');

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.name.includes('Maxwell'))).toBe(true);
  });

  it('평점·좌표 필드를 포함하지 않는다 (계약 6.4절)', async () => {
    const [first] = await searchPlaces('Maxwell');

    expect(first).not.toHaveProperty('rating');
    expect(first).not.toHaveProperty('lat');
  });
});
