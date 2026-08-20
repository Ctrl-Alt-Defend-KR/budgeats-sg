import { AdvancedMarker } from '@vis.gl/react-google-maps';
import type { MapCenter } from '../hooks/useNearbyPlaces';
import './CurrentPositionMarker.css';

interface CurrentPositionMarkerProps {
  position: MapCenter;
}

/**
 * 사용자의 현재 위치 표시.
 *
 * 식당 핀(`PinMarker`)과 **의미가 다른 마커**다. 가격 등급 색(초록/노랑/빨강)을 쓰지 않고
 * 파란 점으로 그려서, 지도를 훑을 때 식당으로 오인되지 않게 한다.
 *
 * 클릭 대상이 아니므로 `clickable`을 끈다 — 식당 핀을 누르려다 이 마커가 가로채면
 * 상세 팝업이 안 뜨는 것처럼 보인다.
 */
export default function CurrentPositionMarker({ position }: CurrentPositionMarkerProps) {
  return (
    <AdvancedMarker position={position} title="현재 위치" clickable={false}>
      <span className="current-position" aria-hidden="true">
        <span className="current-position-dot" />
      </span>
    </AdvancedMarker>
  );
}
