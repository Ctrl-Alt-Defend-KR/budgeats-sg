package com.budgeats.sg.service.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.budgeats.sg.core.PriceTier;
import com.budgeats.sg.core.PriceTierSource;
import com.budgeats.sg.core.session.SessionManager;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.domain.VisitType;
import com.budgeats.sg.dto.review.ReviewCreateRequest;
import com.budgeats.sg.dto.review.ReviewResponse;
import com.budgeats.sg.dto.review.ReviewUpdateRequest;
import com.budgeats.sg.repository.ReviewRepository;
import com.budgeats.sg.repository.UserRepository;
import com.budgeats.sg.service.places.GooglePlace;
import com.budgeats.sg.service.places.PlacesClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.transaction.Transactional;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReviewContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private Validator validator;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SessionManager sessionManager;

    @MockitoBean
    private PlacesClient placesClient;

    @Test
    void reviewEndpointsRequireSessionAndValidateInput() throws Exception {
        mockMvc.perform(post("/api/v1/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson("http-unauthenticated")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));

        User user = newUser("http-invalid");
        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(user.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"placeId":"http-invalid","rating":6,"pricePerPerson":0,
                                 "content":"","visitType":"SOLO"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    }

    @Test
    void httpCreateUsesGoogleFallbackAndReturnsConflictForDuplicate() throws Exception {
        User user = newUser("http-create");
        Cookie cookie = issueSessionCookie(user.getId());
        when(placesClient.getDetails("http-place"))
                .thenReturn(googlePlace("http-place", "PRICE_LEVEL_EXPENSIVE"));

        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson("http-place")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.review.content").value("&lt;script&gt;좋아요&lt;/script&gt;"))
                .andExpect(jsonPath("$.data.place.priceTier").value("high"))
                .andExpect(jsonPath("$.data.place.priceTierSource").value("google"))
                .andExpect(jsonPath("$.data.place.actualAvgPricePerPerson").doesNotExist());
        verify(placesClient).getDetails("http-place");

        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(cookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson("http-place")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONFLICT"));
    }

    @Test
    void httpCreateStillSucceedsWhenGoogleFallbackFails() throws Exception {
        User user = newUser("http-fallback-failure");
        when(placesClient.getDetails("http-fallback-failure"))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Places unavailable"));

        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(user.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewJson("http-fallback-failure")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.review.id").isNumber())
                .andExpect(jsonPath("$.data.place.placeId").value("http-fallback-failure"))
                .andExpect(jsonPath("$.data.place.priceTier").value("mid"))
                .andExpect(jsonPath("$.data.place.priceTierSource").value("unknown"))
                .andExpect(jsonPath("$.data.place.ownReviewCount").value(1));
        assertThat(reviewRepository.findByPlaceIdOrderByCreatedAtDesc("http-fallback-failure")).hasSize(1);
    }

    @Test
    void publicReviewListCalculatesMineFromOptionalSession() throws Exception {
        User user = newUser("http-list");
        reviewService.create(user.getId(), request("http-list-place", "본문", false));

        mockMvc.perform(get("/api/v1/places/{placeId}/reviews", "http-list-place"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviews[0].mine").value(false));
        mockMvc.perform(get("/api/v1/places/{placeId}/reviews", "http-list-place")
                        .cookie(issueSessionCookie(user.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reviews[0].mine").value(true));
    }

    @Test
    void httpUpdateAndDeleteDistinguishForbiddenAndNotFound() throws Exception {
        User owner = newUser("http-owner");
        User other = newUser("http-other");
        ReviewResponse review = reviewService
                .create(owner.getId(), request("http-owned-place", "본문", false))
                .review();
        String patchBody = "{\"content\":\"수정\"}";

        mockMvc.perform(patch("/api/v1/reviews/{reviewId}", review.id())
                        .cookie(issueSessionCookie(other.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
        mockMvc.perform(patch("/api/v1/reviews/{reviewId}", Long.MAX_VALUE)
                        .cookie(issueSessionCookie(other.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(patchBody))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

        when(placesClient.getDetails(anyString()))
                .thenAnswer(invocation -> googlePlace(invocation.getArgument(0), "PRICE_LEVEL_MODERATE"));
        mockMvc.perform(delete("/api/v1/reviews/{reviewId}", review.id())
                        .cookie(issueSessionCookie(owner.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.review").doesNotExist())
                .andExpect(jsonPath("$.data.place.ownReviewCount").value(0))
                .andExpect(jsonPath("$.data.place.priceTier").value("mid"));
    }

    @Test
    void createsEscapedReviewAndRejectsDuplicate() {
        User user = newUser("review-create");
        ReviewCreateRequest request = request("place-create", "<script>alert(1)</script>", false);

        ReviewResponse.MutationResponse created = reviewService.create(user.getId(), request);

        assertThat(created.review().content()).isEqualTo("&lt;script&gt;alert(1)&lt;/script&gt;");
        assertThat(reviewRepository.findById(created.review().id()).orElseThrow().getContent())
                .isEqualTo("&lt;script&gt;alert(1)&lt;/script&gt;");
        assertThat(created.place().priceTier()).isEqualTo(PriceTier.MID);
        assertThat(created.place().priceTierSource()).isEqualTo(PriceTierSource.UNKNOWN);
        assertThat(created.place().actualAvgPricePerPerson()).isNull();

        assertStatus(HttpStatus.CONFLICT, () -> reviewService.create(user.getId(), request));
    }

    @Test
    void listsNewestFirstAndOmitsAnonymousAuthorName() throws Exception {
        User anonymous = newUser("review-anonymous");
        User current = newUser("review-current");
        ReviewResponse anonymousReview = reviewService
                .create(anonymous.getId(), request("place-list", "익명", true))
                .review();
        Thread.sleep(2);
        ReviewResponse currentReview = reviewService
                .create(current.getId(), request("place-list", "공개", false))
                .review();

        List<ReviewResponse> reviews = reviewService.list("place-list", current.getId()).reviews();

        assertThat(reviews).extracting(ReviewResponse::id)
                .containsExactly(currentReview.id(), anonymousReview.id());
        assertThat(reviews.get(0).mine()).isTrue();
        assertThat(reviews.get(1).mine()).isFalse();
        assertThat(reviews.get(1).authorName()).isNull();
        assertThat(objectMapper.writeValueAsString(reviews.get(1))).doesNotContain("authorName");
        assertThat(reviewService.list("place-list", null).reviews()).allMatch(review -> !review.mine());
    }

    @Test
    void partiallyUpdatesOnlyOwnedReviewAndDeletesIt() throws Exception {
        User owner = newUser("review-owner");
        User other = newUser("review-other");
        ReviewResponse created = reviewService
                .create(owner.getId(), request("place-update", "원문", false))
                .review();
        ReviewUpdateRequest patch = new ReviewUpdateRequest(
                null, null, "수정 <b>본문</b>", List.of(), null, null, null, true
        );

        assertStatus(HttpStatus.FORBIDDEN,
                () -> reviewService.update(created.id(), other.getId(), patch));
        assertStatus(HttpStatus.NOT_FOUND,
                () -> reviewService.update(Long.MAX_VALUE, other.getId(), patch));

        ReviewResponse updated = reviewService.update(created.id(), owner.getId(), patch).review();
        assertThat(updated.rating()).isEqualTo(4);
        assertThat(updated.content()).isEqualTo("수정 &lt;b&gt;본문&lt;/b&gt;");
        assertThat(updated.tasteTags()).isEmpty();
        assertThat(updated.isAnonymous()).isTrue();

        ReviewResponse.MutationResponse deleted = reviewService.delete(created.id(), owner.getId());
        assertThat(deleted.review()).isNull();
        assertThat(objectMapper.writeValueAsString(deleted)).doesNotContain("\"review\"");
        assertThat(deleted.place().ownReviewCount()).isZero();
        assertThat(reviewRepository.findById(created.id())).isEmpty();
    }

    @Test
    void validatesConfiguredContentLengthAllowedTagsAndNonEmptyPatch() {
        User user = newUser("review-validation");

        assertStatus(HttpStatus.UNPROCESSABLE_ENTITY, () -> reviewService.create(
                user.getId(), request("place-long", "<".repeat(1000), false)
        ));
        ReviewCreateRequest invalidTag = new ReviewCreateRequest(
                "place-tag", 4, new BigDecimal("7.50"), "본문",
                List.of("아무 태그"), List.of(), VisitType.SOLO, true, false
        );
        assertStatus(HttpStatus.UNPROCESSABLE_ENTITY,
                () -> reviewService.create(user.getId(), invalidTag));
        assertStatus(HttpStatus.UNAUTHORIZED,
                () -> reviewService.create(Long.MAX_VALUE, request("place-login", "본문", false)));

        ReviewResponse created = reviewService
                .create(user.getId(), request("place-empty-patch", "본문", false))
                .review();
        ReviewUpdateRequest emptyPatch = new ReviewUpdateRequest(
                null, null, null, null, null, null, null, null
        );
        assertStatus(HttpStatus.UNPROCESSABLE_ENTITY,
                () -> reviewService.update(created.id(), user.getId(), emptyPatch));
    }

    @Test
    void beanValidationRejectsInvalidCreateAndBudgetIndependentFields() {
        ReviewCreateRequest invalid = new ReviewCreateRequest(
                " ", 6, BigDecimal.ZERO, " ",
                List.of("안 짜요", "향신료 약함", "매운맛 있음", "한국인 입맛 맞음", "초과"),
                List.of(), null, false, false
        );

        Set<String> fields = validator.validate(invalid).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(fields).contains("placeId", "rating", "pricePerPerson", "content", "tasteTags", "visitType");
    }

    @Test
    void switchesToActualPriceAtConfiguredReviewThreshold() {
        ReviewResponse.MutationResponse first = reviewService.create(
                newUser("threshold-1").getId(), request("place-threshold", "첫째", false)
        );
        reviewService.create(newUser("threshold-2").getId(), request("place-threshold", "둘째", false));
        ReviewResponse.MutationResponse third = reviewService.create(
                newUser("threshold-3").getId(), request("place-threshold", "셋째", false)
        );

        assertThat(first.place().priceTierSource()).isEqualTo(PriceTierSource.UNKNOWN);
        assertThat(first.place().priceTier()).isEqualTo(PriceTier.MID);
        assertThat(third.place().priceTierSource()).isEqualTo(PriceTierSource.ACTUAL);
        assertThat(third.place().priceTier()).isEqualTo(PriceTier.LOW);
        assertThat(third.place().actualAvgPricePerPerson()).isEqualByComparingTo("7.50");
    }

    @Test
    void rateLimitIsPerUserAndExpiresAfterOneHour() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-17T00:00:00Z"));
        ReviewRateLimiter limiter = new ReviewRateLimiter(2, clock);

        limiter.check(1L);
        limiter.check(1L);
        assertStatus(HttpStatus.TOO_MANY_REQUESTS, () -> limiter.check(1L));
        limiter.check(2L);

        clock.advanceSeconds(3601);
        limiter.check(1L);
    }

    private ReviewCreateRequest request(String placeId, String content, boolean anonymous) {
        return new ReviewCreateRequest(
                placeId,
                4,
                new BigDecimal("7.50"),
                content,
                List.of("안 짜요"),
                List.of("가성비"),
                VisitType.SOLO,
                true,
                anonymous
        );
    }

    private User newUser(String googleSub) {
        return userRepository.saveAndFlush(new User(googleSub, "테스트 사용자"));
    }

    private Cookie issueSessionCookie(Long userId) {
        MockHttpServletResponse response = new MockHttpServletResponse();
        sessionManager.issue(response, userId);
        String setCookie = response.getHeader("Set-Cookie");
        String value = setCookie.substring("session=".length(), setCookie.indexOf(';'));
        return new Cookie("session", value);
    }

    private String reviewJson(String placeId) {
        return """
                {"placeId":"%s","rating":4,"pricePerPerson":7.5,
                 "content":"<script>좋아요</script>","tasteTags":["안 짜요"],
                 "studentTags":["가성비"],"visitType":"SOLO","revisit":true,"isAnonymous":false}
                """.formatted(placeId);
    }

    private GooglePlace googlePlace(String placeId, String priceLevel) {
        return new GooglePlace(
                placeId,
                new GooglePlace.DisplayName("테스트 식당"),
                "Singapore",
                new GooglePlace.Location(1.2966, 103.7764),
                4.5,
                100,
                priceLevel
        );
    }

    private void assertStatus(HttpStatus status, Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(status));
    }

    private static final class MutableClock extends Clock {

        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
