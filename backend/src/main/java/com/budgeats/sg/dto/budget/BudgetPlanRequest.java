package com.budgeats.sg.dto.budget;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record BudgetPlanRequest(
        @NotNull @Positive BigDecimal totalBudgetSgd,
        @Min(1) @Max(14) int days,
        @Min(1) @Max(4) int mealsPerDay,
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng,
        @Positive Integer radius
) {
}
