package com.budgeats.sg.service.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.budgeats.sg.core.CodedResponseStatusException;
import com.budgeats.sg.core.BudgeatsProperties;
import java.net.SocketTimeoutException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class TurnstileVerifierTest {

    @Test
    void acceptsMatchingSuccessResponse() {
        Fixture fixture = fixture();
        fixture.server.expect(once(), requestTo(TurnstileVerifier.SITEVERIFY_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        """
                        {"success":true,"action":"review-create","hostname":"test.example.com"}
                        """,
                        MediaType.APPLICATION_JSON
                ));

        fixture.verifier.verify("valid-token");

        fixture.server.verify();
    }

    @Test
    void rejectsMissingExpiredReusedAndMismatchedTokens() {
        assertError(() -> fixture().verifier.verify(null), "CAPTCHA_INVALID");
        assertInvalidResponse("invalid-input-response");
        assertInvalidResponse("timeout-or-duplicate");

        Fixture actionMismatch = fixture();
        actionMismatch.server.expect(requestTo(TurnstileVerifier.SITEVERIFY_URL)).andRespond(withSuccess(
                "{\"success\":true,\"action\":\"login\",\"hostname\":\"test.example.com\"}",
                MediaType.APPLICATION_JSON
        ));
        assertError(() -> actionMismatch.verifier.verify("wrong-action"), "CAPTCHA_INVALID");

        Fixture hostnameMismatch = fixture();
        hostnameMismatch.server.expect(requestTo(TurnstileVerifier.SITEVERIFY_URL)).andRespond(withSuccess(
                "{\"success\":true,\"action\":\"review-create\",\"hostname\":\"other.example.com\"}",
                MediaType.APPLICATION_JSON
        ));
        assertError(() -> hostnameMismatch.verifier.verify("wrong-hostname"), "CAPTCHA_INVALID");
    }

    @Test
    void timeoutAndProviderErrorsFailClosedAsUnavailable() {
        Fixture timeout = fixture();
        timeout.server.expect(requestTo(TurnstileVerifier.SITEVERIFY_URL))
                .andRespond(withException(new SocketTimeoutException("test timeout")));
        assertError(() -> timeout.verifier.verify("timeout"), "CAPTCHA_UNAVAILABLE");

        Fixture providerError = fixture();
        providerError.server.expect(requestTo(TurnstileVerifier.SITEVERIFY_URL)).andRespond(withSuccess(
                "{\"success\":false,\"error-codes\":[\"internal-error\"]}",
                MediaType.APPLICATION_JSON
        ));
        assertError(() -> providerError.verifier.verify("provider-error"), "CAPTCHA_UNAVAILABLE");
    }

    private void assertInvalidResponse(String errorCode) {
        Fixture fixture = fixture();
        fixture.server.expect(requestTo(TurnstileVerifier.SITEVERIFY_URL)).andRespond(withSuccess(
                "{\"success\":false,\"error-codes\":[\"" + errorCode + "\"]}",
                MediaType.APPLICATION_JSON
        ));
        assertError(() -> fixture.verifier.verify("invalid-token"), "CAPTCHA_INVALID");
    }

    private void assertError(Runnable call, String code) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(CodedResponseStatusException.class,
                        exception -> assertThat(exception.getCode()).isEqualTo(code));
    }

    private Fixture fixture() {
        BudgeatsProperties properties = mock(BudgeatsProperties.class);
        when(properties.turnstile()).thenReturn(new BudgeatsProperties.Turnstile(
                "test-site", "test-secret", "review-create", "test.example.com", 5000
        ));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        return new Fixture(new TurnstileVerifier(properties, builder.build()), server);
    }

    private record Fixture(TurnstileVerifier verifier, MockRestServiceServer server) {
    }
}
