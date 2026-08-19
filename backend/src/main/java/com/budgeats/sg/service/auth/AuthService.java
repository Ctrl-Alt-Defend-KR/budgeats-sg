package com.budgeats.sg.service.auth;

import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.repository.UserRepository;
import com.budgeats.sg.service.auth.GoogleIdTokenValidator.VerifiedClaims;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

/** Google OAuth2 코드 교환, 검증된 ID Token 기반 사용자 upsert. */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

    private final BudgeatsProperties properties;
    private final UserRepository userRepository;
    private final GoogleIdTokenValidator idTokenValidator;
    private final RestClient restClient = RestClient.create();

    public AuthService(
            BudgeatsProperties properties,
            UserRepository userRepository,
            GoogleIdTokenValidator idTokenValidator
    ) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.idTokenValidator = idTokenValidator;
    }

    public String buildAuthorizationUrl(String state) {
        return UriComponentsBuilder.fromUriString(AUTHORIZATION_ENDPOINT)
                .queryParam("client_id", properties.googleOauthClientId())
                .queryParam("redirect_uri", properties.googleOauthRedirectUri())
                .queryParam("response_type", "code")
                .queryParam("scope", "openid email profile")
                .queryParam("state", state)
                .encode()
                .build()
                .toUriString();
    }

    public User handleCallback(String code) {
        TokenResponse tokenResponse = exchangeCode(code);
        VerifiedClaims claims = idTokenValidator.verify(tokenResponse.idToken());
        return upsertVerifiedUser(claims);
    }

    User upsertVerifiedUser(VerifiedClaims claims) {
        String displayName = resolveDisplayName(claims);
        String schoolCode = claims.emailVerified()
                ? schoolCodeForHostedDomain(claims.hostedDomain())
                : null;
        return userRepository.findByGoogleSub(claims.subject())
                .map(user -> {
                    user.updateSchoolCode(schoolCode);
                    return userRepository.save(user);
                })
                .orElseGet(() -> userRepository.save(new User(claims.subject(), displayName, schoolCode)));
    }

    private String resolveDisplayName(VerifiedClaims claims) {
        if (claims.name() != null && !claims.name().isBlank()) {
            return claims.name();
        }
        return "사용자";
    }

    private String schoolCodeForHostedDomain(String hostedDomain) {
        if (hostedDomain == null || hostedDomain.isBlank()
                || properties.school().domainMappings() == null) {
            return null;
        }
        for (String mapping : properties.school().domainMappings().split(",")) {
            String[] parts = mapping.split("=", 2);
            if (parts.length == 2 && parts[0].trim().equalsIgnoreCase(hostedDomain.trim())) {
                String schoolCode = parts[1].trim();
                return schoolCode.isEmpty() ? null : schoolCode;
            }
        }
        return null;
    }

    private TokenResponse exchangeCode(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", properties.googleOauthClientId());
        form.add("client_secret", properties.googleOauthClientSecret());
        form.add("redirect_uri", properties.googleOauthRedirectUri());
        form.add("grant_type", "authorization_code");

        try {
            TokenResponse response = restClient.post()
                    .uri(TOKEN_ENDPOINT)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TokenResponse.class);
            if (response == null || response.idToken() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "구글 인증 응답이 올바르지 않습니다.");
            }
            return response;
        } catch (RestClientException e) {
            log.error("구글 토큰 교환 실패", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "구글 인증에 실패했습니다.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenResponse(@JsonProperty("id_token") String idToken) {
    }
}
