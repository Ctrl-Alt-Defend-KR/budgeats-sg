import { PRICE_TIER_LABEL } from '../constants/price';
import type { BudgetPlan } from '../api/types';
import './BudgetPlanTable.css';

interface BudgetPlanTableProps {
  plan: BudgetPlan;
}

/**
 * 예산 일정표. `place: null`인 끼니는 빈 칸으로 두고, `notice`가 있으면 그대로 보여준다
 * (docs/frontend-agent-plan.md 5절 Day 3). 이 화면엔 저장 버튼을 두지 않는다 —
 * `POST /budget-plans`는 무상태 계산 API다 (CLAUDE.md 4절).
 */
export default function BudgetPlanTable({ plan }: BudgetPlanTableProps) {
  const mealCount = plan.days[0]?.meals.length ?? 0;

  return (
    <div className="budget-plan-table-wrap">
      <p className="budget-plan-summary">
        끼니당 예산 <strong>{plan.perMealBudgetSgd.toLocaleString()} SGD</strong> · 목표 등급{' '}
        <strong>{PRICE_TIER_LABEL[plan.targetPriceTier]}</strong>
      </p>

      {plan.notice && (
        <p className="budget-plan-notice" role="status">
          {plan.notice}
        </p>
      )}

      <table className="budget-plan-table">
        <thead>
          <tr>
            <th scope="col">일차</th>
            {Array.from({ length: mealCount }, (_, i) => (
              <th scope="col" key={i}>
                {i + 1}번째 끼니
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.days.map((day) => (
            <tr key={day.day}>
              <th scope="row">{day.day}일차</th>
              {day.meals.map((meal) => (
                <td key={meal.mealIndex}>
                  {meal.place ? (
                    <>
                      <span className="budget-plan-place-name">{meal.place.name}</span>
                      <span className="budget-plan-place-tier">{PRICE_TIER_LABEL[meal.place.priceTier]}</span>
                    </>
                  ) : (
                    <span className="budget-plan-place-empty">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
