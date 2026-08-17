import { describe, expect, it } from 'vitest';
import { parseNumberEnv } from './map';

describe('parseNumberEnv', () => {
  it('숫자 문자열을 숫자로 변환한다', () => {
    expect(parseNumberEnv('1.3521', 0)).toBe(1.3521);
    expect(parseNumberEnv('13', 0)).toBe(13);
  });

  it('음수 좌표도 그대로 읽는다', () => {
    // 싱가포르는 아니지만 경도는 음수가 유효하다. 부호를 잃으면 지구 반대편이 된다.
    expect(parseNumberEnv('-73.9857', 0)).toBe(-73.9857);
  });

  it('.env.local 없이 실행하면(undefined) fallback을 쓴다', () => {
    expect(parseNumberEnv(undefined, 400)).toBe(400);
  });

  it('빈 문자열·공백은 fallback으로 떨어진다', () => {
    // Number('')는 0이다. 이 함정에 빠지면 지도가 (0, 0)에 뜬다.
    expect(parseNumberEnv('', 1.3521)).toBe(1.3521);
    expect(parseNumberEnv('   ', 1.3521)).toBe(1.3521);
  });

  it('숫자가 아닌 값은 fallback으로 떨어진다', () => {
    expect(parseNumberEnv('서울', 13)).toBe(13);
    expect(parseNumberEnv('NaN', 13)).toBe(13);
    expect(parseNumberEnv('Infinity', 13)).toBe(13);
  });

  it('0은 유효한 값이므로 fallback으로 대체하지 않는다', () => {
    expect(parseNumberEnv('0', 13)).toBe(0);
  });
});
