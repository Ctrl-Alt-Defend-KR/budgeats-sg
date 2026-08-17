package com.budgeats.sg.dto.place;

import com.budgeats.sg.core.PriceTier;
import com.budgeats.sg.core.PriceTierSource;
import java.math.BigDecimal;

/** CLAUDE.md 6.5절 — 6.1절 place 요약 + 자체 리뷰 평점 요약. */
public record PlaceDetail(
        String placeId,
        String name,
        String address,
        Double rating,
        Integer userRatingCount,
        Double lat,
        Double lng,
        PriceTier priceTier,
        PriceTierSource priceTierSource,
        BigDecimal actualAvgPricePerPerson,
        Long ownReviewCount,
        Double ownRatingAverage
) {
}
