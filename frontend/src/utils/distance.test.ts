import { describe, expect, it } from 'vitest';
import { formatDistance, haversineDistanceMeters } from './distance';

// 알려진 싱가포르 좌표 두 곳 — 직선거리 약 1.1km (지도 서비스로 확인한 대략치)
const RAFFLES_PLACE = { lat: 1.2839, lng: 103.8517 };
const MARINA_BAY_SANDS = { lat: 1.2834, lng: 103.8607 };

describe('haversineDistanceMeters', () => {
  it('같은 좌표는 0을 반환한다', () => {
    expect(haversineDistanceMeters(RAFFLES_PLACE, RAFFLES_PLACE)).toBe(0);
  });

  it('알려진 두 지점 사이 거리를 합리적인 오차 내로 계산한다', () => {
    const distance = haversineDistanceMeters(RAFFLES_PLACE, MARINA_BAY_SANDS);
    expect(distance).toBeGreaterThan(900);
    expect(distance).toBeLessThan(1300);
  });

  it('순서를 바꿔도 같은 값이다', () => {
    const a = haversineDistanceMeters(RAFFLES_PLACE, MARINA_BAY_SANDS);
    const b = haversineDistanceMeters(MARINA_BAY_SANDS, RAFFLES_PLACE);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('formatDistance', () => {
  it('900m 미만은 10m 단위로 반올림한 미터로 표시한다', () => {
    expect(formatDistance(0)).toBe('0m');
    expect(formatDistance(84)).toBe('80m');
    expect(formatDistance(85)).toBe('90m');
    expect(formatDistance(899)).toBe('900m');
  });

  it('900m 이상은 소수점 첫째 자리 킬로미터로 표시한다', () => {
    expect(formatDistance(900)).toBe('0.9km');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(12345)).toBe('12.3km');
  });
});
