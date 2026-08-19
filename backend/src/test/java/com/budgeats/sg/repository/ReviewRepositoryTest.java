package com.budgeats.sg.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.budgeats.sg.core.PlacePriceStats;
import com.budgeats.sg.core.PlaceReviewSummary;
import com.budgeats.sg.domain.Review;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.domain.VisitType;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

/**
 * backend-agent-plan.md 6.8절 seam 쿼리 검증. Agent A(service/places)가 이 세 메서드를
 * 그대로 호출하므로, 집계 쿼리의 타입·건수가 실제로 맞는지 여기서 고정한다.
 */
@DataJpaTest
class ReviewRepositoryTest {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void aggregatesPriceStatsAcrossMultiplePlacesInOneQuery() {
        saveReview(newUser("sub-1a"), "place-a", 4, "6.00");
        saveReview(newUser("sub-1b"), "place-a", 5, "8.00");
        saveReview(newUser("sub-1c"), "place-b", 3, "20.00");

        List<PlacePriceStats> stats =
                reviewRepository.findPriceStatsByPlaceIdIn(List.of("place-a", "place-b", "place-c"));

        assertThat(stats).hasSize(2);
        PlacePriceStats placeA = stats.stream().filter(s -> s.placeId().equals("place-a")).findFirst().orElseThrow();
        assertThat(placeA.reviewCount()).isEqualTo(2L);
        assertThat(placeA.avgPricePerPerson()).isEqualTo(7.0);
    }

    @Test
    void reviewSummaryAveragesPriceAndRatingForOnePlace() {
        saveReview(newUser("sub-2a"), "place-x", 4, "10.00");
        saveReview(newUser("sub-2b"), "place-x", 2, "20.00");

        PlaceReviewSummary summary = reviewRepository.findReviewSummaryByPlaceId("place-x").orElseThrow();

        assertThat(summary.reviewCount()).isEqualTo(2L);
        assertThat(summary.avgPricePerPerson()).isEqualTo(15.0);
        assertThat(summary.avgRating()).isEqualTo(3.0);
    }

    @Test
    void listsReviewsForPlaceNewestFirst() throws InterruptedException {
        Review older = saveReview(newUser("sub-3a"), "place-y", 5, "5.00");
        Thread.sleep(5);
        Review newer = saveReview(newUser("sub-3b"), "place-y", 4, "6.00");

        List<Review> reviews = reviewRepository.findByPlaceIdOrderByCreatedAtDesc("place-y");

        assertThat(reviews).extracting(Review::getId).containsExactly(newer.getId(), older.getId());
    }

    private User newUser(String googleSub) {
        return userRepository.save(new User(googleSub, "테스트 사용자"));
    }

    private Review saveReview(User user, String placeId, int rating, String pricePerPerson) {
        Review review = new Review(
                user, placeId, rating, new BigDecimal(pricePerPerson), "테스트 리뷰",
                List.of(), List.of(), VisitType.SOLO, true, false, null, null, null
        );
        return reviewRepository.save(review);
    }
}
