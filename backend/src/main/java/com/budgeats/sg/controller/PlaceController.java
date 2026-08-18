package com.budgeats.sg.controller;

import com.budgeats.sg.core.ApiResponse;
import com.budgeats.sg.dto.place.NearbyPlacesResponse;
import com.budgeats.sg.dto.place.PlaceDetail;
import com.budgeats.sg.dto.place.SearchPlacesResponse;
import com.budgeats.sg.service.places.PlaceQueryService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/places")
@Validated
public class PlaceController {

    private final PlaceQueryService placeQueryService;

    public PlaceController(PlaceQueryService placeQueryService) {
        this.placeQueryService = placeQueryService;
    }

    @GetMapping("/nearby")
    public ApiResponse<NearbyPlacesResponse> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(required = false) Integer radius) {
        return ApiResponse.success(new NearbyPlacesResponse(placeQueryService.listNearby(lat, lng, radius)));
    }

    @GetMapping("/search")
    public ApiResponse<SearchPlacesResponse> search(@RequestParam @NotBlank String query) {
        return ApiResponse.success(new SearchPlacesResponse(placeQueryService.search(query)));
    }

    @GetMapping("/{placeId}")
    public ApiResponse<PlaceDetail> detail(@PathVariable @NotBlank String placeId) {
        return ApiResponse.success(placeQueryService.detail(placeId));
    }
}
