package com.budgeats.sg.controller;

import com.budgeats.sg.core.ApiResponse;
import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.dto.meta.PriceTierPolicyResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/meta")
public class MetaController {

    private static final String CURRENCY = "SGD";

    private final BudgeatsProperties properties;

    public MetaController(BudgeatsProperties properties) {
        this.properties = properties;
    }

    @GetMapping("/price-tiers")
    public ApiResponse<PriceTierPolicyResponse> priceTiers() {
        return ApiResponse.success(new PriceTierPolicyResponse(
                CURRENCY,
                properties.priceTierLowMaxSgd(),
                properties.priceTierMidMaxSgd(),
                properties.priceActualMinReviews()
        ));
    }
}
