import { useEffect, useRef, useState } from 'react';
import BudgetPlanButton from './components/BudgetPlanButton';
import LoginButton from './components/LoginButton';
import MapView, { type MapViewHandle } from './components/MapView';
import PriceTierLegend from './components/PriceTierLegend';
import ReviewFab from './components/ReviewFab';
import Sidebar from './components/Sidebar';
import { MAP_DEFAULTS } from './constants/map';
import { type MapCenter, useNearbyPlaces } from './hooks/useNearbyPlaces';
import type { PlaceSearchResult, PlaceSummary, PriceTierMetadata } from './api/types';
import { fetchPriceTierMetadata } from './api/meta';
import { useAuth } from './hooks/useAuth';
import PlaceReviewDialog from './components/PlaceReviewDialog';
import MyReviewsDialog from './components/MyReviewsDialog';

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
  const { places, loading, error, retry, applyPlaceGradePatch } = useNearbyPlaces(center);
  const mapRef = useRef<MapViewHandle>(null);
  const { user } = useAuth();
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | PlaceSearchResult | null>(null);
  const [priceMetadata, setPriceMetadata] = useState<PriceTierMetadata | null>(null);
  const [showMyReviews, setShowMyReviews] = useState(false);

  useEffect(() => { fetchPriceTierMetadata().then(setPriceMetadata).catch(() => setPriceMetadata(null)); }, []);

  const selectNearbyPlace = (place: PlaceSummary) => {
    mapRef.current?.focusPlace(place.placeId);
    setSelectedPlace(place);
  };

  useEffect(() => {
    if (error) {
      // 사용자에게는 Sidebar가 에러·재시도 UI를 보여준다. 여기서는 원인 추적용 로그만 남긴다.
      console.error('[App] 주변 식당 조회 실패', error);
    }
  }, [error]);

  return (
    <div className="app">
      <MapView ref={mapRef} center={center} places={places} onCenterChanged={setCenter} selectedPlaceId={selectedPlace?.placeId ?? null} onSelectPlace={selectNearbyPlace} />

      <div className="overlay-top-left">
        <header className="overlay-card brand">
          <h1 className="brand-title">BudgEats SG</h1>
          <p className="brand-subtitle">싱가포르 유학생을 위한 예산 기반 식당 추천</p>
        </header>

        <PriceTierLegend metadata={priceMetadata} />
      </div>

      <div className="overlay-top-right">
        <LoginButton onMyReviews={() => setShowMyReviews(true)} />
        <Sidebar
          places={places}
          loading={loading}
          error={error}
          onSelectPlace={selectNearbyPlace}
          onRetry={retry}
        />
      </div>

      {/* 슬롯 — (+) 리뷰 작성 버튼(B) + 예산 일정 진입 버튼(B, Day 3 추가 — 전용 슬롯이
          없어 같은 영역에 얹었다. docs/frontend-agent-plan.md 3절에 근거 기록) */}
      <div className="overlay-bottom-right">
        <BudgetPlanButton />
        {/* 리뷰 저장·삭제 응답에 갱신된 등급이 실려 오므로, /places/nearby를 다시
            부르지 않고 해당 핀 하나만 다시 칠한다 (frontend-agent-plan.md 2절 seam). */}
        <ReviewFab onSelectPlace={setSelectedPlace} />
      </div>

      {selectedPlace && <PlaceReviewDialog place={selectedPlace} user={user} onClose={() => setSelectedPlace(null)} onPlaceUpdated={applyPlaceGradePatch} />}
      {showMyReviews && <MyReviewsDialog places={places} onClose={() => setShowMyReviews(false)} onSelectPlace={(place) => { setShowMyReviews(false); setSelectedPlace(place); }} />}
    </div>
  );
}
