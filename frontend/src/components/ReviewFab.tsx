import { useState } from 'react';
import { startGoogleLogin } from '../api/auth';
import { useAuth } from '../hooks/useAuth';
import PlaceSearchDialog from './PlaceSearchDialog';
import type { PlaceSearchResult } from '../api/types';
import './ReviewFab.css';

interface ReviewFabProps {
  onSelectPlace: (place: PlaceSearchResult) => void;
}

/**
 * 지도 우측 하단 (+) 버튼.
 *
 * 미로그인 상태면 로그인을 유도한다. 로그인 상태면
 * 검색 → (해당 식당 기존 리뷰 목록 + 내 리뷰 작성/수정) 순으로 이어진다
 * (docs/frontend-agent-plan.md 5절 Day 1·Day 2).
 */
export default function ReviewFab({ onSelectPlace }: ReviewFabProps) {
  const { isLoggedIn, isLoading } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleFabClick = () => {
    if (isLoading) return;
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    setShowSearch(true);
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

      <button type="button" className="review-fab" onClick={handleFabClick} aria-label="리뷰 작성">
        +
      </button>

      {showSearch && (
        <PlaceSearchDialog
          onClose={() => setShowSearch(false)}
          onSelectPlace={(place) => {
            setShowSearch(false);
            onSelectPlace(place);
          }}
        />
      )}
    </>
  );
}
