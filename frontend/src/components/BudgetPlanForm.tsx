import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { createBudgetPlan } from '../api/budgetPlans';
import { MAP_DEFAULTS } from '../constants/map';
import type { BudgetPlan } from '../api/types';
import './BudgetPlanForm.css';

const MIN_DAYS = 1;
const MAX_DAYS = 14;
const MIN_MEALS_PER_DAY = 1;
const MAX_MEALS_PER_DAY = 5;

interface BudgetPlanFormProps {
  onPlanCreated: (plan: BudgetPlan) => void;
}

/**
 * 총예산·기간·끼니수 입력 폼.
 *
 * 검색 반경 좌표는 아직 `useCurrentPosition`(A, Day 2)이 없으므로 지도 기본 중심
 * (`MAP_DEFAULTS.center`)을 그대로 쓴다 — A가 해당 훅을 붙이면 이 기본값과 동일한
 * 폴백을 쓰므로 자연스럽게 맞물린다.
 */
export default function BudgetPlanForm({ onPlanCreated }: BudgetPlanFormProps) {
  const [totalBudgetSgd, setTotalBudgetSgd] = useState('300');
  const [days, setDays] = useState('5');
  const [mealsPerDay, setMealsPerDay] = useState('3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const budget = Number(totalBudgetSgd);
    const dayCount = Number(days);
    const meals = Number(mealsPerDay);

    if (!Number.isFinite(budget) || budget <= 0) {
      setError('총예산을 올바르게 입력해 주세요.');
      return;
    }
    if (!Number.isInteger(dayCount) || dayCount < MIN_DAYS || dayCount > MAX_DAYS) {
      setError(`기간은 ${MIN_DAYS}~${MAX_DAYS}일 사이로 입력해 주세요.`);
      return;
    }
    if (!Number.isInteger(meals) || meals < MIN_MEALS_PER_DAY || meals > MAX_MEALS_PER_DAY) {
      setError(`하루 끼니수는 ${MIN_MEALS_PER_DAY}~${MAX_MEALS_PER_DAY} 사이로 입력해 주세요.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const plan = await createBudgetPlan({
        totalBudgetSgd: budget,
        days: dayCount,
        mealsPerDay: meals,
        lat: MAP_DEFAULTS.center.lat,
        lng: MAP_DEFAULTS.center.lng,
      });
      onPlanCreated(plan);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '예산 일정 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="budget-plan-form" onSubmit={handleSubmit}>
      <label>
        총예산 (SGD)
        <input
          type="number"
          min={0}
          step="1"
          value={totalBudgetSgd}
          onChange={(event) => setTotalBudgetSgd(event.target.value)}
          required
        />
      </label>

      <label>
        기간 (일)
        <input
          type="number"
          min={MIN_DAYS}
          max={MAX_DAYS}
          step="1"
          value={days}
          onChange={(event) => setDays(event.target.value)}
          required
        />
      </label>

      <label>
        하루 끼니수
        <input
          type="number"
          min={MIN_MEALS_PER_DAY}
          max={MAX_MEALS_PER_DAY}
          step="1"
          value={mealsPerDay}
          onChange={(event) => setMealsPerDay(event.target.value)}
          required
        />
      </label>

      {error && (
        <p className="budget-plan-form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '계산 중…' : '일정 만들기'}
      </button>
    </form>
  );
}
