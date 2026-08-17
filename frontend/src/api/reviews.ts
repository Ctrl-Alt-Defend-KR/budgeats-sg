import { ApiError } from './client';
import type { PriceTier } from '../constants/price';
import type {
  PlaceGradePatch,
  ReviewCreateRequest,
  ReviewDeleteResponse,
  ReviewItem,
  ReviewMutationResponse,
  ReviewUpdateRequest,
} from './types';

/**
 * 백엔드 연동 전 목(mock) 레이어.
 * `placeId → 리뷰[]` 인메모리 저장소로 작성·수정·삭제·중복 작성(409)까지 흉내 낸다.
 * 새로고침하면 아래 시드로 초기화된다 — 브라우저 저장소는 쓰지 않는다 (CLAUDE.md 3.2절).
 */
const MOCK_DELAY_MS = 400;

function delay<T>(value: T, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(value), MOCK_DELAY_MS);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

let nextId = 100;

const store = new Map<string, ReviewItem[]>([
  [
    'ChIJMOCK00000001',
    [
      {
        id: 1,
        authorName: '유진',
        isAnonymous: false,
        rating: 5,
        pricePerPerson: 6,
        content: '치킨라이스 진짜 싸고 맛있어요. 유학생 필수 코스.',
        tasteTags: ['한국인 입맛 맞음'],
        studentTags: ['가성비', '혼밥 가능'],
        visitType: 'SOLO',
        revisit: true,
        createdAt: '2026-08-10T09:00:00Z',
        updatedAt: '2026-08-10T09:00:00Z',
        mine: false,
      },
      {
        id: 2,
        authorName: null,
        isAnonymous: true,
        rating: 4,
        pricePerPerson: 7,
        content: '향신료가 좀 있지만 적응되면 괜찮아요.',
        tasteTags: ['향신료 약함'],
        studentTags: ['양 많음'],
        visitType: 'FRIENDS',
        revisit: false,
        createdAt: '2026-08-12T11:30:00Z',
        updatedAt: '2026-08-12T11:30:00Z',
        mine: false,
      },
    ],
  ],
]);

/**
 * 등급 산정은 원래 백엔드가 한다 (CLAUDE.md 5.1절, 경계값·N 미확정 — 11절).
 * 여기 임계값은 목 데이터로 화면을 시연하기 위한 근사치일 뿐이며,
 * 백엔드 연동 시 이 파일과 함께 통째로 사라진다.
 */
const MOCK_LOW_MAX_SGD = 8;
const MOCK_MID_MAX_SGD = 15;

function mockPriceTier(avg: number): PriceTier {
  if (avg <= MOCK_LOW_MAX_SGD) return 'low';
  if (avg <= MOCK_MID_MAX_SGD) return 'mid';
  return 'high';
}

function recalcPlace(placeId: string): PlaceGradePatch {
  const reviews = store.get(placeId) ?? [];
  if (reviews.length === 0) {
    return {
      placeId,
      priceTier: 'mid',
      priceTierSource: 'unknown',
      actualAvgPricePerPerson: null,
      ownReviewCount: 0,
    };
  }

  const avg = reviews.reduce((sum, r) => sum + r.pricePerPerson, 0) / reviews.length;
  return {
    placeId,
    priceTier: mockPriceTier(avg),
    priceTierSource: 'actual',
    actualAvgPricePerPerson: Math.round(avg * 100) / 100,
    ownReviewCount: reviews.length,
  };
}

/**
 * `GET /places/:placeId/reviews` 목. 최신순으로 반환한다.
 *
 * 백엔드 연동 시 교체할 실제 구현 (시그니처는 그대로 유지):
 * ```ts
 * import { apiFetch } from './client';
 *
 * export async function fetchReviews(placeId: string, signal?: AbortSignal): Promise<ReviewItem[]> {
 *   const { reviews } = await apiFetch<{ reviews: ReviewItem[] }>(
 *     `/places/${placeId}/reviews`,
 *     { signal },
 *   );
 *   return reviews;
 * }
 * ```
 */
