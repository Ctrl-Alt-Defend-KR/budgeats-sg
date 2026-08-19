import { useEffect, useRef, useState } from 'react';
import { fetchMyReviews } from '../api/reviews';
import type { PlaceSearchResult, PlaceSummary, ReviewItem } from '../api/types';
import { formatReviewDate } from '../utils/date';
import './MyReviewsDialog.css';

interface Props { places: PlaceSummary[]; onClose: () => void; onSelectPlace: (place: PlaceSearchResult) => void; }
export default function MyReviewsDialog({ places, onClose, onSelectPlace }: Props) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const load = () => {
    setLoading(true); setError(false);
    fetchMyReviews().then(setReviews).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(() => {
    let cancelled = false;
    fetchMyReviews().then((result) => { if (!cancelled) setReviews(result); }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { closeRef.current?.focus(); const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return <div className="my-reviews-overlay" role="dialog" aria-modal="true" aria-label="내 리뷰">
    <section className="overlay-card my-reviews"><header><h2>내 리뷰</h2><button ref={closeRef} type="button" onClick={onClose} aria-label="닫기">×</button></header>
      {loading ? <p>불러오는 중…</p> : error ? <p role="alert">내 리뷰를 불러오지 못했습니다. <button type="button" onClick={load}>다시 시도</button></p> : reviews.length === 0 ? <p>작성한 리뷰가 없습니다.</p> : <ul>{reviews.map((review) => {
        const place = places.find((item) => item.placeId === review.placeId);
        return <li key={review.id}><button type="button" onClick={() => onSelectPlace(place ?? { placeId: review.placeId, name: '식당 정보 보기', address: '' })}><strong>{place?.name ?? '식당 정보 보기'}</strong><span>★ {review.rating} · {review.pricePerPerson.toLocaleString()} SGD · {formatReviewDate(review.createdAt)}</span><span>{review.content.length > 80 ? `${review.content.slice(0, 80)}…` : review.content}</span></button></li>;
      })}</ul>}
    </section>
  </div>;
}
