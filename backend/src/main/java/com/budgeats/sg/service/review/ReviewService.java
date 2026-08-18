package com.budgeats.sg.service.review;

import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.core.PlaceReviewSummary;
import com.budgeats.sg.core.PriceTierPolicy;
import com.budgeats.sg.core.PriceTierResult;
import com.budgeats.sg.domain.Review;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.dto.review.ReviewCreateRequest;
import com.budgeats.sg.dto.review.ReviewResponse;
import com.budgeats.sg.dto.review.ReviewResponse.MutationResponse;
import com.budgeats.sg.dto.review.ReviewResponse.PlaceResponse;
import com.budgeats.sg.dto.review.ReviewUpdateRequest;
import com.budgeats.sg.repository.ReviewRepository;
import com.budgeats.sg.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

@Service
@Transactional
public class ReviewService {

    private static final Set<String> TASTE_TAGS = Set.of(
            "한국인 입맛 맞음", "안 짜요", "향신료 약함", "매운맛 있음"
    );
    private static final Set<String> STUDENT_TAGS = Set.of(
            "가성비", "양 많음", "혼밥 가능", "포장 가능", "카드 결제 가능"
    );

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final ReviewRateLimiter rateLimiter;
    private final BudgeatsProperties properties;

    public ReviewService(
            ReviewRepository reviewRepository,
            UserRepository userRepository,
            ReviewRateLimiter rateLimiter,
            BudgeatsProperties properties
    ) {
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.rateLimiter = rateLimiter;
        this.properties = properties;
    }

    public MutationResponse create(Long userId, ReviewCreateRequest request) {
        String content = sanitizeContent(request.content());
        List<String> tasteTags = validateTags(request.tasteTags(), TASTE_TAGS);
        List<String> studentTags = validateTags(request.studentTags(), STUDENT_TAGS);
        User user = currentUser(userId);
        rateLimiter.check(userId);

        Review review = new Review(
                user,
                request.placeId(),
                request.rating(),
                request.pricePerPerson(),
                content,
                tasteTags,
                studentTags,
                request.visitType(),
                request.revisit(),
                request.isAnonymous()
        );
        try {
            reviewRepository.saveAndFlush(review);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 이 식당에 리뷰를 작성했습니다.");
        }
        return mutation(review, reviewResponse(review, userId));
    }

    @Transactional(readOnly = true)
    public ReviewResponse.ListResponse list(String placeId, Long currentUserId) {
        if (placeId == null || placeId.isBlank()) {
            throw invalidInput("placeId는 필수입니다.");
        }
        List<ReviewResponse> reviews = reviewRepository.findByPlaceIdOrderByCreatedAtDesc(placeId).stream()
                .map(review -> reviewResponse(review, currentUserId))
                .toList();
        return new ReviewResponse.ListResponse(reviews);
    }

    public MutationResponse update(
            Long reviewId,
            Long userId,
            ReviewUpdateRequest request
    ) {
        if (!request.hasChanges()) {
            throw invalidInput("수정할 필드가 없습니다.");
        }
        Review review = ownedReview(reviewId, userId);
        String content = request.content() == null ? review.getContent() : sanitizeContent(request.content());
        List<String> tasteTags = request.tasteTags() == null
                ? review.getTasteTags()
                : validateTags(request.tasteTags(), TASTE_TAGS);
        List<String> studentTags = request.studentTags() == null
                ? review.getStudentTags()
                : validateTags(request.studentTags(), STUDENT_TAGS);

        review.update(
                request.rating() == null ? review.getRating() : request.rating(),
                request.pricePerPerson() == null ? review.getPricePerPerson() : request.pricePerPerson(),
                content,
                tasteTags,
                studentTags,
                request.visitType() == null ? review.getVisitType() : request.visitType(),
                request.revisit() == null ? review.isRevisit() : request.revisit(),
                request.isAnonymous() == null ? review.isAnonymous() : request.isAnonymous()
        );
        reviewRepository.flush();
        return mutation(review, reviewResponse(review, userId));
    }

    public MutationResponse delete(Long reviewId, Long userId) {
        Review review = ownedReview(reviewId, userId);
        String placeId = review.getPlaceId();
        reviewRepository.delete(review);
        reviewRepository.flush();
        return new MutationResponse(null, placeResponse(placeId));
    }

    private MutationResponse mutation(Review review, ReviewResponse response) {
        return new MutationResponse(response, placeResponse(review.getPlaceId()));
    }

    private PlaceResponse placeResponse(String placeId) {
        PlaceReviewSummary summary = reviewRepository.findReviewSummaryByPlaceId(placeId)
                .orElse(new PlaceReviewSummary(0L, null, null));
        long count = summary.reviewCount() == null ? 0L : summary.reviewCount();
        BigDecimal average = summary.avgPricePerPerson() == null
                ? null
                : BigDecimal.valueOf(summary.avgPricePerPerson());
        PriceTierResult result = PriceTierPolicy.resolve(
                count,
                average,
                null,
                properties.priceTierLowMaxSgd(),
                properties.priceTierMidMaxSgd(),
                properties.priceActualMinReviews()
        );
        return new PlaceResponse(placeId, result.tier(), result.source(), result.actualAvgPricePerPerson(), count);
    }

    private Review ownedReview(Long reviewId, Long userId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "리뷰를 찾을 수 없습니다."));
        if (!review.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 리뷰만 수정하거나 삭제할 수 있습니다.");
        }
        return review;
    }

    private User currentUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
    }

    private ReviewResponse reviewResponse(Review review, Long currentUserId) {
        boolean mine = currentUserId != null && review.getUser().getId().equals(currentUserId);
        return new ReviewResponse(
                review.getId(),
                review.isAnonymous() ? null : review.getUser().getDisplayName(),
                review.isAnonymous(),
                review.getRating(),
                review.getPricePerPerson(),
                review.getContent(),
                List.copyOf(review.getTasteTags()),
                List.copyOf(review.getStudentTags()),
                review.getVisitType(),
                review.isRevisit(),
                review.getCreatedAt(),
                review.getUpdatedAt(),
                mine
        );
    }

    private String sanitizeContent(String content) {
        if (content == null || content.isBlank()) {
            throw invalidInput("content는 필수입니다.");
        }
        if (content.length() > properties.reviewContentMaxLength()) {
            throw invalidInput("content가 최대 길이를 초과했습니다.");
        }
        String escaped = HtmlUtils.htmlEscape(content);
        if (escaped.length() > properties.reviewContentMaxLength()) {
            throw invalidInput("이스케이프된 content가 최대 길이를 초과했습니다.");
        }
        return escaped;
    }

    private List<String> validateTags(List<String> tags, Set<String> allowed) {
        if (tags == null) {
            return List.of();
        }
        if (tags.stream().anyMatch(tag -> !allowed.contains(tag))) {
            throw invalidInput("허용되지 않은 태그가 포함되어 있습니다.");
        }
        return List.copyOf(tags);
    }

    private ResponseStatusException invalidInput(String message) {
        return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
