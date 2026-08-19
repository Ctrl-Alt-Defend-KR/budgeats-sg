package com.budgeats.sg.service.budget;

import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.core.PriceTier;
import com.budgeats.sg.dto.budget.BudgetPlanRequest;
import com.budgeats.sg.dto.budget.BudgetPlanResponse;
import com.budgeats.sg.dto.budget.BudgetPlanResponse.DayPlan;
import com.budgeats.sg.dto.budget.BudgetPlanResponse.MealPlan;
import com.budgeats.sg.dto.place.PlaceSummary;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BudgetPlanService {

    private static final String SHORTAGE_NOTICE = "조건에 맞는 식당이 부족해 일부 끼니를 비워 두었습니다.";

    private final BudgeatsProperties properties;

    public BudgetPlanService(BudgeatsProperties properties) {
        this.properties = properties;
    }

    public BudgetPlanResponse create(BudgetPlanRequest request, List<PlaceSummary> nearbyPlaces) {
        long mealCount = (long) request.days() * request.mealsPerDay();
        BigDecimal perMeal = request.totalBudgetSgd()
                .divide(BigDecimal.valueOf(mealCount), 2, RoundingMode.HALF_UP);
        PriceTier targetTier = targetTier(perMeal);
        List<PlaceSummary> candidates = nearbyPlaces.stream()
                .filter(place -> place.priceTier().ordinal() <= targetTier.ordinal())
                .toList();

        boolean shortage = candidates.size() < request.mealsPerDay();
        List<DayPlan> days = new ArrayList<>(request.days());
        for (int day = 1; day <= request.days(); day++) {
            List<MealPlan> meals = new ArrayList<>(request.mealsPerDay());
            int start = candidates.isEmpty() ? 0 : (day - 1) % candidates.size();
            for (int meal = 1; meal <= request.mealsPerDay(); meal++) {
                PlaceSummary place = meal <= candidates.size()
                        ? candidates.get((start + meal - 1) % candidates.size())
                        : null;
                meals.add(new MealPlan(meal, place));
            }
            days.add(new DayPlan(day, List.copyOf(meals)));
        }

        return new BudgetPlanResponse(
                perMeal,
                targetTier,
                List.copyOf(days),
                shortage ? SHORTAGE_NOTICE : null
        );
    }

    private PriceTier targetTier(BigDecimal perMeal) {
        if (perMeal.compareTo(properties.priceTierLowMaxSgd()) <= 0) {
            return PriceTier.LOW;
        }
        if (perMeal.compareTo(properties.priceTierMidMaxSgd()) <= 0) {
            return PriceTier.MID;
        }
        return PriceTier.HIGH;
    }
}
