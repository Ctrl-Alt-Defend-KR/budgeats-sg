package com.budgeats.sg.dto.place;

import com.budgeats.sg.core.PriceTier;
import com.budgeats.sg.core.PriceTierSource;
import java.math.BigDecimal;

/** CLAUDE.md 6.1절 — /places/nearby 와 /budget-plans 가 공유하는 place 요약 객체. */
public record PlaceSummary(
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
        Long ownReviewCount
) {
}
