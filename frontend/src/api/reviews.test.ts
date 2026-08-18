import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { createReview, deleteReview, fetchReviews, updateReview } from './reviews';
import type { ReviewCreateRequest } from './types';

function makeRequest(overrides: Partial<ReviewCreateRequest> = {}): ReviewCreateRequest {
  return {
    placeId: 'ChIJTEST0000',
    rating: 4,
    pricePerPerson: 7.5,
    content: '가성비 좋고 안 짜요',
    tasteTags: ['안 짜요'],
    studentTags: ['가성비'],
    visitType: 'SOLO',
    revisit: true,
    isAnonymous: false,
    ...overrides,
  };
}

/** 테스트마다 store 안 다른 식당을 쓰도록 매번 새 placeId를 만든다 (모듈 상태 공유 방지) */
let seq = 0;
function uniquePlaceId(): string {
  seq += 1;
  return `ChIJTEST${seq}`;
}

describe('createReview (mock)', () => {
  it('요청 필드를 그대로 반영한 리뷰 객체를 반환한다', async () => {
    const request = makeRequest({ placeId: uniquePlaceId() });
    const { review } = await createReview(request);

    expect(review).toMatchObject({
      rating: request.rating,
      pricePerPerson: request.pricePerPerson,
      content: request.content,
      visitType: request.visitType,
      mine: true,
    });
  });

  it('isAnonymous가 true면 authorName이 null이다', async () => {
    const { review } = await createReview(makeRequest({ placeId: uniquePlaceId(), isAnonymous: true }));

    expect(review.authorName).toBeNull();
  });

  it('갱신된 place 등급을 함께 반환한다 (onPlaceUpdated seam)', async () => {
    const placeId = uniquePlaceId();
    const { place } = await createReview(makeRequest({ placeId }));

    expect(place.placeId).toBe(placeId);
    expect(place.priceTierSource).toBe('actual');
  });

  it('같은 장소에 두 번째 작성을 시도하면 409 CONFLICT를 던진다', async () => {
    const placeId = uniquePlaceId();
    await createReview(makeRequest({ placeId }));

    await expect(createReview(makeRequest({ placeId }))).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });
});

describe('fetchReviews (mock)', () => {
  it('시드 데이터가 있는 장소는 리뷰 배열을 반환한다', async () => {
    const reviews = await fetchReviews('ChIJMOCK00000001');

    expect(reviews.length).toBeGreaterThan(0);
  });

  it('리뷰가 없는 장소는 빈 배열을 반환한다', async () => {
    await expect(fetchReviews(uniquePlaceId())).resolves.toEqual([]);
  });
});

describe('updateReview / deleteReview (mock)', () => {
  it('본인 리뷰를 수정하면 반영된 필드와 갱신된 place를 반환한다', async () => {
    const placeId = uniquePlaceId();
    const { review } = await createReview(makeRequest({ placeId }));

    const { review: updated } = await updateReview(review.id, { rating: 2, content: '재방문 후 낮춤' });

    expect(updated.rating).toBe(2);
    expect(updated.content).toBe('재방문 후 낮춤');
  });

  it('존재하지 않는 리뷰를 수정하면 404 NOT_FOUND를 던진다', async () => {
    await expect(updateReview(999_999, { rating: 3 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('타인 리뷰를 수정/삭제하면 403 FORBIDDEN을 던진다', async () => {
    // 시드 데이터의 id: 1은 mine: false (다른 사용자 리뷰)
    await expect(updateReview(1, { rating: 1 })).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    await expect(deleteReview(1)).rejects.toBeInstanceOf(ApiError);
  });

  it('본인 리뷰를 삭제하면 목록에서 사라지고 갱신된 place를 반환한다', async () => {
    const placeId = uniquePlaceId();
    const { review } = await createReview(makeRequest({ placeId }));

    const { place } = await deleteReview(review.id);

    expect(place.ownReviewCount).toBe(0);
    await expect(fetchReviews(placeId)).resolves.toEqual([]);
  });
});
