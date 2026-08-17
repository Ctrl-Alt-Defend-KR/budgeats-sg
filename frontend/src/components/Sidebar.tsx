import { useCurrentPosition } from '../hooks/useCurrentPosition';
import { PRICE_TIER_COLOR, PRICE_TIER_LABEL } from '../constants/price';
import { formatDistance, haversineDistanceMeters } from '../utils/distance';
import type { PlaceSummary } from '../api/types';
import './Sidebar.css';

interface SidebarProps {
  places: PlaceSummary[];
  onSelectPlace: (placeId: string) => void;
}

/**
 * 추천 식당 리스트.
 *
 * 정렬은 백엔드가 이미 `rating` 내림차순으로 내려준다(계약 6.3절, FR-302).
 * **여기서 다시 정렬하지 않는다** — 목(`api/places.ts`)도 같은 계약을 지킨다.
 */
export default function Sidebar({ places, onSelectPlace }: SidebarProps) {
  const { position, isActualPosition } = useCurrentPosition();

  return (
    <aside className="overlay-card sidebar" aria-label="추천 식당 목록">
      <h2 className="sidebar-title">추천 식당</h2>

      {places.length === 0 ? (
        <p className="sidebar-empty">주변 식당을 불러오는 중입니다…</p>
      ) : (
        <ul className="sidebar-list">
          {places.map((place) => (
            <li key={place.placeId}>
              <button
                type="button"
                className="sidebar-item"
                onClick={() => onSelectPlace(place.placeId)}
              >
                <span
                  className="sidebar-item-dot"
                  style={{ backgroundColor: PRICE_TIER_COLOR[place.priceTier] }}
                  aria-hidden="true"
                />
                <span className="sidebar-item-body">
                  <span className="sidebar-item-name">{place.name}</span>
                  <span className="sidebar-item-meta">
                    ★ {place.rating.toFixed(1)} · {PRICE_TIER_LABEL[place.priceTier]}
                    {/* 위치 권한을 못 받으면(거부·타임아웃) 거리 표시를 생략한다.
                        MAP_DEFAULTS.center 기준 거리는 실제 위치가 아니라 오해를 준다
                        (docs/frontend-agent-plan.md 4절 완료 기준). */}
                    {isActualPosition && (
                      <> · {formatDistance(haversineDistanceMeters(position, place))}</>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
