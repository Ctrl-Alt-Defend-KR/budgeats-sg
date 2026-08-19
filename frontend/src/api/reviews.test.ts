import { afterEach, describe, expect, it, vi } from 'vitest';
import { createReview, deleteReview, fetchMyReviews, fetchReviews, updateReview } from './reviews';
import { lastRequest, stubApiError, stubApiSuccess } from './testing';
import type { ReviewCreateRequest, ReviewItem } from './types';

const REVIEW: ReviewItem = {
  id: 12,
  placeId: 'ChIJ1',
  authorName: '지한',
  isAnonymous: false,
  rating: 4,
  pricePerPerson: 7.5,
  content: '가성비 좋고 안 짜요',
  tasteTags: ['안 짜요'],
  studentTags: ['가성비'],
  visitType: 'SOLO',
  revisit: true,
  createdAt: '2026-08-17T09:00:00Z',
  updatedAt: '2026-08-17T09:00:00Z',
  mine: true,
  freeWater: true,
  serviceCharge: false,
  taxCharge: null,
};

const PLACE_PATCH = {
  placeId: 'ChIJ1',
  priceTier: 'mid' as const,
  priceTierSource: 'actual' as const,
  actualAvgPricePerPerson: 9.2,
  ownReviewCount: 5,
};

const CREATE_REQUEST: ReviewCreateRequest = {
  placeId: 'ChIJ1',
  rating: 4,
  pricePerPerson: 7.5,
  content: '가성비 좋고 안 짜요',
  tasteTags: ['안 짜요'],
  studentTags: ['가성비'],
  visitType: 'SOLO',
  revisit: true,
  isAnonymous: false,
  freeWater: true,
  serviceCharge: false,
  taxCharge: null,
  captchaToken: 'turnstile-test-token',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchReviews', () => {
  it('응답의 reviews 배열을 꺼내 반환한다', async () => {
    stubApiSuccess({ reviews: [REVIEW] });

    await expect(fetchReviews('ChIJ1')).resolves.toEqual([REVIEW]);
  });

  it('placeId를 URL 인코딩한다', async () => {
    const spy = stubApiSuccess({ reviews: [] });

    await fetchReviews('ChIJ/with slash');

    expect(lastRequest(spy).url).toContain('/places/ChIJ%2Fwith%20slash/reviews');
  });
});

describe('fetchMyReviews', () => {
  it('GET /me/reviews 응답의 현재 사용자 리뷰 배열을 반환한다', async () => {
    const mine = { ...REVIEW, placeId: 'ChIJ1' };
    const spy = stubApiSuccess({ reviews: [mine] });
    await expect(fetchMyReviews()).resolves.toEqual([mine]);
    expect(lastRequest(spy).url).toContain('/me/reviews');
  });
});

describe('createReview', () => {
  it('POST /reviews로 요청 바디를 그대로 보낸다', async () => {
    const spy = stubApiSuccess({ review: REVIEW, place: PLACE_PATCH });

    await createReview(CREATE_REQUEST);

    const { url, init } = lastRequest(spy);
    expect(url).toContain('/reviews');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(CREATE_REQUEST);
  });

  it('요청에 구글 데이터(식당명·주소·평점)를 넣지 않는다 (CLAUDE.md 3.1절)', async () => {
    const spy = stubApiSuccess({ review: REVIEW, place: PLACE_PATCH });

    await createReview(CREATE_REQUEST);

    const body = JSON.parse(lastRequest(spy).init.body as string);
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('address');
    expect(body).not.toHaveProperty('rating_google');
  });

  it('갱신된 place 등급을 함께 반환한다 (onPlaceUpdated seam)', async () => {
    stubApiSuccess({ review: REVIEW, place: PLACE_PATCH });

    const response = await createReview(CREATE_REQUEST);

    expect(response.place).toEqual(PLACE_PATCH);
  });

  it('중복 작성은 409 CONFLICT로 올라온다 (수정 모드 전환 트리거)', async () => {
    stubApiError('CONFLICT', '이미 이 식당에 작성한 리뷰가 있습니다.', 409);

    await expect(createReview(CREATE_REQUEST)).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });
});

describe('updateReview', () => {
  it('PATCH /reviews/:id로 부분 필드만 보낸다', async () => {
    const spy = stubApiSuccess({ review: REVIEW, place: PLACE_PATCH });

    await updateReview(12, { rating: 5 });

    const { url, init } = lastRequest(spy);
    expect(url).toContain('/reviews/12');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ rating: 5 });
  });

  it('타인 리뷰 수정은 403으로 올라온다 (인가는 서버가 판단)', async () => {
    stubApiError('FORBIDDEN', '본인이 작성한 리뷰만 수정할 수 있습니다.', 403);

    await expect(updateReview(12, { rating: 5 })).rejects.toMatchObject({ status: 403 });
  });
});

describe('deleteReview', () => {
  it('DELETE /reviews/:id를 호출하고 갱신된 등급을 반환한다', async () => {
    const spy = stubApiSuccess({ place: PLACE_PATCH });

    const response = await deleteReview(12);

    const { url, init } = lastRequest(spy);
    expect(url).toContain('/reviews/12');
    expect(init.method).toBe('DELETE');
    // 계약 6.6절: DELETE 응답에는 review가 없고 place만 온다
    expect(response.place).toEqual(PLACE_PATCH);
  });
});
