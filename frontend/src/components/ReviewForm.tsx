import { useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { createReview, fetchReviews, updateReview } from '../api/reviews';
import {
  REVIEW_CONTENT_MAX_LENGTH,
  STUDENT_TAG_OPTIONS,
  TASTE_TAG_OPTIONS,
  VISIT_TYPE_LABEL,
} from '../constants/review';
import {
  VISIT_TYPES,
  type PlaceSearchResult,
  type ReviewItem,
  type ReviewMutationResponse,
  type VisitType,
} from '../api/types';
import './ReviewForm.css';
import TurnstileWidget from './TurnstileWidget';

type TriState = boolean | null;

interface ReviewFormProps {
  place: PlaceSearchResult;
  /** 있으면 수정 모드로 시작한다 (`ReviewList`의 "수정" 버튼에서 전달) */
  initialReview?: ReviewItem;
  onClose: () => void;
  onSaved: (response: ReviewMutationResponse) => void;
}

/**
 * 리뷰 작성/수정 폼.
 *
 * 서버로는 `placeId`만 보내고, 식당명·주소 등 검색 결과로 받은 구글 데이터는
 * 화면 표시에만 쓴다 — place_id 외 Places 응답은 저장 금지다 (CLAUDE.md 3.1절).
 *
 * 이미 이 식당에 리뷰를 쓴 상태로 작성을 시도하면 서버가 409 CONFLICT를 준다
 * (계약 6.6절, `UNIQUE(user_id, place_id)`). 그 경우 본인 리뷰를 다시 불러와
 * 수정 모드로 전환한다 — 계획서 5절 Day 2 완료 기준.
 */
export default function ReviewForm({ place, initialReview, onClose, onSaved }: ReviewFormProps) {
  const [editingId, setEditingId] = useState<number | null>(initialReview?.id ?? null);
  const [rating, setRating] = useState(initialReview?.rating ?? 5);
  const [pricePerPerson, setPricePerPerson] = useState(
    initialReview ? String(initialReview.pricePerPerson) : '',
  );
  const [content, setContent] = useState(initialReview?.content ?? '');
  const [tasteTags, setTasteTags] = useState<string[]>(initialReview?.tasteTags ?? []);
  const [studentTags, setStudentTags] = useState<string[]>(initialReview?.studentTags ?? []);
  const [visitType, setVisitType] = useState<VisitType>(initialReview?.visitType ?? 'SOLO');
  const [revisit, setRevisit] = useState(initialReview?.revisit ?? true);
  const [isAnonymous, setIsAnonymous] = useState(initialReview?.isAnonymous ?? false);
  const [freeWater, setFreeWater] = useState<TriState>(initialReview?.freeWater ?? null);
  const [serviceCharge, setServiceCharge] = useState<TriState>(initialReview?.serviceCharge ?? null);
  const [taxCharge, setTaxCharge] = useState<TriState>(initialReview?.taxCharge ?? null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isEditing = editingId !== null;
  const resetCaptcha = () => {
    if (!isEditing) {
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
    }
  };

  const toggleTag = (list: string[], setList: (next: string[]) => void, tag: string) => {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  const applyExistingReview = (review: ReviewItem) => {
    setEditingId(review.id);
    setRating(review.rating);
    setPricePerPerson(String(review.pricePerPerson));
    setContent(review.content);
    setTasteTags(review.tasteTags);
    setStudentTags(review.studentTags);
    setVisitType(review.visitType);
    setRevisit(review.revisit);
    setIsAnonymous(review.isAnonymous);
    setFreeWater(review.freeWater);
    setServiceCharge(review.serviceCharge);
    setTaxCharge(review.taxCharge);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const price = Number(pricePerPerson);
    if (!Number.isFinite(price) || price <= 0) {
      setError('1인 가격을 올바르게 입력해 주세요.');
      resetCaptcha();
      return;
    }
    if (!content.trim()) {
      setError('리뷰 내용을 입력해 주세요.');
      resetCaptcha();
      return;
    }

    const fields = {
      rating,
      pricePerPerson: price,
      content: content.trim(),
      tasteTags,
      studentTags,
      visitType,
      revisit,
      isAnonymous,
      freeWater,
      serviceCharge,
      taxCharge,
    };

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingId !== null) {
        const response = await updateReview(editingId, fields);
        onSaved(response);
        return;
      }

      if (!captchaToken) {
        setError('CAPTCHA 인증을 완료해 주세요.');
        return;
      }
      const response = await createReview({ placeId: place.placeId, ...fields, captchaToken });
      onSaved(response);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        const recovered = await tryRecoverFromConflict(place.placeId);
        if (recovered) {
          applyExistingReview(recovered);
          setNotice('이미 작성한 리뷰가 있어 수정 모드로 전환했습니다. 내용을 고친 뒤 다시 저장해 주세요.');
          setIsSubmitting(false);
          return;
        }
      }
      setError(describeError(err));
    } finally {
      setIsSubmitting(false);
      resetCaptcha();
    }
  };

  return (
    <div className="review-form-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? '리뷰 수정' : '리뷰 작성'}>
      <form className="overlay-card review-form" onSubmit={handleSubmit}>
        <header className="review-form-header">
          <div>
            <h2>{place.name}</h2>
            <p className="review-form-address">{place.address}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        <label>
          평점
          <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}점
              </option>
            ))}
          </select>
        </label>

        <label>
          1인 가격 (SGD)
          <input
            type="number"
            min={0}
            step="0.5"
            value={pricePerPerson}
            onChange={(event) => setPricePerPerson(event.target.value)}
            required
          />
        </label>

        <label>
          방문 유형
          <select value={visitType} onChange={(event) => setVisitType(event.target.value as VisitType)}>
            {VISIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {VISIT_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>입맛 태그</legend>
          {TASTE_TAG_OPTIONS.map((tag) => (
            <label key={tag} className="review-form-tag">
              <input
                type="checkbox"
                checked={tasteTags.includes(tag)}
                onChange={() => toggleTag(tasteTags, setTasteTags, tag)}
              />
              {tag}
            </label>
          ))}
        </fieldset>

        <fieldset className="review-form-facts">
          <legend>이용 정보</legend>
          <TriStateField label="무료 물" value={freeWater} onChange={setFreeWater} />
          <TriStateField label="서비스 차지" value={serviceCharge} onChange={setServiceCharge} />
          <TriStateField label="세금 부과" value={taxCharge} onChange={setTaxCharge} />
        </fieldset>

        <fieldset>
          <legend>유학생 태그</legend>
          {STUDENT_TAG_OPTIONS.map((tag) => (
            <label key={tag} className="review-form-tag">
              <input
                type="checkbox"
                checked={studentTags.includes(tag)}
                onChange={() => toggleTag(studentTags, setStudentTags, tag)}
              />
              {tag}
            </label>
          ))}
        </fieldset>

        <label>
          내용
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={REVIEW_CONTENT_MAX_LENGTH}
            required
          />
          <span className="review-form-char-count">
            {content.length}/{REVIEW_CONTENT_MAX_LENGTH}
          </span>
        </label>

        <label className="review-form-checkbox">
          <input type="checkbox" checked={revisit} onChange={(event) => setRevisit(event.target.checked)} />
          재방문 의사 있음
        </label>

        <label className="review-form-checkbox">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => setIsAnonymous(event.target.checked)}
          />
          익명으로 작성
        </label>

        {notice && (
          <p className="review-form-notice" role="status">
            {notice}
          </p>
        )}

        {error && (
          <p className="review-form-error" role="alert">
            {error}
          </p>
        )}

        {!isEditing && <TurnstileWidget resetKey={captchaResetKey} onToken={setCaptchaToken} />}

        <button type="submit" disabled={isSubmitting || (!isEditing && !captchaToken)}>
          {isSubmitting ? '저장 중…' : isEditing ? '리뷰 수정' : '리뷰 저장'}
        </button>
      </form>
    </div>
  );
}

