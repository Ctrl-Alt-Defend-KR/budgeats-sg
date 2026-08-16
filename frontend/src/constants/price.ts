/**
 * 가격 등급 표시 상수.
 *
 * 경계값(8/15 SGD)과 실측 채택 기준 N은 **서버가 판단한다**.
 * 프론트는 서버가 내려준 등급만 받아 색상·라벨로 옮긴다.
 * 경계값을 이 파일에 복제하지 말 것 — 양쪽이 어긋나면 핀 색상이 서버와 달라진다.
 */

export const PRICE_TIERS = ['low', 'mid', 'high'] as const;

export type PriceTier = (typeof PRICE_TIERS)[number];

/** 핀 색상 (CLAUDE.md 5.1절: 초록/노랑/빨강) */
export const PRICE_TIER_COLOR: Record<PriceTier, string> = {
  low: '#2E7D32',
  mid: '#F9A825',
  high: '#C62828',
};

/**
 * 색상만으로 등급을 구분하지 않도록 라벨을 함께 노출한다.
 * 색각 이상 사용자를 고려한 요구사항 (SRS NFR-U2).
 */
export const PRICE_TIER_LABEL: Record<PriceTier, string> = {
  low: '저가',
  mid: '중가',
  high: '고가',
};
