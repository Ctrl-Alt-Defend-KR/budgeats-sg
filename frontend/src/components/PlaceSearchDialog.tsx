import { useState, type FormEvent } from 'react';
import { searchPlaces } from '../api/placeSearch';
import type { PlaceSearchResult } from '../api/types';
import './PlaceSearchDialog.css';

interface PlaceSearchDialogProps {
  onClose: () => void;
  onSelectPlace: (place: PlaceSearchResult) => void;
}

/**
 * 리뷰 작성 팝업 1단계: 장소 검색.
 *
 * Places Autocomplete 위젯을 직접 쓰지 않고 백엔드 `GET /places/search?query=`만
 * 호출한다 (CLAUDE.md 2절 — Places API는 백엔드 경유, frontend/CLAUDE.md).
 */
export default function PlaceSearchDialog({ onClose, onSelectPlace }: PlaceSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      setResults(await searchPlaces(query));
      setHasSearched(true);
    } catch {
      setError('검색에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="place-search-overlay" role="dialog" aria-modal="true" aria-label="장소 검색">
      <div className="overlay-card place-search-dialog">
        <header className="place-search-header">
          <h2>리뷰 쓸 식당 검색</h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="place-search-form">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="식당 이름으로 검색"
            aria-label="식당 이름"
            autoFocus
          />
          <button type="submit" disabled={isLoading || !query.trim()}>
            검색
          </button>
        </form>

        {error && <p className="place-search-error">{error}</p>}

        <ul className="place-search-results">
          {results.map((place) => (
            <li key={place.placeId}>
              <button type="button" onClick={() => onSelectPlace(place)}>
                <span className="place-search-name">{place.name}</span>
                <span className="place-search-address">{place.address}</span>
              </button>
            </li>
          ))}
          {!isLoading && hasSearched && results.length === 0 && !error && (
            <li className="place-search-empty">검색 결과가 없습니다.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
