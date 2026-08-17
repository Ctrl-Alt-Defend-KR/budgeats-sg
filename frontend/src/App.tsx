import MapView from './components/MapView';
import PriceTierLegend from './components/PriceTierLegend';

/**
 * 화면 골격.
 *
 * 지도가 뷰포트를 채우고 그 위에 오버레이를 얹는다.
 * **Step 0 이후 동결된 파일이다** (docs/frontend-agent-plan.md 2절).
 * 각 에이전트는 아래 슬롯 안에 자기 컴포넌트를 꽂기만 하고, 로직을 여기에 쓰지 않는다.
 * 구조를 바꿔야 하면 8.2절 핸드오프 절차를 따른다.
 *
 * 왼쪽 아래는 Google attribution 영역이므로 슬롯을 두지 않는다 (CLAUDE.md 3.1절).
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

      {/* 슬롯 — 로그인 버튼(B), 추천 사이드바(A) */}
      <div className="overlay-top-right">
        {/* B: <LoginButton /> */}
        {/* A: <Sidebar /> */}
      </div>

      {/* 슬롯 — (+) 리뷰 작성 버튼(B) */}
      <div className="overlay-bottom-right">
        {/* B: <ReviewFab /> */}
      </div>

      {/* 슬롯 — 모달(B): 장소 검색 팝업, 리뷰 폼, 예산 일정.
          모달은 라우터 없이 상태로 여닫는다 (의존성 추가 금지 — 계획서 7절). */}
    </div>
  );
}
