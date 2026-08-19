/**
 * 백엔드 응답·요청 타입.
 *
 * **스키마 원본은 docs/backend-agent-plan.md 6절이다.** 여기서 필드를 협상하지 않는다.
 * 계약이 실제와 다르면 직접 고치지 말고 문서 관리자를 경유한다
 * (docs/frontend-agent-plan.md 6절).
 *
 * 이 파일은 Agent A/B 공용 seam이며 **동결** 대상이다.
 * 수정이 필요하면 frontend-agent-plan.md 8.2절 핸드오프 절차를 따른다.
 *
 * `api/client.ts`의 `apiFetch`가 `{ success, data }` 래퍼를 벗겨주므로,
 * 아래 타입들은 모두 `data` 안쪽 모양이다.
 */

import type { PriceTier } from '../constants/price';

/** 가격 등급의 산정 근거 (계약 6.1절) */
export type PriceTierSource = 'actual' | 'google' | 'unknown';

/**
 * 방문 유형.
 * `priceTier`가 소문자인 것과 달리 **대문자**다. 섞이기 쉬운 지점이라 상수로 고정한다.
 */
export const VISIT_TYPES = ['SOLO', 'FRIENDS', 'GROUP', 'OTHER'] as const;

export type VisitType = (typeof VISIT_TYPES)[number];

/** 계약 6.6절 상태 코드 표의 에러 코드. `ApiError.code`와 비교한다. */
export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SCHOOL_ACCOUNT_REQUIRED'
  | 'CAPTCHA_INVALID'
  | 'CAPTCHA_UNAVAILABLE'
  /**
   * 백엔드의 일반 폴백 코드. 계약 6.6절 상태 코드 표에는 없지만 실제로 내려온다
   * (예: Places 호출 실패 시 502 `ERROR`). 코드로 분기할 때 이 값을 놓치지 말 것.
   */
  | 'ERROR';

/** 계약 6.1절 — `/places/nearby`와 `/budget-plans`가 공유하는 모양 */
export interface PlaceSummary {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingCount: number;
  lat: number | null;
  lng: number | null;
  priceTier: PriceTier;
  priceTierSource: PriceTierSource;
  /** `priceTierSource`가 `'actual'`이 아니면 null */
  actualAvgPricePerPerson: number | null;
  ownReviewCount: number;
}

/**
 * 계약 6.4절 — 리뷰 작성 팝업용.
 * 평점·좌표가 오지 않는다. 팝업에 불필요하고 Places SKU가 올라가기 때문이다.
 */
export type PlaceSearchResult = Pick<PlaceSummary, 'placeId' | 'name' | 'address'>;

/** 계약 6.5절 — 상세: 6.1절 + 자체 리뷰 평점 평균 */
export interface PlaceDetail extends PlaceSummary {
  ownRatingAverage: number | null;
}

/**
 * 계약 6.6절 — 리뷰 저장·삭제 응답에 함께 오는 **갱신된 가격 등급**.
 *
 * 동결 seam이다. Agent B가 이 값을 `onPlaceUpdated`로 올리고 Agent A가 해당 핀만 다시 칠한다.
 * 이 응답이 있으므로 핀 갱신을 위해 `/places/nearby`를 재호출하지 않는다 —
 * 불필요한 Places 호출은 그대로 과금이다 (CLAUDE.md 3.3절).
 */
export type PlaceGradePatch = Pick<
  PlaceSummary,
  'placeId' | 'priceTier' | 'priceTierSource' | 'actualAvgPricePerPerson' | 'ownReviewCount'
>;

/** 계약 6.2절 — `googleSub`은 내려오지 않는다 (내부 식별자) */
export interface AuthUser {
  id: number;
  displayName: string;
  reviewEligible: boolean;
  school: string | null;
}

/** 계약 6.6절 리뷰 객체 */
export interface ReviewItem {
  id: number;
  placeId: string;
  /** `isAnonymous`가 true면 null */
  authorName: string | null;
  isAnonymous: boolean;
  rating: number;
  pricePerPerson: number;
  content: string;
  tasteTags: string[];
  studentTags: string[];
  visitType: VisitType;
  revisit: boolean;
  /** ISO-8601 UTC */
  createdAt: string;
  updatedAt: string;
  /**
   * 수정·삭제 버튼 노출용 편의 필드.
   * **인가는 서버가 한다.** 이 값을 보안 수단으로 쓰지 말 것 (frontend/CLAUDE.md 인증 절).
   */
  mine: boolean;
  freeWater: boolean | null;
  serviceCharge: boolean | null;
  taxCharge: boolean | null;
}

/** 계약 6.6절 — `POST /reviews` 요청. `placeId` 외 구글 데이터를 넣지 않는다 */
export interface ReviewCreateRequest {
  placeId: string;
  rating: number;
  pricePerPerson: number;
  content: string;
  tasteTags: string[];
  studentTags: string[];
  visitType: VisitType;
  revisit: boolean;
  isAnonymous: boolean;
  freeWater: boolean | null;
  serviceCharge: boolean | null;
  taxCharge: boolean | null;
  captchaToken: string;
}

/** `PATCH /reviews/:id` — `placeId`를 제외한 위 필드의 부분 집합 */
export type ReviewUpdateRequest = Partial<Omit<ReviewCreateRequest, 'placeId' | 'captchaToken'>>;

export interface PriceTierMetadata {
  currency: string;
  lowMaxInclusive: number;
  midMaxInclusive: number;
  actualMinReviews: number;
}

/** `POST` / `PATCH /reviews` 응답 */
export interface ReviewMutationResponse {
  review: ReviewItem;
  place: PlaceGradePatch;
}

/** `DELETE /reviews/:id` 응답 — 리뷰 객체가 없다 */
export interface ReviewDeleteResponse {
  place: PlaceGradePatch;
}

/** 계약 6.7절 — `POST /budget-plans` 요청 */
export interface BudgetPlanRequest {
  totalBudgetSgd: number;
  days: number;
  mealsPerDay: number;
  lat: number;
  lng: number;
  radius?: number;
}

export interface BudgetPlanMeal {
  mealIndex: number;
  /** 배정에 실패한 끼니는 null */
  place: PlaceSummary | null;
}

export interface BudgetPlanDay {
  day: number;
  meals: BudgetPlanMeal[];
}

/**
 * 계약 6.7절 응답.
 * 무상태 계산 결과이며 서버에 저장되지 않는다 — 일정 저장·조회 UI를 만들지 말 것.
 */
export interface BudgetPlan {
  perMealBudgetSgd: number;
  targetPriceTier: PriceTier;
  days: BudgetPlanDay[];
  /** 모든 끼니가 배정되면 null */
  notice: string | null;
}

/** 계약 6.3절 */
export interface NearbyPlacesResponse {
  places: PlaceSummary[];
}

/** 계약 6.4절 */
export interface PlaceSearchResponse {
  places: PlaceSearchResult[];
}

/** 계약 6.2절 */
export interface AuthMeResponse {
  user: AuthUser;
}

export interface MyReviewsResponse {
  reviews: ReviewItem[];
}
