/**
 * 지도 초기값.
 *
 * 좌표·줌·디바운스는 `.env.local`의 `VITE_MAP_*`로 덮어쓴다.
 * 값이 없거나 숫자로 해석되지 않으면 아래 FALLBACK으로 떨어진다 —
 * 환경변수 오타 하나로 지도가 (0, 0) 대서양 한가운데에 뜨는 것을 막기 위한 것이다.
 *
 * 컴포넌트에 좌표·시간 상수를 직접 쓰지 않는다 (CLAUDE.md 8절 매직 넘버 금지).
 */

/**
 * 위치 권한이 없을 때의 시작 지점. frontend/.env.example 의 기본값과 일치시킬 것.
 *
 * 좌표는 마리나 베이 샌즈 — 관광·식당 밀집 지역이라 첫 화면이 비어 보이지 않는다.
 * 줌 15는 화면 세로 기준 반경 약 2km에 해당한다 (백엔드 기본 조회 반경 1.5km보다
 * 조금 넓어, 조회된 핀이 화면 밖으로 잘리지 않는다).
 */
const FALLBACK = {
  lat: 1.2834,
  lng: 103.8607,
  zoom: 15,
  debounceMs: 400,
} as const;

/**
 * 환경변수 문자열을 숫자로 읽는다.
 *
 * `Number('')`가 0을 반환하는 함정이 있어 빈 문자열을 먼저 걸러낸다.
 * 0은 경도로 유효한 값이므로 falsy 검사로 뭉개면 안 된다.
 */
export function parseNumberEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = import.meta.env;

export const MAP_DEFAULTS = {
  center: {
    lat: parseNumberEnv(env.VITE_MAP_DEFAULT_LAT, FALLBACK.lat),
    lng: parseNumberEnv(env.VITE_MAP_DEFAULT_LNG, FALLBACK.lng),
  },
  zoom: parseNumberEnv(env.VITE_MAP_DEFAULT_ZOOM, FALLBACK.zoom),
  /**
   * 지도 이동·줌 후 `/places/nearby` 호출까지의 지연.
   * 핀 조회를 붙이는 작업에서 이 값을 쓴다 (CLAUDE.md 3.3절, frontend/CLAUDE.md 비용/성능).
   */
  debounceMs: parseNumberEnv(env.VITE_MAP_DEBOUNCE_MS, FALLBACK.debounceMs),
} as const;

/**
 * 지도 렌더링 전용 키. Places 권한이 없는 키다 (frontend/.env.example 참고).
 * 이 키로 Places API를 호출하지 말 것 — 호출은 백엔드가 한다 (CLAUDE.md 2절).
 */
export const GOOGLE_MAPS_API_KEY = env.VITE_GOOGLE_MAPS_API_KEY ?? '';

/**
 * Cloud 기반 지도 스타일 ID.
 * 비어 있어도 기본 스타일로 지도는 뜬다. 후속 핀 작업에서 AdvancedMarker가 이 값을 요구한다.
 */
export const GOOGLE_MAPS_MAP_ID = env.VITE_GOOGLE_MAPS_MAP_ID ?? '';
