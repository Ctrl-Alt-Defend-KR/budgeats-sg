import MapView from './components/MapView';
import PriceTierLegend from './components/PriceTierLegend';

/**
 * 화면 골격.
 *
 * 지도가 뷰포트를 채우고 그 위에 오버레이를 얹는다.
 * 오른쪽(추천 사이드바)과 오른쪽 아래((+) 리뷰 작성 버튼)는 후속 작업 자리로 비워 둔다.
 * 왼쪽 아래는 Google attribution 영역이므로 아무것도 얹지 않는다 (CLAUDE.md 3.1절).
 */
export default function App() {
  return (
    <div className="app">
      <MapView />

      <div className="overlay-top-left">
        <header className="overlay-card brand">
          <h1 className="brand-title">BudgEats SG</h1>
          <p className="brand-subtitle">싱가포르 유학생을 위한 예산 기반 식당 추천</p>
        </header>

        <PriceTierLegend />
      </div>
    </div>
  );
}
