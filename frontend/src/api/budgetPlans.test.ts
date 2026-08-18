import { describe, expect, it } from 'vitest';
import { createBudgetPlan } from './budgetPlans';

describe('createBudgetPlan (mock)', () => {
  it('요청한 기간·끼니수만큼 일정을 만든다', async () => {
    const plan = await createBudgetPlan({
      totalBudgetSgd: 300,
      days: 5,
      mealsPerDay: 3,
      lat: 1.3521,
      lng: 103.8198,
    });

    expect(plan.days).toHaveLength(5);
    expect(plan.days.every((day) => day.meals.length === 3)).toBe(true);
  });

  it('끼니당 예산을 총예산/(기간*끼니수)로 계산한다 (CLAUDE.md 5.3절)', async () => {
    const plan = await createBudgetPlan({
      totalBudgetSgd: 300,
      days: 5,
      mealsPerDay: 3,
      lat: 1.3521,
      lng: 103.8198,
    });

    expect(plan.perMealBudgetSgd).toBeCloseTo(20, 5);
  });

  it('예산이 아주 낮으면 저가 등급을 목표로 하고 배정 실패 끼니는 place가 null이다', async () => {
    const plan = await createBudgetPlan({
      totalBudgetSgd: 1,
      days: 1,
      mealsPerDay: 3,
      lat: 1.3521,
      lng: 103.8198,
    });

    expect(plan.targetPriceTier).toBe('low');
    for (const day of plan.days) {
      for (const meal of day.meals) {
        expect(meal.place === null || meal.place.priceTier === 'low').toBe(true);
      }
    }
  });

  it('일정 저장 관련 필드가 없다 (무상태 계산 API, CLAUDE.md 4절)', async () => {
    const plan = await createBudgetPlan({
      totalBudgetSgd: 300,
      days: 2,
      mealsPerDay: 2,
      lat: 1.3521,
      lng: 103.8198,
    });

    expect(plan).not.toHaveProperty('id');
    expect(plan).not.toHaveProperty('savedAt');
  });
});
