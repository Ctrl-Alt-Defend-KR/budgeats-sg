import type { VisitType } from '../api/types';

/**
 * 리뷰 태그·방문 유형 표시 상수.
 *
 * CLAUDE.md 11절 "태그 항목 최종 확정"은 아직 미확정이다. 팀 확정 전까지는
 * 루트 CLAUDE.md 4절(taste_tags/student_tags 컬럼 주석)에 적힌 예시 값을 그대로 쓴다.
 * 확정되면 이 배열만 교체하면 되고, 컴포넌트에는 값을 하드코딩하지 않는다 (CLAUDE.md 8절).
 */
export const TASTE_TAG_OPTIONS = ['한국인 입맛 맞음', '안 짜요', '향신료 약함', '매운맛 있음'] as const;

export const STUDENT_TAG_OPTIONS = ['가성비', '양 많음', '혼밥 가능', '포장 가능', '카드 결제 가능'] as const;

/** `visitType`은 서버와 대문자로 주고받는다 (계약 6절). 화면에는 한글 라벨만 노출한다 */
export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  SOLO: '혼밥',
  FRIENDS: '친구',
  GROUP: '단체',
  OTHER: '기타',
};

/** 루트 CLAUDE.md 4절: content 최대 1000자 */
export const REVIEW_CONTENT_MAX_LENGTH = 1000;
