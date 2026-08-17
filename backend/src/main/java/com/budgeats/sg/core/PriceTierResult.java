package com.budgeats.sg.core;

import java.math.BigDecimal;

/** actualAvgPricePerPerson 은 source 가 ACTUAL 일 때만 채워진다. */
public record PriceTierResult(PriceTier tier, PriceTierSource source, BigDecimal actualAvgPricePerPerson) {
}
