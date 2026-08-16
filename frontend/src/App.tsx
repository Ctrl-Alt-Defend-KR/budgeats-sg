import { PRICE_TIERS, PRICE_TIER_COLOR, PRICE_TIER_LABEL } from './constants/price';

/**
 * 뼈대 화면.
 * 지도(FE-A)와 사이드바·리뷰 폼(FE-B)이 이 자리를 채운다.
 */
export default function App() {
  return (
    <main className="app">
      <h1>BudgEats SG</h1>
      <p>싱가포르 유학생을 위한 예산 기반 식당 추천</p>

      <section>
        <h2>가격 등급</h2>
        <ul className="tier-list">
          {PRICE_TIERS.map((tier) => (
            <li key={tier}>
              <span className="tier-dot" style={{ backgroundColor: PRICE_TIER_COLOR[tier] }} />
              {PRICE_TIER_LABEL[tier]}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
