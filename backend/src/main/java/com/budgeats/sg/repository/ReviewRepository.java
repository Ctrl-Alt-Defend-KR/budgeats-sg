package com.budgeats.sg.repository;

import com.budgeats.sg.core.PlacePriceStats;
import com.budgeats.sg.core.PlaceReviewSummary;
import com.budgeats.sg.domain.Review;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * backend-agent-plan.md 6.8절 — Agent A(service/places)가 호출하는 seam.
 * 시그니처를 바꾸면 A가 깨지므로 변경 시 8절 핸드오프 절차를 따른다.
 */
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByPlaceIdOrderByCreatedAtDesc(String placeId);

    List<Review> findByUser_IdOrderByCreatedAtDesc(Long userId);

    @Query("""
            select new com.budgeats.sg.core.PlacePriceStats(
                r.placeId, count(r), avg(r.pricePerPerson))
            from Review r
            where r.placeId in :placeIds
            group by r.placeId
            """)
    List<PlacePriceStats> findPriceStatsByPlaceIdIn(@Param("placeIds") Collection<String> placeIds);

    @Query("""
            select new com.budgeats.sg.core.PlaceReviewSummary(
                count(r), avg(r.pricePerPerson), avg(r.rating))
            from Review r
            where r.placeId = :placeId
            """)
    Optional<PlaceReviewSummary> findReviewSummaryByPlaceId(@Param("placeId") String placeId);
}
