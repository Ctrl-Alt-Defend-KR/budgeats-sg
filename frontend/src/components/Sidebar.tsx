import { PRICE_TIER_COLOR, PRICE_TIER_LABEL } from '../constants/price';
import { formatDistance, haversineDistanceMeters } from '../utils/distance';
import type { PlaceSummary } from '../api/types';
import type { MapCenter } from '../hooks/useNearbyPlaces';
import './Sidebar.css';

interface SidebarProps {
  places: PlaceSummary[];
  loading: boolean;
  error: Error | null;
  onSelectPlace: (place: PlaceSummary) => void;
  onRetry: () => void;
  /**
   * 거리 계산 기준점. `useCurrentPosition`은 App.tsx에서 한 번만 호출하고 결과를 내려준다 —
   * 컴포넌트마다 훅을 부르면 geolocation 요청이 중복되고 지도와 좌표가 어긋난다.
   */
  position: MapCenter;
  /** false면 `position`이 폴백값이라는 뜻이므로 거리를 표시하지 않는다. */
  isActualPosition: boolean;
}

/**
 * 추천 식당 리스트.
 *
 * 정렬은 백엔드가 이미 `rating` 내림차순으로 내려준다(계약 6.3절, FR-302).
 * **여기서 다시 정렬하지 않는다** — 목(`api/places.ts`)도 같은 계약을 지킨다.
 *
 * 상태 우선순위: 목록이 비어 있는 동안의 로딩/에러가 최우선이고, 그 외에는
 * 이미 보여줄 목록이 있으므로 배경에서 재조회가 실패해도 목록을 유지한 채
 * 작은 배너로만 알린다 — 패닝할 때마다 리스트가 통째로 사라졌다 나타나는 걸 막는다.
 */
export default function Sidebar({
  places,
  loading,
  error,
  onSelectPlace,
  onRetry,
  position,
  isActualPosition,
}: SidebarProps) {

  if (places.length === 0 && loading) {
    return (
      <aside className="overlay-card sidebar" aria-label="추천 식당 목록">
        <h2 className="sidebar-title">추천 식당</h2>
        <p className="sidebar-status" role="status">
          주변 식당을 불러오는 중입니다…
        </p>
      </aside>
    );
  }

  if (places.length === 0 && error) {
    return (
      <aside className="overlay-card sidebar" aria-label="추천 식당 목록">
        <h2 className="sidebar-title">추천 식당</h2>
        <p className="sidebar-status" role="alert">
          식당 목록을 불러오지 못했습니다.
        </p>
        <button type="button" className="sidebar-retry" onClick={onRetry}>
          다시 시도
        </button>
      </aside>
    );
  }

  if (places.length === 0) {
    return (
      <aside className="overlay-card sidebar" aria-label="추천 식당 목록">
        <h2 className="sidebar-title">추천 식당</h2>
        <p className="sidebar-status" role="status">
          이 지역에는 등록된 식당이 없습니다. 지도를 이동해 보세요.
        </p>
      </aside>
    );
  }

  return (
    <aside className="overlay-card sidebar" aria-label="추천 식당 목록">
      <h2 className="sidebar-title">추천 식당</h2>

      {error && (
        <p className="sidebar-status sidebar-status-inline" role="alert">
          최신 정보를 불러오지 못했습니다.{' '}
          <button type="button" className="sidebar-retry-inline" onClick={onRetry}>
            다시 시도
          </button>
        </p>
      )}

      <ul className="sidebar-list">
        {places.map((place) => (
          <li key={place.placeId}>
            <button
              type="button"
              className="sidebar-item"
              onClick={() => onSelectPlace(place)}
            >
              <span
                className="sidebar-item-dot"
                style={{ backgroundColor: PRICE_TIER_COLOR[place.priceTier] }}
                aria-hidden="true"
              />
              <span className="sidebar-item-body">
                <span className="sidebar-item-name">{place.name}</span>
                <span className="sidebar-item-meta">
                  {place.rating === null ? '평점 없음' : `★ ${place.rating.toFixed(1)}`} · {PRICE_TIER_LABEL[place.priceTier]}
                  {/* 위치 권한을 못 받으면(거부·타임아웃) 거리 표시를 생략한다.
                      MAP_DEFAULTS.center 기준 거리는 실제 위치가 아니라 오해를 준다
                      (docs/frontend-agent-plan.md 4절 완료 기준). */}
                  {isActualPosition && place.lat !== null && place.lng !== null && (
                    <> · {formatDistance(haversineDistanceMeters(position, { lat: place.lat, lng: place.lng }))}</>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
