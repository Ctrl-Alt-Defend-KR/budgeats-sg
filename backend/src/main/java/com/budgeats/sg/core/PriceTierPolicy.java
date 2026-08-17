package com.budgeats.sg.core;

import java.math.BigDecimal;

/**
 * 가격 등급 산정 (CLAUDE.md 5.1절). 상태 없는 순수 함수 — 경계값·N은 호출부가
 * BudgeatsProperties 에서 읽어 넘긴다. 이 클래스에 숫자를 하드코딩하지 않는다.
 */
public final class PriceTierPolicy {

    private PriceTierPolicy() {
    }

    public static PriceTierResult resolve(
            long actualReviewCount,
            BigDecimal actualAvgPricePerPerson,
            Integer googlePriceLevel,
            BigDecimal lowMaxSgd,
            BigDecimal midMaxSgd,
            int minReviews
    ) {
        if (actualReviewCount >= minReviews && actualAvgPricePerPerson != null) {
            PriceTier tier = fromActualPrice(actualAvgPricePerPerson, lowMaxSgd, midMaxSgd);
            return new PriceTierResult(tier, PriceTierSource.ACTUAL, actualAvgPricePerPerson);
        }
        if (googlePriceLevel == null) {
            return new PriceTierResult(PriceTier.MID, PriceTierSource.UNKNOWN, null);
        }
        return new PriceTierResult(fromGooglePriceLevel(googlePriceLevel), PriceTierSource.GOOGLE, null);
    }

    private static PriceTier fromActualPrice(BigDecimal avg, BigDecimal lowMaxSgd, BigDecimal midMaxSgd) {
        if (avg.compareTo(lowMaxSgd) <= 0) {
            return PriceTier.LOW;
        }
        if (avg.compareTo(midMaxSgd) <= 0) {
            return PriceTier.MID;
        }
        return PriceTier.HIGH;
    }

    private static PriceTier fromGooglePriceLevel(int priceLevel) {
        if (priceLevel <= 1) {
            return PriceTier.LOW;
        }
        if (priceLevel == 2) {
            return PriceTier.MID;
        }
        return PriceTier.HIGH;
    }
}
