package com.budgeats.sg.dto.review;

import com.budgeats.sg.core.PriceTier;
import com.budgeats.sg.core.PriceTierSource;
import com.budgeats.sg.domain.VisitType;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReviewResponse(
        Long id,
        String placeId,
        String authorName,
        boolean isAnonymous,
        int rating,
        BigDecimal pricePerPerson,
        String content,
        List<String> tasteTags,
        List<String> studentTags,
        Boolean freeWater,
        Boolean serviceCharge,
        Boolean taxCharge,
        VisitType visitType,
        boolean revisit,
        Instant createdAt,
        Instant updatedAt,
        boolean mine
) {
    public record ListResponse(List<ReviewResponse> reviews) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MutationResponse(ReviewResponse review, PlaceResponse place) {
    }

    public record PlaceResponse(
            String placeId,
            PriceTier priceTier,
            PriceTierSource priceTierSource,
            BigDecimal actualAvgPricePerPerson,
            long ownReviewCount
    ) {
    }
}
