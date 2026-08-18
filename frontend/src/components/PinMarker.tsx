import { AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { PlaceSummary } from '../api/types';
import { PRICE_TIER_COLOR, PRICE_TIER_LABEL } from '../constants/price';

const SELECTED_SCALE = 1.3;
const DEFAULT_SCALE = 1;

interface PinMarkerProps {
  place: PlaceSummary;
  /** 사이드바에서 선택된 항목이면 크기·테두리로 강조한다 (frontend-agent-plan.md 4절 Day2). */
  selected?: boolean;
  onClick?: (place: PlaceSummary) => void;
}

/**
 * 가격 등급별로 색이 다른 핀 하나.
 *
 * `AdvancedMarker`는 **Vector Map ID**(`VITE_GOOGLE_MAPS_MAP_ID`)가 있어야 렌더링된다.
 * 비어 있으면 구글이 콘솔에 경고를 띄우고 핀을 그리지 않는다 — 지도 자체는 정상 동작한다.
 */
export default function PinMarker({ place, selected = false, onClick }: PinMarkerProps) {
  const color = PRICE_TIER_COLOR[place.priceTier];

  return (
    <AdvancedMarker
      position={{ lat: place.lat, lng: place.lng }}
      title={`${place.name} (${PRICE_TIER_LABEL[place.priceTier]})`}
      onClick={() => onClick?.(place)}
    >
      <Pin
        background={color}
        borderColor={selected ? '#111827' : '#ffffff'}
        glyphColor="#ffffff"
        scale={selected ? SELECTED_SCALE : DEFAULT_SCALE}
      />
    </AdvancedMarker>
  );
}
