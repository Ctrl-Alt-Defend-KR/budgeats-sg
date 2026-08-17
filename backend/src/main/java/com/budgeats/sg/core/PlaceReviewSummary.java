package com.budgeats.sg.core;

/**
 * place 하나의 실측 가격·평점 요약 (GET /places/:placeId 용).
 * JPQL {@code avg()} 는 대상 컬럼 타입과 무관하게 항상 Double을 반환한다 (JPA 스펙).
 */
public record PlaceReviewSummary(Long reviewCount, Double avgPricePerPerson, Double avgRating) {
}
