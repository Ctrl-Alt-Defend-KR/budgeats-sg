package com.budgeats.sg.controller;

import com.budgeats.sg.core.ApiResponse;
import com.budgeats.sg.core.CurrentUser;
import com.budgeats.sg.core.PriceTierSource;
import com.budgeats.sg.core.session.SessionManager;
import com.budgeats.sg.dto.place.PlaceDetail;
import com.budgeats.sg.dto.review.ReviewCreateRequest;
import com.budgeats.sg.dto.review.ReviewResponse;
import com.budgeats.sg.dto.review.ReviewResponse.MutationResponse;
import com.budgeats.sg.dto.review.ReviewResponse.PlaceResponse;
import com.budgeats.sg.dto.review.ReviewUpdateRequest;
import com.budgeats.sg.service.places.PlaceQueryService;
import com.budgeats.sg.service.review.ReviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
@Validated
public class ReviewController {

    private static final Logger log = LoggerFactory.getLogger(ReviewController.class);

    private final ReviewService reviewService;
    private final PlaceQueryService placeQueryService;
    private final SessionManager sessionManager;

    public ReviewController(
            ReviewService reviewService,
            PlaceQueryService placeQueryService,
            SessionManager sessionManager
    ) {
        this.reviewService = reviewService;
        this.placeQueryService = placeQueryService;
        this.sessionManager = sessionManager;
    }

    @GetMapping("/places/{placeId}/reviews")
    public ApiResponse<ReviewResponse.ListResponse> list(
            @PathVariable @NotBlank String placeId,
            HttpServletRequest request
    ) {
        Long currentUserId = sessionManager.resolveUserId(request).orElse(null);
        return ApiResponse.success(reviewService.list(placeId, currentUserId));
    }

    @PostMapping("/reviews")
    public ResponseEntity<ApiResponse<MutationResponse>> create(
            @CurrentUser Long userId,
            @Valid @RequestBody ReviewCreateRequest request
    ) {
        MutationResponse response = resolveGoogleFallback(reviewService.create(userId, request));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PatchMapping("/reviews/{reviewId}")
    public ApiResponse<MutationResponse> update(
            @PathVariable @Positive Long reviewId,
            @CurrentUser Long userId,
            @Valid @RequestBody ReviewUpdateRequest request
    ) {
        return ApiResponse.success(resolveGoogleFallback(reviewService.update(reviewId, userId, request)));
    }

    @DeleteMapping("/reviews/{reviewId}")
    public ApiResponse<MutationResponse> delete(
            @PathVariable @Positive Long reviewId,
            @CurrentUser Long userId
    ) {
        return ApiResponse.success(resolveGoogleFallback(reviewService.delete(reviewId, userId)));
    }

    private MutationResponse resolveGoogleFallback(MutationResponse response) {
        if (response.place().priceTierSource() != PriceTierSource.UNKNOWN) {
            return response;
        }
        try {
            PlaceDetail detail = placeQueryService.detail(response.place().placeId());
            PlaceResponse place = new PlaceResponse(
                    detail.placeId(),
                    detail.priceTier(),
                    detail.priceTierSource(),
                    detail.actualAvgPricePerPerson(),
                    detail.ownReviewCount()
            );
            return new MutationResponse(response.review(), place);
        } catch (ResponseStatusException exception) {
            log.warn(
                    "리뷰 저장 후 가격 등급 보강 실패: placeId={}, status={}",
                    response.place().placeId(),
                    exception.getStatusCode()
            );
            return response;
        }
    }
}
