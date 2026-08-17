import { useEffect, useState } from 'react';
import { APIProvider, Map, type MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID, MAP_DEFAULTS } from '../constants/map';
import { useNearbyPlaces, type MapCenter } from '../hooks/useNearbyPlaces';
import PinMarker from './PinMarker';
import './MapView.css';

/**
 * 지도 렌더링 + 핀.
 *
 * Maps JavaScript API만 사용한다. 장소 검색·주변 조회는 백엔드 `/places/*`를 쓴다 —
 * 이 컴포넌트에서 Places 관련 호출을 추가하지 말 것 (CLAUDE.md 2절, 3.1절).
 * (지금은 `api/places.ts`가 목을 반환한다 — docs/frontend-agent-plan.md 6절)
 *
 * Google attribution(로고)은 지도 컨테이너 **왼쪽 아래**에 그려진다.
 * 오버레이로 그 영역을 가리면 약관 위반이다. 레이아웃은 index.css 주석 참고.
 */
export default function MapView() {
  if (!GOOGLE_MAPS_API_KEY) {
    return <MissingApiKeyNotice />;
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <MapWithPins />
    </APIProvider>
  );
}

function MapWithPins() {
  // onCameraChanged가 초기 idle 시점에도 한 번 호출되므로, 초기값을 채워두면
  // 이동 없이도 첫 조회가 나간다.
  const [center, setCenter] = useState<MapCenter>(MAP_DEFAULTS.center);
  const { places, error } = useNearbyPlaces(center);

  useEffect(() => {
    if (!GOOGLE_MAPS_MAP_ID) {
      // 핀은 안 보이지만 지도 자체는 정상 동작해야 하므로 렌더링을 막지 않는다.
      console.warn(
        '[MapView] VITE_GOOGLE_MAPS_MAP_ID가 비어 있어 핀(AdvancedMarker)이 표시되지 않습니다. ' +
          '.env.local에 Vector Map ID를 채우세요 (frontend/.env.example 참고).',
      );
    }
  }, []);

  useEffect(() => {
    if (error) {
      // 사용자용 에러 UI는 Day 3에서 다룬다. 지금은 콘솔로만 노출한다.
      console.error('[MapView] 주변 식당 조회 실패', error);
    }
  }, [error]);

  const handleCameraChanged = (event: MapCameraChangedEvent) => {
    setCenter(event.detail.center);
  };

  return (
    <Map
      className="map"
      defaultCenter={MAP_DEFAULTS.center}
      defaultZoom={MAP_DEFAULTS.zoom}
      // 지도 스타일 ID가 없으면 기본 스타일로 뜬다. 빈 문자열은 넘기지 않는다.
      mapId={GOOGLE_MAPS_MAP_ID || undefined}
      // 지도가 화면의 주 조작 대상이므로 한 손가락 드래그·휠 줌을 바로 받는다.
      gestureHandling="greedy"
      // 드래그와 줌을 각각 잡지 않고 하나로 묶는다 — 어느 쪽으로 이동했든
      // 디바운스는 useNearbyPlaces 안에서 한 곳으로 처리된다.
      onCameraChanged={handleCameraChanged}
    >
      {places.map((place) => (
        <PinMarker key={place.placeId} place={place} />
      ))}
    </Map>
  );
}

/**
 * 키가 없으면 구글 스크립트가 조용히 실패해 흰 화면만 남는다.
 * 원인을 화면에서 바로 알 수 있게 안내한다 (에러를 삼키지 않는다 — CLAUDE.md 8절).
 */
function MissingApiKeyNotice() {
  return (
    <div className="map map-placeholder" role="status">
      <p className="map-placeholder-title">지도를 불러올 수 없습니다</p>
      <p>
        <code>VITE_GOOGLE_MAPS_API_KEY</code>가 비어 있습니다.
        <br />
        <code>frontend/.env.example</code>을 <code>.env.local</code>로 복사한 뒤 키를 채우고 다시
        실행하세요.
      </p>
    </div>
  );
}
