import { describe, expect, it } from 'vitest';
import { formatReviewDate } from './date';

describe('formatReviewDate', () => {
  it('UTC 시각을 Singapore 시간으로 표시한다', () => {
    expect(formatReviewDate('2026-08-17T16:00:00Z')).toContain('오전 12:00');
  });
});
