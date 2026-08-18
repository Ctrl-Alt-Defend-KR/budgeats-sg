package com.budgeats.sg.dto.budget;

import com.budgeats.sg.core.PriceTier;
import com.budgeats.sg.dto.place.PlaceSummary;
import java.math.BigDecimal;
import java.util.List;

public record BudgetPlanResponse(
        BigDecimal perMealBudgetSgd,
        PriceTier targetPriceTier,
        List<DayPlan> days,
        String notice
) {
    public record DayPlan(int day, List<MealPlan> meals) {
    }

    public record MealPlan(int mealIndex, PlaceSummary place) {
    }
}
