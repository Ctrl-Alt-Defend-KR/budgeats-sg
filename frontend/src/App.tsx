import { useEffect, useRef, useState } from 'react';
import MapView, { type MapViewHandle } from './components/MapView';
import PriceTierLegend from './components/PriceTierLegend';
import Sidebar from './components/Sidebar';
import { useNearbyPlaces, type MapCenter } from './hooks/useNearbyPlaces';
import { MAP_DEFAULTS } from './constants/map';

/**
 * 화면 골격.
 *
 * 지도가 뷰포트를 채우고 그 위에 오버레이를 얹는다.
 * **Step 0 이후 동결된 파일이다** (docs/frontend-agent-plan.md 2절).
 * 각 에이전트는 아래 슬롯 안에 자기 컴포넌트를 꽂기만 하고, 로직을 여기에 쓰지 않는다.
 * 구조를 바꿔야 하면 8.2절 핸드오프 절차를 따른다.
 *
 * **예외 — `useNearbyPlaces` 훅 호출 하나만 여기 둔다.** 지도(MapView)와 사이드바(Sidebar)가
 * 같은 `places` 데이터를 공유해야 하는데, 둘은 형제 컴포넌트라 공통 조상인 이 파일에서
 * 데이터를 한 번만 가져와 내려줘야 중복 조회(=과금)를 피한다. 리뷰·예산 등 B 소유
 * 비즈니스 로직은 여기 두지 않는다 — 그건 계속 각자 컴포넌트/훅 안에 있어야 한다.
 *
 * 왼쪽 아래는 Google attribution 영역이므로 슬롯을 두지 않는다 (CLAUDE.md 3.1절).
 */
export default function App() {
  const [center, setCenter] = useState<MapCenter>(MAP_DEFAULTS.center);
  const { places, error } = useNearbyPlaces(center);
  const mapRef = useRef<MapViewHandle>(null);

  useEffect(() => {
    if (error) {
      // 사용자용 에러 UI는 Day 3에서 다룬다. 지금은 콘솔로만 노출한다.
      console.error('[App] 주변 식당 조회 실패', error);
    }
  }, [error]);

  return (
    <div className="app">
      <MapView ref={mapRef} center={center} places={places} onCenterChanged={setCenter} />

      <div className="overlay-top-left">
        <header className="overlay-card brand">
          <h1 className="brand-title">BudgEats SG</h1>
          <p className="brand-subtitle">싱가포르 유학생을 위한 예산 기반 식당 추천</p>
        </header>

        <PriceTierLegend />
      </div>

      <div className="overlay-top-right">
        {/* B: <LoginButton /> — 리뷰 폼을 추가할 때 위 useNearbyPlaces(center)에서
            applyPlaceGradePatch도 구조분해해 콜백으로 넘긴다.
            예: <ReviewForm onSaved={(res) => applyPlaceGradePatch(res.place)} /> */}
        <Sidebar
          places={places}
          onSelectPlace={(placeId) => mapRef.current?.focusPlace(placeId)}
        />
      </div>

      {/* 슬롯 — (+) 리뷰 작성 버튼(B) */}
      <div className="overlay-bottom-right">{/* B: <ReviewFab /> */}</div>

      {/* 슬롯 — 모달(B): 장소 검색 팝업, 리뷰 폼, 예산 일정.
          모달은 라우터 없이 상태로 여닫는다 (의존성 추가 금지 — 계획서 7절). */}
    </div>
  );
}
