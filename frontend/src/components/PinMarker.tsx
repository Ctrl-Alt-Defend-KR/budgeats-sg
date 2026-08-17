import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { PlaceSummary } from '../api/types';
import { PRICE_TIER_COLOR, PRICE_TIER_LABEL } from '../constants/price';

interface PinMarkerProps {
  place: PlaceSummary;
  onClick?: (place: PlaceSummary) => void;
}

/**
 * 가격 등급별로 색이 다른 핀 하나.
 *
 * `AdvancedMarker`는 **Vector Map ID**(`VITE_GOOGLE_MAPS_MAP_ID`)가 있어야 렌더링된다.
 * 비어 있으면 구글이 콘솔에 경고를 띄우고 핀을 그리지 않는다 — 지도 자체는 정상 동작한다.
 */
export default function PinMarker({ place, onClick }: PinMarkerProps) {
  const color = PRICE_TIER_COLOR[place.priceTier];

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={`${place.name} (${PRICE_TIER_LABEL[place.priceTier]})`}
      onClick={() => onClick?.(place)}
    >
      <Pin background={color} borderColor="#ffffff" glyphColor="#ffffff" />
    </AdvancedMarker>
  );
}
