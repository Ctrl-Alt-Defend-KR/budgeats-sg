package com.budgeats.sg.core;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PriceTierPolicyTest {

    private static final BigDecimal LOW_MAX = new BigDecimal("8");
    private static final BigDecimal MID_MAX = new BigDecimal("15");
    private static final int MIN_REVIEWS = 3;

    @Test
    void usesActualAverageWhenReviewCountMeetsThreshold() {
        PriceTierResult result = PriceTierPolicy.resolve(3, new BigDecimal("7.50"), 4, LOW_MAX, MID_MAX, MIN_REVIEWS);

        assertThat(result.tier()).isEqualTo(PriceTier.LOW);
        assertThat(result.source()).isEqualTo(PriceTierSource.ACTUAL);
        assertThat(result.actualAvgPricePerPerson()).isEqualByComparingTo("7.50");
    }

    @Test
    void fallsBackToGooglePriceLevelWhenBelowReviewThreshold() {
        PriceTierResult result = PriceTierPolicy.resolve(2, new BigDecimal("100"), 3, LOW_MAX, MID_MAX, MIN_REVIEWS);

        assertThat(result.tier()).isEqualTo(PriceTier.HIGH);
        assertThat(result.source()).isEqualTo(PriceTierSource.GOOGLE);
        assertThat(result.actualAvgPricePerPerson()).isNull();
    }

    @Test
    void unknownWhenNeitherActualNorGoogleDataAvailable() {
        PriceTierResult result = PriceTierPolicy.resolve(0, null, null, LOW_MAX, MID_MAX, MIN_REVIEWS);

        assertThat(result.tier()).isEqualTo(PriceTier.MID);
        assertThat(result.source()).isEqualTo(PriceTierSource.UNKNOWN);
        assertThat(result.actualAvgPricePerPerson()).isNull();
    }

    @Test
    void boundaryPricesAreInclusiveOnTheLowerTier() {
        PriceTierResult atLowMax = PriceTierPolicy.resolve(5, LOW_MAX, null, LOW_MAX, MID_MAX, MIN_REVIEWS);
        PriceTierResult atMidMax = PriceTierPolicy.resolve(5, MID_MAX, null, LOW_MAX, MID_MAX, MIN_REVIEWS);
        PriceTierResult aboveMidMax = PriceTierPolicy.resolve(5, MID_MAX.add(BigDecimal.ONE), null, LOW_MAX, MID_MAX, MIN_REVIEWS);

        assertThat(atLowMax.tier()).isEqualTo(PriceTier.LOW);
        assertThat(atMidMax.tier()).isEqualTo(PriceTier.MID);
        assertThat(aboveMidMax.tier()).isEqualTo(PriceTier.HIGH);
    }

    @Test
    void googlePriceLevelMapsAcrossAllTiers() {
        assertThat(PriceTierPolicy.resolve(0, null, 0, LOW_MAX, MID_MAX, MIN_REVIEWS).tier()).isEqualTo(PriceTier.LOW);
        assertThat(PriceTierPolicy.resolve(0, null, 1, LOW_MAX, MID_MAX, MIN_REVIEWS).tier()).isEqualTo(PriceTier.LOW);
        assertThat(PriceTierPolicy.resolve(0, null, 2, LOW_MAX, MID_MAX, MIN_REVIEWS).tier()).isEqualTo(PriceTier.MID);
        assertThat(PriceTierPolicy.resolve(0, null, 3, LOW_MAX, MID_MAX, MIN_REVIEWS).tier()).isEqualTo(PriceTier.HIGH);
        assertThat(PriceTierPolicy.resolve(0, null, 4, LOW_MAX, MID_MAX, MIN_REVIEWS).tier()).isEqualTo(PriceTier.HIGH);
    }
}
