import { APIProvider, Map } from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID, MAP_DEFAULTS } from '../constants/map';
import './MapView.css';

/**
 * 지도 렌더링.
 *
 * Maps JavaScript API만 사용한다. 장소 검색·주변 조회는 백엔드 `/places/*`를 쓴다 —
 * 이 컴포넌트에서 Places 관련 호출을 추가하지 말 것 (CLAUDE.md 2절, 3.1절).
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
      <Map
        className="map"
        defaultCenter={MAP_DEFAULTS.center}
        defaultZoom={MAP_DEFAULTS.zoom}
        // 지도 스타일 ID가 없으면 기본 스타일로 뜬다. 빈 문자열은 넘기지 않는다.
        mapId={GOOGLE_MAPS_MAP_ID || undefined}
        // 지도가 화면의 주 조작 대상이므로 한 손가락 드래그·휠 줌을 바로 받는다.
        gestureHandling="greedy"
      />
    </APIProvider>
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
