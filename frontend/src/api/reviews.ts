import { apiFetch } from './client';
import type {
  ReviewCreateRequest,
  ReviewDeleteResponse,
  ReviewItem,
  ReviewMutationResponse,
  ReviewUpdateRequest,
} from './types';

/** `GET /places/:placeId/reviews` — 최신순 (계약 6.6절). */
export async function fetchReviews(placeId: string, signal?: AbortSignal): Promise<ReviewItem[]> {
  const { reviews } = await apiFetch<{ reviews: ReviewItem[] }>(
    `/places/${encodeURIComponent(placeId)}/reviews`,
    { signal },
  );
  return reviews;
}

/**
 * 자체 리뷰 작성. 요청에는 `placeId` 외 구글 데이터(식당명·주소 등)를 넣지 않는다
 * (CLAUDE.md 3.1절, 계약 6.6절).
 *
 * 같은 사용자가 같은 장소에 이미 리뷰를 남겼으면 서버가 409 `CONFLICT`를 준다
 * (`UNIQUE(user_id, place_id)`). 호출부(`ReviewForm`)는 이를 받아 수정 모드로 전환한다.
 */
export async function createReview(request: ReviewCreateRequest): Promise<ReviewMutationResponse> {
  return apiFetch<ReviewMutationResponse>('/reviews', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * `PATCH /reviews/:id` — `placeId`를 제외한 부분 집합만 보낸다 (계약 6.6절).
 * 작성자 검증은 **서버가** 한다. 프론트의 `mine` 분기는 UX일 뿐 보안 수단이 아니다.
 */
export async function updateReview(
  id: number,
  patch: ReviewUpdateRequest,
): Promise<ReviewMutationResponse> {
  return apiFetch<ReviewMutationResponse>(`/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** `DELETE /reviews/:id` — 응답에 리뷰 객체는 없고 갱신된 등급만 온다 (계약 6.6절). */
export async function deleteReview(id: number): Promise<ReviewDeleteResponse> {
  return apiFetch<ReviewDeleteResponse>(`/reviews/${id}`, { method: 'DELETE' });
}
