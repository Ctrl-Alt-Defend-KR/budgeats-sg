package com.budgeats.sg.core;

/**
 * place 여러 개의 실측 가격 통계를 한 번에 조회한 결과 (N+1 방지).
 * JPQL {@code avg()} 는 대상 컬럼 타입과 무관하게 항상 Double을 반환한다 (JPA 스펙).
 * BigDecimal(SGD)로 변환은 호출부(PriceTierPolicy 호출 지점)의 책임이다.
 */
public record PlacePriceStats(String placeId, Long reviewCount, Double avgPricePerPerson) {
}
