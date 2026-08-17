import type { PriceTier } from '../constants/price';
import type { BudgetPlan, BudgetPlanDay, BudgetPlanRequest, PlaceSummary } from './types';

/**
 * 백엔드 연동 전 목(mock) 레이어.
 *
 * `POST /budget-plans`는 무상태 계산 API다 — 여기서도 아무것도 저장하지 않는다
 * (CLAUDE.md 4절). 등급별로 후보 식당을 뽑아 끼니에 라운드로빈으로 배정하는
 * 근사치일 뿐, 실제 배정 알고리즘(동일 카테고리 연속 배정 회피 등, CLAUDE.md 5.3절)은
 * 백엔드가 구현한다.
 */
const MOCK_DELAY_MS = 500;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

const MOCK_PLACE_POOL: PlaceSummary[] = [
  {
    placeId: 'ChIJMOCK00000001',
    name: 'Maxwell Food Centre',
    address: '1 Kadayanallur St, Singapore',
    rating: 4.3,
    userRatingCount: 812,
    lat: 1.2803,
    lng: 103.8451,
    priceTier: 'low',
    priceTierSource: 'actual',
    actualAvgPricePerPerson: 6.5,
    ownReviewCount: 4,
  },
  {
    placeId: 'ChIJMOCK00000002',
    name: 'Tian Tian Hainanese Chicken Rice',
    address: '1 Kadayanallur St #01-10, Singapore',
    rating: 4.5,
    userRatingCount: 2100,
    lat: 1.2803,
    lng: 103.8451,
    priceTier: 'low',
    priceTierSource: 'actual',
    actualAvgPricePerPerson: 6,
    ownReviewCount: 12,
  },
  {
    placeId: 'ChIJMOCK00000003',
    name: 'Ya Kun Kaya Toast',
    address: '18 China St, Singapore',
    rating: 4.1,
    userRatingCount: 540,
    lat: 1.2825,
    lng: 103.8477,
    priceTier: 'low',
    priceTierSource: 'google',
    actualAvgPricePerPerson: null,
    ownReviewCount: 0,
  },
  {
    placeId: 'ChIJMOCK00000005',
    name: 'PUTIEN',
    address: '2 Orchard Turn, Singapore',
    rating: 4.2,
    userRatingCount: 1800,
    lat: 1.3006,
    lng: 103.8368,
    priceTier: 'mid',
    priceTierSource: 'google',
    actualAvgPricePerPerson: null,
    ownReviewCount: 0,
  },
  {
    placeId: 'ChIJMOCK00000006',
    name: 'Din Tai Fung',
    address: '2 Orchard Turn #04-12, Singapore',
    rating: 4.4,
    userRatingCount: 3400,
    lat: 1.3006,
    lng: 103.8368,
    priceTier: 'mid',
    priceTierSource: 'google',
    actualAvgPricePerPerson: null,
    ownReviewCount: 0,
  },
  {
    placeId: 'ChIJMOCK00000007',
    name: 'Burnt Ends',
    address: '20 Teck Lim Rd, Singapore',
    rating: 4.6,
    userRatingCount: 950,
    lat: 1.2814,
    lng: 103.8391,
    priceTier: 'high',
    priceTierSource: 'google',
    actualAvgPricePerPerson: null,
    ownReviewCount: 0,
  },
];

/**
 * 등급 임계값(8/15 SGD)은 백엔드가 확정한다 (CLAUDE.md 5.1절, 11절 미확정).
 * 여기 값은 목 시연용 근사치이며, 백엔드 연동 시 이 파일과 함께 사라진다.
 */
const MOCK_LOW_MAX_SGD = 8;
const MOCK_MID_MAX_SGD = 15;

function tierForBudget(perMealBudgetSgd: number): PriceTier {
  if (perMealBudgetSgd < MOCK_LOW_MAX_SGD) return 'low';
  if (perMealBudgetSgd < MOCK_MID_MAX_SGD) return 'mid';
  return 'high';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * `POST /budget-plans` 목.
 *
 * 백엔드 연동 시 교체할 실제 구현 (시그니처는 그대로 유지):
 * ```ts
 * import { apiFetch } from './client';
 *
 * export async function createBudgetPlan(request: BudgetPlanRequest): Promise<BudgetPlan> {
 *   return apiFetch<BudgetPlan>('/budget-plans', {
 *     method: 'POST',
 *     body: JSON.stringify(request),
 *   });
 * }
 * ```
 */
export async function createBudgetPlan(request: BudgetPlanRequest): Promise<BudgetPlan> {
  const totalMeals = request.days * request.mealsPerDay;
  const perMealBudgetSgd = round2(request.totalBudgetSgd / totalMeals);
  const targetPriceTier = tierForBudget(perMealBudgetSgd);

  const candidates = MOCK_PLACE_POOL.filter((place) => place.priceTier === targetPriceTier);

  let notice: string | null = null;
  if (candidates.length === 0) {
    notice = '조건에 맞는 식당이 부족해 일부 끼니를 비워 두었습니다.';
  } else if (candidates.length < totalMeals) {
    notice = '식당 종류가 적어 일부 끼니가 겹칠 수 있습니다.';
  }

  let cursor = 0;
  const days: BudgetPlanDay[] = Array.from({ length: request.days }, (_, dayIdx) => ({
    day: dayIdx + 1,
    meals: Array.from({ length: request.mealsPerDay }, (_, mealIdx) => {
      const place = candidates.length > 0 ? candidates[cursor % candidates.length] : null;
      cursor += 1;
      return { mealIndex: mealIdx + 1, place };
    }),
  }));

  return delay({ perMealBudgetSgd, targetPriceTier, days, notice });
}
