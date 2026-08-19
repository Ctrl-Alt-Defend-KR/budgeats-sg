import { apiFetch } from './client';
import type { PlaceSearchResponse, PlaceSearchResult } from './types';

/**
 * 리뷰 작성 팝업의 장소 검색. Places Autocomplete 위젯을 직접 쓰지 않고
 * 백엔드 `GET /places/search?query=`를 경유한다 (frontend/CLAUDE.md).
 *
 * `api/places.ts`는 `/places/nearby` 전용으로 Agent A가 소유한다
 * (docs/frontend-agent-plan.md 3절). `/places/search`는 그 표에 빠져 있어
 * 이 파일로 분리했다 — 같은 파일을 두 에이전트가 건드리지 않도록 하기 위함이다.
 *
 * 응답에는 `placeId`/`name`/`address`만 온다. 평점·좌표를 요청하지 않는 것은
 * 팝업에 불필요하고 Places SKU가 올라가기 때문이다 (계약 6.4절).
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  // 빈 검색어로 서버를 부르지 않는다 — 백엔드가 @NotBlank로 400을 돌려준다.
  if (!trimmed) {
    return [];
  }

  const { places } = await apiFetch<PlaceSearchResponse>(
    `/places/search?query=${encodeURIComponent(trimmed)}`,
    { signal },
  );
  return places;
}