function TriStateField({ label, value, onChange }: { label: string; value: TriState; onChange: (value: TriState) => void }) {
  return <div className="review-form-fact"><span>{label}</span><div role="group" aria-label={label}>
    {([{ label: '있음', value: true }, { label: '없음', value: false }, { label: '모름', value: null }] as const).map((option) =>
      <button key={option.label} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>
    )}
  </div></div>;
}

/** 409 CONFLICT 수신 시 본인이 이미 쓴 리뷰를 찾아온다. 못 찾으면 null. */
async function tryRecoverFromConflict(placeId: string): Promise<ReviewItem | null> {
  try {
    const reviews = await fetchReviews(placeId);
    return reviews.find((r) => r.mine) ?? null;
  } catch {
    return null;
  }
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'INVALID_INPUT':
        return err.message || '입력값을 확인해 주세요.';
      case 'UNAUTHENTICATED':
        return '로그인이 필요합니다.';
      case 'FORBIDDEN':
        return '본인이 작성한 리뷰만 수정할 수 있습니다.';
      case 'RATE_LIMITED':
        return '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
      case 'SCHOOL_ACCOUNT_REQUIRED':
        return '검증된 학교 계정만 리뷰를 작성할 수 있습니다.';
      case 'CAPTCHA_INVALID':
        return 'CAPTCHA 인증이 만료되었거나 올바르지 않습니다. 다시 인증해 주세요.';
      case 'CAPTCHA_UNAVAILABLE':
        return 'CAPTCHA 확인 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.';
      default:
        return err.message || '리뷰 저장에 실패했습니다.';
    }
  }
  return '리뷰 저장에 실패했습니다.';
}
