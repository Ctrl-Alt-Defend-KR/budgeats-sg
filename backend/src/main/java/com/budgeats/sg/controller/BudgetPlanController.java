package com.budgeats.sg.controller;

import com.budgeats.sg.core.ApiResponse;
import com.budgeats.sg.dto.budget.BudgetPlanRequest;
import com.budgeats.sg.dto.budget.BudgetPlanResponse;
import com.budgeats.sg.service.budget.BudgetPlanService;
import com.budgeats.sg.service.places.PlaceQueryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/budget-plans")
public class BudgetPlanController {

    private final BudgetPlanService budgetPlanService;
    private final PlaceQueryService placeQueryService;

    public BudgetPlanController(BudgetPlanService budgetPlanService, PlaceQueryService placeQueryService) {
        this.budgetPlanService = budgetPlanService;
        this.placeQueryService = placeQueryService;
    }

    @PostMapping
    public ApiResponse<BudgetPlanResponse> create(@Valid @RequestBody BudgetPlanRequest request) {
        return ApiResponse.success(budgetPlanService.create(
                request,
                placeQueryService.listNearby(request.lat(), request.lng(), request.radius())
        ));
    }
}
