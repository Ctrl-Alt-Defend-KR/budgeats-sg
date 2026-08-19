import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBudgetPlan } from './budgetPlans';
import { lastRequest, stubApiSuccess } from './testing';
import type { BudgetPlan, BudgetPlanRequest } from './types';

const REQUEST: BudgetPlanRequest = {
  totalBudgetSgd: 300,
  days: 5,
  mealsPerDay: 3,
  lat: 1.2966,
  lng: 103.7764,
};

const PLAN: BudgetPlan = {
  perMealBudgetSgd: 20,
  targetPriceTier: 'high',
  days: [{ day: 1, meals: [{ mealIndex: 1, place: null }] }],
  notice: '조건에 맞는 식당이 부족해 일부 끼니를 비워 두었습니다.',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBudgetPlan', () => {
  it('POST /budget-plans로 요청 바디를 그대로 보낸다', async () => {
    const spy = stubApiSuccess(PLAN);

    await createBudgetPlan(REQUEST);

    const { url, init } = lastRequest(spy);
    expect(url).toContain('/budget-plans');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(REQUEST);
  });

  it('응답을 그대로 반환한다 — 배정 실패 끼니(place: null)와 notice 포함', async () => {
    stubApiSuccess(PLAN);

    const plan = await createBudgetPlan(REQUEST);

    expect(plan).toEqual(PLAN);
    expect(plan.days[0].meals[0].place).toBeNull();
    expect(plan.notice).not.toBeNull();
  });
});
