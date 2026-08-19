package com.budgeats.sg.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.budgeats.sg.core.CodedResponseStatusException;
import com.budgeats.sg.core.session.SessionManager;
import com.budgeats.sg.domain.Review;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.repository.ReviewRepository;
import com.budgeats.sg.repository.UserRepository;
import com.budgeats.sg.service.places.PlacesClient;
import com.budgeats.sg.service.review.TurnstileVerifier;
import jakarta.servlet.http.Cookie;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
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
class ReviewWriteGateContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private SessionManager sessionManager;

    @MockitoBean
    private TurnstileVerifier turnstileVerifier;

    @MockitoBean
    private PlacesClient placesClient;

    @BeforeEach
    void failOptionalGoogleFallback() {
        org.mockito.Mockito.when(placesClient.getDetails(anyString()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "test fallback failure"));
    }

    @Test
    void schoolAccountIsRequiredForCreateAndUpdateButNotDelete() throws Exception {
        User ineligible = userRepository.saveAndFlush(new User("gate-ineligible", "일반 사용자"));

        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(ineligible.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("school-create", "valid-token")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("SCHOOL_ACCOUNT_REQUIRED"));

        User eligible = userRepository.saveAndFlush(new User("gate-eligible", "학교 사용자", "TEST_SCHOOL"));
        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(eligible.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("school-update-delete", "valid-token")))
                .andExpect(status().isCreated());
        Review review = reviewRepository.findByPlaceIdOrderByCreatedAtDesc("school-update-delete").getFirst();

        eligible.updateSchoolCode(null);
        userRepository.saveAndFlush(eligible);

        mockMvc.perform(patch("/api/v1/reviews/{reviewId}", review.getId())
                        .cookie(issueSessionCookie(eligible.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"수정\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("SCHOOL_ACCOUNT_REQUIRED"));

        mockMvc.perform(delete("/api/v1/reviews/{reviewId}", review.getId())
                        .cookie(issueSessionCookie(eligible.getId())))
                .andExpect(status().isOk());
    }

    @Test
    void invalidOrMissingCaptchaNeverCreatesReviewRow() throws Exception {
        User user = eligibleUser("gate-captcha-invalid");
        doThrow(new CodedResponseStatusException(
                HttpStatus.UNPROCESSABLE_ENTITY, "CAPTCHA_INVALID", "test invalid"
        )).when(turnstileVerifier).verify("invalid-token");
        doThrow(new CodedResponseStatusException(
                HttpStatus.UNPROCESSABLE_ENTITY, "CAPTCHA_INVALID", "test missing"
        )).when(turnstileVerifier).verify(null);

        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(user.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("captcha-invalid", "invalid-token")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("CAPTCHA_INVALID"));
        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(user.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJsonWithoutCaptcha("captcha-missing")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("CAPTCHA_INVALID"));

        assertThat(reviewRepository.findByPlaceIdOrderByCreatedAtDesc("captcha-invalid")).isEmpty();
        assertThat(reviewRepository.findByPlaceIdOrderByCreatedAtDesc("captcha-missing")).isEmpty();
    }

    @Test
    void captchaProviderTimeoutFailsClosedAndValidCaptchaCreatesReview() throws Exception {
        User user = eligibleUser("gate-captcha-provider");
        doThrow(new CodedResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE, "CAPTCHA_UNAVAILABLE", "test unavailable"
        )).when(turnstileVerifier).verify("timeout-token");

        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(user.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("captcha-timeout", "timeout-token")))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("CAPTCHA_UNAVAILABLE"));
        assertThat(reviewRepository.findByPlaceIdOrderByCreatedAtDesc("captcha-timeout")).isEmpty();

        mockMvc.perform(post("/api/v1/reviews")
                        .cookie(issueSessionCookie(user.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createJson("captcha-valid", "valid-token")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.review.id").isNumber())
                .andExpect(jsonPath("$.data.review.captchaToken").doesNotExist());

        verify(turnstileVerifier).verify("valid-token");
        assertThat(reviewRepository.findByPlaceIdOrderByCreatedAtDesc("captcha-valid")).hasSize(1);
    }

    private User eligibleUser(String googleSub) {
        return userRepository.saveAndFlush(new User(googleSub, "학교 사용자", "TEST_SCHOOL"));
    }

    private Cookie issueSessionCookie(Long userId) {
        MockHttpServletResponse response = new MockHttpServletResponse();
        sessionManager.issue(response, userId);
        String setCookie = response.getHeader("Set-Cookie");
        String value = setCookie.substring("session=".length(), setCookie.indexOf(';'));
        return new Cookie("session", value);
    }

    private String createJson(String placeId, String captchaToken) {
        return """
                {"placeId":"%s","rating":4,"pricePerPerson":7.5,"content":"본문",
                 "tasteTags":[],"studentTags":[],"visitType":"SOLO","revisit":true,
                 "isAnonymous":false,"captchaToken":"%s"}
                """.formatted(placeId, captchaToken);
    }

    private String createJsonWithoutCaptcha(String placeId) {
        return """
                {"placeId":"%s","rating":4,"pricePerPerson":7.5,"content":"본문",
                 "tasteTags":[],"studentTags":[],"visitType":"SOLO","revisit":true,
                 "isAnonymous":false}
                """.formatted(placeId);
    }
}
