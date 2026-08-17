import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { deleteReview, fetchReviews } from '../api/reviews';
import { VISIT_TYPE_LABEL } from '../constants/review';
import type { PlaceGradePatch, ReviewItem } from '../api/types';
import './ReviewList.css';

interface ReviewListProps {
  placeId: string;
  /** 리뷰 작성/수정 직후 이 값을 바꿔서 재조회를 트리거한다 (부모가 관리) */
  refreshKey?: number;
  onEditRequested: (review: ReviewItem) => void;
  /** 삭제 성공 시 갱신된 가격 등급을 올려보낸다 (docs/frontend-agent-plan.md 2절 seam) */
  onPlaceUpdated?: (patch: PlaceGradePatch) => void;
}

/**
 * 식당 하나의 자체 리뷰 목록. `mine`이 true인 항목에만 수정·삭제 버튼을 보여준다 —
 * 이건 UX일 뿐이고 실제 인가는 서버가 한다 (frontend/CLAUDE.md 인증 절).
 */
export default function ReviewList({ placeId, refreshKey, onEditRequested, onPlaceUpdated }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchReviews(placeId, controller.signal)
      .then((result) => setReviews(result))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('리뷰를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [placeId, refreshKey]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError(null);
    try {
      const response = await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      onPlaceUpdated?.(response.place);
    } catch (err) {
      setError(describeDeleteError(err));
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <p className="review-list-status">불러오는 중…</p>;
  }

  if (error) {
    return <p className="review-list-status review-list-error">{error}</p>;
  }

  if (reviews.length === 0) {
    return <p className="review-list-status">아직 리뷰가 없습니다.</p>;
  }

  return (
    <ul className="review-list">
      {reviews.map((review) => (
        <li key={review.id} className="review-list-item">
          <div className="review-list-item-header">
            <span>{review.isAnonymous ? '익명' : review.authorName}</span>
            <span className="review-list-rating">★ {review.rating}</span>
          </div>

          <p className="review-list-price">1인 {review.pricePerPerson.toLocaleString()} SGD</p>
          <p className="review-list-content">{review.content}</p>

          {(review.tasteTags.length > 0 || review.studentTags.length > 0) && (
            <div className="review-list-tags">
              {[...review.tasteTags, ...review.studentTags].map((tag) => (
                <span key={tag} className="review-list-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="review-list-meta">
            {VISIT_TYPE_LABEL[review.visitType]} · {review.revisit ? '재방문 의사 있음' : '재방문 의사 없음'}
          </p>

          {review.mine && (
            <div className="review-list-actions">
              <button type="button" onClick={() => onEditRequested(review)}>
                수정
              </button>
              <button type="button" onClick={() => handleDelete(review.id)} disabled={deletingId === review.id}>
                {deletingId === review.id ? '삭제 중…' : '삭제'}
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function describeDeleteError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'FORBIDDEN':
        return '본인이 작성한 리뷰만 삭제할 수 있습니다.';
      case 'NOT_FOUND':
        return '이미 삭제된 리뷰입니다.';
      case 'RATE_LIMITED':
        return '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
      default:
        return err.message || '삭제에 실패했습니다.';
    }
  }
  return '삭제에 실패했습니다.';
}
