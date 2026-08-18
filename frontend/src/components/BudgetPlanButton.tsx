import { useState } from 'react';
import BudgetPlanForm from './BudgetPlanForm';
import BudgetPlanTable from './BudgetPlanTable';
import type { BudgetPlan } from '../api/types';
import './BudgetPlanButton.css';

/**
 * 예산 일정 진입점.
 *
 * Step 0 슬롯 구조(docs/frontend-agent-plan.md 2절)엔 예산 일정 전용 슬롯이 없어서,
 * B 소유 영역인 우측 하단(ReviewFab 옆)에 같은 방식으로 추가했다.
 * `frontend-agent-plan.md` 3절 소유권 표에 행을 추가해 반영했다.
 */
export default function BudgetPlanButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<BudgetPlan | null>(null);

  return (
    <>
      <button type="button" className="budget-plan-trigger" onClick={() => setIsOpen(true)}>
        예산 일정
      </button>

      {isOpen && (
        <div className="budget-plan-overlay" role="dialog" aria-modal="true" aria-label="예산 일정">
          <div className="overlay-card budget-plan-panel">
            <header className="budget-plan-panel-header">
              <h2>예산 일정</h2>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="닫기">
                ×
              </button>
            </header>

            <BudgetPlanForm onPlanCreated={setPlan} />
            {plan && <BudgetPlanTable plan={plan} />}
          </div>
        </div>
      )}
    </>
  );
}
