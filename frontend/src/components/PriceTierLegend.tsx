import { PRICE_TIERS, PRICE_TIER_COLOR, PRICE_TIER_LABEL } from '../constants/price';
import './PriceTierLegend.css';
import type { PriceTierMetadata } from '../api/types';

/**
 * 핀 색상 범례.
 *
 * 색상만으로 등급을 구분하지 않도록 라벨을 함께 노출한다.
 * 색각 이상 사용자를 고려한 요구사항이다 (SRS NFR-U2).
 */
export default function PriceTierLegend({ metadata }: { metadata: PriceTierMetadata | null }) {
  const ranges = metadata ? {
    low: `≤ ${metadata.lowMaxInclusive} ${metadata.currency}`,
    mid: `> ${metadata.lowMaxInclusive}–${metadata.midMaxInclusive} ${metadata.currency}`,
    high: `> ${metadata.midMaxInclusive} ${metadata.currency}`,
  } : null;
  return (
    <section className="overlay-card legend" aria-label="가격 등급 범례">
      <h2 className="legend-title">가격 등급</h2>
      <ul className="legend-list">
        {PRICE_TIERS.map((tier) => (
          <li key={tier}>
            <span
              className="legend-dot"
              style={{ backgroundColor: PRICE_TIER_COLOR[tier] }}
              aria-hidden="true"
            />
            {PRICE_TIER_LABEL[tier]}{ranges && <small>{ranges[tier]}</small>}
          </li>
        ))}
      </ul>
      <p className="legend-note">자체 리뷰 실측을 우선하며, 부족하면 Google 추정값을 사용합니다.</p>
    </section>
  );
}
