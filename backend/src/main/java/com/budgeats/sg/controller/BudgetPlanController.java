package com.budgeats.sg.controller;

import com.budgeats.sg.core.ApiResponse;
import com.budgeats.sg.dto.budget.BudgetPlanRequest;
import com.budgeats.sg.dto.budget.BudgetPlanResponse;
import com.budgeats.sg.dto.place.PlaceSummary;
import com.budgeats.sg.service.budget.BudgetPlanService;
import com.budgeats.sg.service.places.PlaceQueryService;
import jakarta.validation.Valid;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/budget-plans")
public class BudgetPlanController {

    private static final Logger log = LoggerFactory.getLogger(BudgetPlanController.class);

    private final BudgetPlanService budgetPlanService;
    private final PlaceQueryService placeQueryService;

    public BudgetPlanController(BudgetPlanService budgetPlanService, PlaceQueryService placeQueryService) {
        this.budgetPlanService = budgetPlanService;
        this.placeQueryService = placeQueryService;
    }

    @PostMapping
    public ApiResponse<BudgetPlanResponse> create(@Valid @RequestBody BudgetPlanRequest request) {
        return ApiResponse.success(budgetPlanService.create(request, fetchNearbyOrEmpty(request)));
    }

    private List<PlaceSummary> fetchNearbyOrEmpty(BudgetPlanRequest request) {
        try {
            return placeQueryService.listNearby(request.lat(), request.lng(), request.radius());
        } catch (ResponseStatusException exception) {
            log.warn("예산 일정용 주변 식당 조회 실패: status={}", exception.getStatusCode());
            return List.of();
        }
    }
}
