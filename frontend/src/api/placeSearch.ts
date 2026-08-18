import type { PlaceSearchResult } from './types';

/**
 * 백엔드 연동 전 목(mock) 레이어.
 *
 * `api/places.ts`는 `/places/nearby` 전용으로 Agent A가 소유한다
 * (docs/frontend-agent-plan.md 3절). `/places/search`는 그 표에 빠져 있어
 * 문서 관리자(FE-B) 권한으로 이 파일을 새로 만들어 채운다 — 같은 파일을 두 에이전트가
 * 건드리지 않도록 하기 위함이다. frontend-agent-plan.md 3절에 행을 추가해 두었다.
 */
const MOCK_PLACES: PlaceSearchResult[] = [
  { placeId: 'ChIJMOCK00000001', name: 'Maxwell Food Centre', address: '1 Kadayanallur St, Singapore' },
  {
    placeId: 'ChIJMOCK00000002',
    name: 'Tian Tian Hainanese Chicken Rice',
    address: '1 Kadayanallur St #01-10, Singapore',
  },
  { placeId: 'ChIJMOCK00000003', name: 'Ya Kun Kaya Toast', address: '18 China St, Singapore' },
  { placeId: 'ChIJMOCK00000004', name: 'Nasi Lemak Ayam Taliwang', address: '2 Orchard Turn, Singapore' },
];

const MOCK_DELAY_MS = 250;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/**
 * 리뷰 작성 팝업의 장소 검색. Places Autocomplete 위젯을 직접 쓰지 않고
 * 백엔드 `GET /places/search?query=`를 경유한다 (frontend/CLAUDE.md).
 *
 * 백엔드 연동 시 교체할 실제 구현 (시그니처는 그대로 유지):
 * ```ts
 * import { apiFetch } from './client';
 * import type { PlaceSearchResponse } from './types';
 *
 * export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]> {
 *   if (!query.trim()) return [];
 *   const { places } = await apiFetch<PlaceSearchResponse>(
 *     `/places/search?query=${encodeURIComponent(query)}`,
 *     { signal },
 *   );
 *   return places;
 * }
 * ```
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  await delay(MOCK_DELAY_MS, signal);

  const q = trimmed.toLowerCase();
  return MOCK_PLACES.filter(
    (place) => place.name.toLowerCase().includes(q) || place.address.toLowerCase().includes(q),
  );
}
