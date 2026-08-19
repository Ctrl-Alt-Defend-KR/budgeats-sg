package com.budgeats.sg.service.review;

import com.budgeats.sg.core.CodedResponseStatusException;
import com.budgeats.sg.core.BudgeatsProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class TurnstileVerifier {

    static final String SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    private static final Logger log = LoggerFactory.getLogger(TurnstileVerifier.class);
    private static final int MAX_TOKEN_LENGTH = 2048;

    private final BudgeatsProperties properties;
    private final RestClient restClient;

    @Autowired
    public TurnstileVerifier(BudgeatsProperties properties) {
        this(properties, restClient(properties.turnstile().timeoutMillis()));
    }

    TurnstileVerifier(BudgeatsProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    public void verify(String token) {
        if (token == null || token.isBlank() || token.length() > MAX_TOKEN_LENGTH) {
            throw invalid();
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", properties.turnstile().secretKey());
        form.add("response", token);

        try {
            SiteverifyResponse response = restClient.post()
                    .uri(SITEVERIFY_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(SiteverifyResponse.class);
            validateResponse(response);
        } catch (CodedResponseStatusException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.warn("Turnstile 공급자 검증 호출 실패", exception);
            throw unavailable();
        }
    }

    private void validateResponse(SiteverifyResponse response) {
        if (response == null) {
            throw unavailable();
        }
        if (!response.success()) {
            List<String> errors = response.errorCodes() == null ? List.of() : response.errorCodes();
            if (errors.stream().anyMatch(this::isProviderError)) {
                throw unavailable();
            }
            throw invalid();
        }
        if (!properties.turnstile().expectedAction().equals(response.action())) {
            throw invalid();
        }
        String expectedHostname = properties.turnstile().expectedHostname();
        if (expectedHostname != null && !expectedHostname.isBlank()
                && (response.hostname() == null || !expectedHostname.equalsIgnoreCase(response.hostname()))) {
            throw invalid();
        }
    }

    private boolean isProviderError(String error) {
        return "internal-error".equals(error)
                || "missing-input-secret".equals(error)
                || "invalid-input-secret".equals(error);
    }

    private CodedResponseStatusException invalid() {
        return new CodedResponseStatusException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "CAPTCHA_INVALID",
                "CAPTCHA 검증에 실패했습니다. 다시 시도해 주세요."
        );
    }

    private CodedResponseStatusException unavailable() {
        return new CodedResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "CAPTCHA_UNAVAILABLE",
                "CAPTCHA 검증 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요."
        );
    }

    private static RestClient restClient(int timeoutMillis) {
        Duration timeout = Duration.ofMillis(timeoutMillis);
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(timeout).build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(timeout);
        return RestClient.builder().requestFactory(requestFactory).build();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record SiteverifyResponse(
            boolean success,
            String action,
            String hostname,
            @JsonProperty("error-codes") List<String> errorCodes
    ) {
    }
}
