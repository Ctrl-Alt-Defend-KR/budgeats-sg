import { apiFetch } from './client';
import type { BudgetPlan, BudgetPlanRequest } from './types';

/**
 * 예산 기반 식사 일정 생성 (계약 6.7절).
 *
 * **무상태 API다.** 서버는 요청값으로 계산해 즉시 반환할 뿐 아무것도 저장하지 않으므로,
 * 일정 저장·조회·목록 UI를 만들지 않는다 (CLAUDE.md 4절).
 *
 * 배정에 실패한 끼니는 `place: null`로 오고, 그 사유는 `notice`에 담긴다.
 * 모든 끼니가 배정되면 `notice`는 `null`이다.
 */
export async function createBudgetPlan(request: BudgetPlanRequest): Promise<BudgetPlan> {
  return apiFetch<BudgetPlan>('/budget-plans', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
