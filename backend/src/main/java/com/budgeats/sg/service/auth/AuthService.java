package com.budgeats.sg.service.auth;

import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.repository.UserRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
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

/**
 * Google OAuth2 코드 교환 + 사용자 upsert. 클라이언트 시크릿으로 우리 서버가 직접
 * oauth2.googleapis.com 과 TLS로 통신해 받은 id_token 이므로 서명 검증 없이 payload만
 * 디코드한다 (backend-agent-plan.md 7절 근거). 클라이언트가 보낸 id_token 을 받는 경로는
 * 만들지 않는다.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

    private final BudgeatsProperties properties;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    public AuthService(BudgeatsProperties properties, UserRepository userRepository, ObjectMapper objectMapper) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
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
        GoogleIdTokenClaims claims = decodeIdToken(tokenResponse.idToken());
        String displayName = resolveDisplayName(claims);
        return userRepository.findByGoogleSub(claims.sub())
                .orElseGet(() -> userRepository.save(new User(claims.sub(), displayName)));
    }

    private String resolveDisplayName(GoogleIdTokenClaims claims) {
        if (claims.name() != null && !claims.name().isBlank()) {
            return claims.name();
        }
        if (claims.email() != null && !claims.email().isBlank()) {
            return claims.email();
        }
        return "사용자";
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

    private GoogleIdTokenClaims decodeIdToken(String idToken) {
        String[] parts = idToken.split("\\.");
        if (parts.length < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "구글 id_token 형식이 올바르지 않습니다.");
        }
        try {
            byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
            return objectMapper.readValue(payload, GoogleIdTokenClaims.class);
        } catch (Exception e) {
            log.error("id_token 디코드 실패", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "구글 id_token 을 해석할 수 없습니다.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record TokenResponse(@JsonProperty("id_token") String idToken) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GoogleIdTokenClaims(String sub, String name, String email) {
    }
}
