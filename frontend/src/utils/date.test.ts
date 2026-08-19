import { describe, expect, it } from 'vitest';
import { formatReviewDate } from './date';

describe('formatReviewDate', () => {
  it('UTC 시각을 Singapore 시간으로 표시한다', () => {
    const result = formatReviewDate('2026-08-17T16:00:00Z');

    // Node가 사용하는 ICU 데이터에 따라 ko-KR의 day period가
    // `오전` 또는 `AM`으로 표현될 수 있다. 번역 문자열이 아니라
    // Singapore(+08:00)에서 다음 날 자정으로 변환됐는지를 검증한다.
    expect(result).toContain('2026');
    expect(result).toMatch(/8\.\s*18\./);
    expect(result).toMatch(/(?:오전|AM)\s*12:00/);
  });
});
