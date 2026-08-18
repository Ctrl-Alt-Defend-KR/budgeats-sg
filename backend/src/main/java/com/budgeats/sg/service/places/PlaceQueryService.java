package com.budgeats.sg.service.places;

import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.core.PlacePriceStats;
import com.budgeats.sg.core.PlaceReviewSummary;
import com.budgeats.sg.core.PriceTierPolicy;
import com.budgeats.sg.core.PriceTierResult;
import com.budgeats.sg.dto.place.PlaceDetail;
import com.budgeats.sg.dto.place.PlaceSearchResult;
import com.budgeats.sg.dto.place.PlaceSummary;
import com.budgeats.sg.repository.ReviewRepository;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Places 호출 + 자체 리뷰 실측 통계(ReviewRepository, Step 0 seam)를 합쳐 API 계약 DTO로
 * 변환한다. 후보 식당 조회가 필요한 다른 기능(B의 예산 일정)도 이 서비스의 {@link #listNearby}
 * 를 재사용한다 — 구글을 직접 호출하지 않는다 (backend-agent-plan.md 5.3절).
 */
@Service
public class PlaceQueryService {

    private final PlacesClient placesClient;
    private final ReviewRepository reviewRepository;
    private final BudgeatsProperties properties;

    public PlaceQueryService(PlacesClient placesClient, ReviewRepository reviewRepository, BudgeatsProperties properties) {
        this.placesClient = placesClient;
        this.reviewRepository = reviewRepository;
        this.properties = properties;
    }

    public List<PlaceSummary> listNearby(double lat, double lng, Integer radiusM) {
        int radius = radiusM != null ? radiusM : properties.placesNearbyDefaultRadiusM();
        List<GooglePlace> places = placesClient.searchNearby(lat, lng, radius);
        if (places.isEmpty()) {
            return List.of();
        }

        List<String> placeIds = places.stream().map(GooglePlace::id).toList();
        Map<String, PlacePriceStats> statsByPlaceId = reviewRepository.findPriceStatsByPlaceIdIn(placeIds).stream()
                .collect(Collectors.toMap(PlacePriceStats::placeId, s -> s));

        return places.stream()
                .map(place -> toSummary(place, statsByPlaceId.get(place.id())))
                .sorted(Comparator.comparing(PlaceSummary::rating, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<PlaceSearchResult> search(String query) {
        return placesClient.searchText(query).stream()
                .map(place -> new PlaceSearchResult(place.id(), place.name(), place.formattedAddress()))
                .toList();
    }

    public PlaceDetail detail(String placeId) {
        GooglePlace place = placesClient.getDetails(placeId);
        PlaceReviewSummary summary = reviewRepository.findReviewSummaryByPlaceId(placeId).orElse(null);

        long reviewCount = summary != null && summary.reviewCount() != null ? summary.reviewCount() : 0;
        BigDecimal avgPrice = summary != null && summary.avgPricePerPerson() != null
                ? BigDecimal.valueOf(summary.avgPricePerPerson())
                : null;
        PriceTierResult tier = resolveTier(reviewCount, avgPrice, place.priceLevelValue());

        return new PlaceDetail(
                place.id(),
                place.name(),
                place.formattedAddress(),
                place.rating(),
                place.userRatingCount(),
                place.location() == null ? null : place.location().latitude(),
                place.location() == null ? null : place.location().longitude(),
                tier.tier(),
                tier.source(),
                tier.actualAvgPricePerPerson(),
                reviewCount,
                summary == null ? null : summary.avgRating()
        );
    }

    private PlaceSummary toSummary(GooglePlace place, PlacePriceStats stats) {
        long reviewCount = stats != null && stats.reviewCount() != null ? stats.reviewCount() : 0;
        BigDecimal avgPrice = stats != null && stats.avgPricePerPerson() != null
                ? BigDecimal.valueOf(stats.avgPricePerPerson())
                : null;
        PriceTierResult tier = resolveTier(reviewCount, avgPrice, place.priceLevelValue());

        return new PlaceSummary(
                place.id(),
                place.name(),
                place.formattedAddress(),
                place.rating(),
                place.userRatingCount(),
                place.location() == null ? null : place.location().latitude(),
                place.location() == null ? null : place.location().longitude(),
                tier.tier(),
                tier.source(),
                tier.actualAvgPricePerPerson(),
                reviewCount
        );
    }

    private PriceTierResult resolveTier(long reviewCount, BigDecimal avgPrice, Integer googlePriceLevel) {
        return PriceTierPolicy.resolve(
                reviewCount,
                avgPrice,
                googlePriceLevel,
                properties.priceTierLowMaxSgd(),
                properties.priceTierMidMaxSgd(),
                properties.priceActualMinReviews()
        );
    }
}
