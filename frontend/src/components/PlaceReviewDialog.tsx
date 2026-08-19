import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPlaceDetail } from '../api/places';
import type { AuthUser, PlaceGradePatch, PlaceSearchResult, PlaceSummary, ReviewItem, ReviewMutationResponse } from '../api/types';
import { PRICE_TIER_LABEL } from '../constants/price';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';
import './ReviewFab.css';

type PlaceInput = PlaceSummary | PlaceSearchResult;
interface Props { place: PlaceInput; user: AuthUser | null; onClose: () => void; onPlaceUpdated?: (patch: PlaceGradePatch) => void; }
type FormTarget = { mode: 'create' } | { mode: 'edit'; review: ReviewItem };

export default function PlaceReviewDialog({ place, user, onClose, onPlaceUpdated }: Props) {
  const [detail, setDetail] = useState<PlaceSummary | null>('rating' in place ? place : null);
  const [detailError, setDetailError] = useState(false);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const loadDetail = useCallback(() => {
    if ('rating' in place) return;
    setDetailError(false);
    fetchPlaceDetail(place.placeId).then(setDetail).catch(() => setDetailError(true));
  }, [place]);
  useEffect(() => {
    if ('rating' in place) return;
    let cancelled = false;
    fetchPlaceDetail(place.placeId).then((result) => { if (!cancelled) setDetail(result); }).catch(() => { if (!cancelled) setDetailError(true); });
    return () => { cancelled = true; };
  }, [place]);
  useEffect(() => {
    closeRef.current?.focus();
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const saved = (response: ReviewMutationResponse) => {
    setFormTarget(null); setRefreshKey((key) => key + 1); onPlaceUpdated?.(response.place);
  };
  if (formTarget) return <ReviewForm place={place} initialReview={formTarget.mode === 'edit' ? formTarget.review : undefined} onClose={() => setFormTarget(null)} onSaved={saved} />;

  return <div className="place-review-overlay" role="dialog" aria-modal="true" aria-label={`${place.name} 리뷰`}>
    <div className="overlay-card place-review-panel">
      <header className="place-review-panel-header"><div><h2>{detail?.name ?? place.name}</h2><p className="place-review-panel-address">{detail?.address ?? place.address}</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="닫기">×</button></header>
      {!detail && !detailError && <p className="review-list-status">식당 정보를 불러오는 중…</p>}
      {detailError && <p className="review-list-status review-list-error">식당 정보를 불러오지 못했습니다. <button type="button" onClick={loadDetail}>다시 시도</button></p>}
      {detail && <div className="place-review-summary"><span>{detail.rating === null ? 'Google 평점 없음' : `Google ★ ${detail.rating.toFixed(1)}`}</span><span>{PRICE_TIER_LABEL[detail.priceTier]}</span><span>{detail.priceTierSource === 'actual' ? '자체 리뷰 실측' : detail.priceTierSource === 'google' ? 'Google 추정' : '가격 정보 부족'}</span><span>자체 리뷰 {detail.ownReviewCount}개</span></div>}
      <ReviewList placeId={place.placeId} refreshKey={refreshKey} onEditRequested={(review) => setFormTarget({ mode: 'edit', review })} onPlaceUpdated={onPlaceUpdated} />
      {!user ? <p className="review-list-status">로그인하면 리뷰를 작성할 수 있습니다.</p> : !user.reviewEligible ? <p className="review-list-status review-list-error">검증된 학교 계정만 리뷰를 작성할 수 있습니다.</p> : <><p className="review-list-status">학교: {user.school ?? '확인된 학교'}</p><button type="button" className="place-review-panel-write" onClick={() => setFormTarget({ mode: 'create' })}>리뷰 작성하기</button></>}
    </div>
  </div>;
}