export async function fetchReviews(placeId: string, signal?: AbortSignal): Promise<ReviewItem[]> {
  const reviews = await delay(store.get(placeId) ?? [], signal);
  return [...reviews];
}

/**
 * 자체 리뷰 작성. 요청에는 `placeId` 외 구글 데이터(식당명·주소 등)를 넣지 않는다
 * (CLAUDE.md 3.1절, 계약 6.6절).
 *
 * 이미 같은 사용자가 이 장소에 리뷰를 남겼으면 `ApiError('CONFLICT', …, 409)`를 던진다 —
 * `UNIQUE(user_id, place_id)` 제약을 목으로 흉내 낸 것이다 (CLAUDE.md 4절).
 * 호출부(`ReviewForm`)는 이 에러를 받아 수정 모드로 전환해야 한다 (계약 6.6절 상태 코드 표).
 *
 * 백엔드 연동 시 교체할 실제 구현 (시그니처는 그대로 유지):
 * ```ts
 * import { apiFetch } from './client';
 *
 * export async function createReview(
 *   request: ReviewCreateRequest,
 * ): Promise<ReviewMutationResponse> {
 *   return apiFetch<ReviewMutationResponse>('/reviews', {
 *     method: 'POST',
 *     body: JSON.stringify(request),
 *   });
 * }
 * ```
 */
export async function createReview(request: ReviewCreateRequest): Promise<ReviewMutationResponse> {
  const existing = store.get(request.placeId) ?? [];
  if (existing.some((r) => r.mine)) {
    await delay(undefined);
    throw new ApiError('CONFLICT', '이미 이 식당에 작성한 리뷰가 있습니다.', 409);
  }

  const review: ReviewItem = {
    id: nextId++,
    authorName: request.isAnonymous ? null : '나',
    isAnonymous: request.isAnonymous,
    rating: request.rating,
    pricePerPerson: request.pricePerPerson,
    content: request.content,
    tasteTags: request.tasteTags,
    studentTags: request.studentTags,
    visitType: request.visitType,
    revisit: request.revisit,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mine: true,
  };
  store.set(request.placeId, [review, ...existing]);

  return delay({ review, place: recalcPlace(request.placeId) });
}

/**
 * `PATCH /reviews/:id` 목. 본인 리뷰가 아니면 403, 없으면 404.
 * (실제 백엔드는 인가를 서버에서 검증한다 — 이 분기는 그 흉내일 뿐이다.)
 */
export async function updateReview(
  id: number,
  patch: ReviewUpdateRequest,
): Promise<ReviewMutationResponse> {
  for (const [placeId, reviews] of store) {
    const index = reviews.findIndex((r) => r.id === id);
    if (index === -1) continue;

    if (!reviews[index].mine) {
      await delay(undefined);
      throw new ApiError('FORBIDDEN', '본인이 작성한 리뷰만 수정할 수 있습니다.', 403);
    }

    const current = reviews[index];
    const updated: ReviewItem = {
      ...current,
      ...patch,
      authorName: patch.isAnonymous === undefined ? current.authorName : patch.isAnonymous ? null : '나',
      updatedAt: new Date().toISOString(),
    };
    reviews[index] = updated;

    return delay({ review: updated, place: recalcPlace(placeId) });
  }

  await delay(undefined);
  throw new ApiError('NOT_FOUND', '리뷰를 찾을 수 없습니다.', 404);
}

/** `DELETE /reviews/:id` 목. */
export async function deleteReview(id: number): Promise<ReviewDeleteResponse> {
  for (const [placeId, reviews] of store) {
    const index = reviews.findIndex((r) => r.id === id);
    if (index === -1) continue;

    if (!reviews[index].mine) {
      await delay(undefined);
      throw new ApiError('FORBIDDEN', '본인이 작성한 리뷰만 삭제할 수 있습니다.', 403);
    }

    reviews.splice(index, 1);
    return delay({ place: recalcPlace(placeId) });
  }

  await delay(undefined);
  throw new ApiError('NOT_FOUND', '리뷰를 찾을 수 없습니다.', 404);
}
