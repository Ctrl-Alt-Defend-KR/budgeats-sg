package com.budgeats.sg.place;

import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.budgeats.sg.domain.User;
import com.budgeats.sg.domain.VisitType;
import com.budgeats.sg.domain.Review;
import com.budgeats.sg.repository.ReviewRepository;
import com.budgeats.sg.repository.UserRepository;
import com.budgeats.sg.service.places.GooglePlace;
import com.budgeats.sg.service.places.PlacesClient;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * backend-agent-plan.md 4절 완료 기준 검증. PlacesClient는 실제 구글을 호출하지 않도록
 * MockitoBean으로 대체하고, 가격 등급 산정(ReviewRepository seam + PriceTierPolicy)은
 * 실제 빈으로 검증한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PlaceContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @MockitoBean
    private PlacesClient placesClient;

    @Test
    void nearbyUsesActualAveragePriceWhenEnoughOwnReviewsExist() throws Exception {
        String placeId = "place-nearby-actual";
        seedReviews(placeId, 3, "6.00");
        when(placesClient.searchNearby(anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(googlePlace(placeId, "Test Cafe", null)));

        mockMvc.perform(get("/api/v1/places/nearby").param("lat", "1.28").param("lng", "103.85"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.places[0].placeId").value(placeId))
                .andExpect(jsonPath("$.data.places[0].priceTier").value("low"))
                .andExpect(jsonPath("$.data.places[0].priceTierSource").value("actual"))
                .andExpect(jsonPath("$.data.places[0].actualAvgPricePerPerson").value(6.0))
                .andExpect(jsonPath("$.data.places[0].ownReviewCount").value(3));
    }

    @Test
    void nearbyFallsBackToGooglePriceLevelWhenOwnReviewsAreBelowThreshold() throws Exception {
        String placeId = "place-nearby-fallback";
        when(placesClient.searchNearby(anyDouble(), anyDouble(), anyInt()))
                .thenReturn(List.of(googlePlace(placeId, "Pricey Place", "PRICE_LEVEL_EXPENSIVE")));

        mockMvc.perform(get("/api/v1/places/nearby").param("lat", "1.28").param("lng", "103.85"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.places[0].priceTier").value("high"))
                .andExpect(jsonPath("$.data.places[0].priceTierSource").value("google"))
                .andExpect(jsonPath("$.data.places[0].actualAvgPricePerPerson").doesNotExist());
    }

    @Test
    void searchReturnsMinimalFieldsWithoutRatingOrCoordinates() throws Exception {
        when(placesClient.searchText(anyString()))
                .thenReturn(List.of(googlePlace("place-search-1", "Kopitiam", null)));

        mockMvc.perform(get("/api/v1/places/search").param("query", "kopitiam"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.places[0].placeId").value("place-search-1"))
                .andExpect(jsonPath("$.data.places[0].name").value("Kopitiam"))
                .andExpect(jsonPath("$.data.places[0].rating").doesNotExist());
    }

    @Test
    void detailIncludesOwnRatingAverageAlongsideGoogleData() throws Exception {
        String placeId = "place-detail-actual";
        seedReviews(placeId, 3, "5.00");
        when(placesClient.getDetails(placeId)).thenReturn(googlePlace(placeId, "Maxwell Food Centre", null));

        mockMvc.perform(get("/api/v1/places/{placeId}", placeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.placeId").value(placeId))
                .andExpect(jsonPath("$.data.priceTierSource").value("actual"))
                .andExpect(jsonPath("$.data.ownReviewCount").value(3))
                .andExpect(jsonPath("$.data.ownRatingAverage").value(4.0));
    }

    private void seedReviews(String placeId, int count, String pricePerPerson) {
        for (int i = 0; i < count; i++) {
            User user = userRepository.save(new User(placeId + "-sub-" + i, "테스트 사용자" + i));
            reviewRepository.save(new Review(
                    user, placeId, 4, new BigDecimal(pricePerPerson), "가성비 좋아요",
                    List.of(), List.of(), VisitType.SOLO, true, false, null, null, null
            ));
        }
    }

    private GooglePlace googlePlace(String placeId, String name, String priceLevel) {
        return new GooglePlace(
                placeId,
                new GooglePlace.DisplayName(name),
                "1 Test St, Singapore",
                new GooglePlace.Location(1.28, 103.85),
                4.5,
                120,
                priceLevel
        );
    }
}
