import { useEffect, useState } from 'react';
import { startGoogleLogin } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import PlaceSearchDialog from './PlaceSearchDialog';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';
import type { PlaceGradePatch, PlaceSearchResult, ReviewItem, ReviewMutationResponse } from '../api/types';
import './ReviewFab.css';

/** 저장 완료 알림을 띄워 두는 시간(ms). 매직 넘버 금지 (CLAUDE.md 8절) */
const SAVED_NOTICE_MS = 3000;

interface ReviewFabProps {
  /**
   * 리뷰 저장·삭제 성공 시 갱신된 가격 등급을 올려보낸다 (docs/frontend-agent-plan.md 2절 seam).
   * 지도 핀 갱신 배선은 통합 단계에서 App.tsx가 연결하므로 선택 prop으로 둔다.
   */
  onPlaceUpdated?: (patch: PlaceGradePatch) => void;
}

/** 리뷰 작성 폼이 열려 있는지 + 새 글쓰기인지 기존 리뷰 수정인지 */
type FormTarget = { mode: 'create' } | { mode: 'edit'; review: ReviewItem };

/**
 * 지도 우측 하단 (+) 버튼.
 *
 * 미로그인 상태면 로그인을 유도한다. 로그인 상태면
 * 검색 → (해당 식당 기존 리뷰 목록 + 내 리뷰 작성/수정) 순으로 이어진다
 * (docs/frontend-agent-plan.md 5절 Day 1·Day 2).
 */
export default function ReviewFab({ onPlaceUpdated }: ReviewFabProps) {
  const { isLoggedIn, isLoading } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!savedNotice) return;
    const timer = setTimeout(() => setSavedNotice(false), SAVED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [savedNotice]);

  const handleFabClick = () => {
    if (isLoading) return;
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    setShowSearch(true);
  };

  const closePlacePanel = () => {
    setSelectedPlace(null);
    setFormTarget(null);
  };

  const handleSaved = (response: ReviewMutationResponse) => {
    setFormTarget(null);
    setListRefreshKey((k) => k + 1);
    setSavedNotice(true);
    onPlaceUpdated?.(response.place);
  };

  return (
    <>
      {showLoginPrompt && (
        <div className="overlay-card review-fab-login-prompt" role="alertdialog">
          <p>리뷰를 쓰려면 로그인이 필요합니다.</p>
          <div className="review-fab-login-actions">
            <button type="button" onClick={() => setShowLoginPrompt(false)}>
              닫기
            </button>
            <button type="button" onClick={startGoogleLogin}>
              Google로 로그인
            </button>
          </div>
        </div>
      )}

      {savedNotice && (
        <div className="overlay-card review-fab-saved-notice" role="status">
          리뷰가 저장되었습니다.
        </div>
      )}

      <button type="button" className="review-fab" onClick={handleFabClick} aria-label="리뷰 작성">
        +
      </button>

      {showSearch && (
        <PlaceSearchDialog
          onClose={() => setShowSearch(false)}
          onSelectPlace={(place) => {
            setShowSearch(false);
            setSelectedPlace(place);
          }}
        />
      )}

      {selectedPlace && !formTarget && (
        <div
          className="place-review-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`${selectedPlace.name} 리뷰`}
        >
          <div className="overlay-card place-review-panel">
            <header className="place-review-panel-header">
              <div>
                <h2>{selectedPlace.name}</h2>
                <p className="place-review-panel-address">{selectedPlace.address}</p>
              </div>
              <button type="button" onClick={closePlacePanel} aria-label="닫기">
                ×
              </button>
            </header>

            <ReviewList
              placeId={selectedPlace.placeId}
              refreshKey={listRefreshKey}
              onEditRequested={(review) => setFormTarget({ mode: 'edit', review })}
              onPlaceUpdated={onPlaceUpdated}
            />

            <button
              type="button"
              className="place-review-panel-write"
              onClick={() => setFormTarget({ mode: 'create' })}
            >
              리뷰 작성하기
            </button>
          </div>
        </div>
      )}

      {selectedPlace && formTarget && (
        <ReviewForm
          place={selectedPlace}
          initialReview={formTarget.mode === 'edit' ? formTarget.review : undefined}
          onClose={() => setFormTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
