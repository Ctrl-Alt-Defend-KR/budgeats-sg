package com.budgeats.sg.dto.meta;

import java.math.BigDecimal;

public record PriceTierPolicyResponse(
        String currency,
        BigDecimal lowMaxInclusive,
        BigDecimal midMaxInclusive,
        int actualMinReviews
) {
}
