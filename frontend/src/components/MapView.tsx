import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { APIProvider, Map, useMap, type MapCameraChangedEvent } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID, MAP_DEFAULTS } from '../constants/map';
import type { MapCenter } from '../hooks/useNearbyPlaces';
import type { PlaceSummary } from '../api/types';
import PinMarker from './PinMarker';
import './MapView.css';

export interface MapViewHandle {
  /** 사이드바 항목 클릭 시 호출 — 해당 핀으로 이동하고 강조한다 (frontend-agent-plan.md 4절 Day2). */
  focusPlace: (placeId: string) => void;
}

export interface MapViewProps {
  /** 초기 카메라 위치. 이후 사용자가 드래그해도 이 값을 다시 적용하지 않는다(비제어 카메라). */
  center: MapCenter;
  /** App.tsx가 소유한다 — Sidebar와 같은 데이터를 공유해야 해서 공통 조상에 둔다. */
  places: PlaceSummary[];
  onCenterChanged: (center: MapCenter) => void;
}

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
const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { center, places, onCenterChanged },
  ref,
) {
  if (!GOOGLE_MAPS_API_KEY) {
    return <MissingApiKeyNotice />;
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <MapWithPins ref={ref} center={center} places={places} onCenterChanged={onCenterChanged} />
    </APIProvider>
  );
});

export default MapView;

const MapWithPins = forwardRef<MapViewHandle, MapViewProps>(function MapWithPins(
  { center, places, onCenterChanged },
  ref,
) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const map = useMap();

  useEffect(() => {
    if (!GOOGLE_MAPS_MAP_ID) {
      // 핀은 안 보이지만 지도 자체는 정상 동작해야 하므로 렌더링을 막지 않는다.
      console.warn(
        '[MapView] VITE_GOOGLE_MAPS_MAP_ID가 비어 있어 핀(AdvancedMarker)이 표시되지 않습니다. ' +
          '.env.local에 Vector Map ID를 채우세요 (frontend/.env.example 참고).',
      );
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focusPlace: (placeId: string) => {
        const place = places.find((p) => p.placeId === placeId);
        if (!place) {
          return;
        }
        map?.panTo({ lat: place.lat, lng: place.lng });
        setSelectedPlaceId(placeId);
      },
    }),
    [places, map],
  );

  const handleCameraChanged = (event: MapCameraChangedEvent) => {
    onCenterChanged(event.detail.center);
  };

  return (
    <Map
      className="map"
      defaultCenter={center}
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
        <PinMarker
          key={place.placeId}
          place={place}
          selected={place.placeId === selectedPlaceId}
          onClick={(clicked) => setSelectedPlaceId(clicked.placeId)}
        />
      ))}
    </Map>
  );
});

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
