package com.budgeats.sg.core.session;

import com.budgeats.sg.core.BudgeatsProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * 세션을 DB에 저장하지 않고, userId+만료시각을 HMAC-SHA256으로 서명한 쿠키 값으로 대신한다
 * (데이터 모델에 세션 테이블이 없음 — CLAUDE.md 4절). 검증은 서명 재계산 후 상수시간 비교로 한다.
 */
@Component
public class SessionManager {

    private static final String COOKIE_NAME = "session";
    private static final String ALGORITHM = "HmacSHA256";
    // ponytail: 로컬 개발 전용 기본 시크릿. SESSION_SECRET 은 local 환경에서만 비워둘 수 있다
    // (ProductionSecretsValidator 가 그 외 환경에서 강제). 운영 값은 반드시 환경변수로 주입한다.
    private static final String LOCAL_DEV_SECRET = "local-dev-insecure-session-secret";

    private final BudgeatsProperties properties;

    public SessionManager(BudgeatsProperties properties) {
        this.properties = properties;
    }

    public void issue(HttpServletResponse response, Long userId) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(encode(userId), properties.sessionMaxAgeSeconds()));
    }

    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("", 0));
    }

    public Optional<Long> resolveUserId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return decode(cookie.getValue());
            }
        }
        return Optional.empty();
    }

    private String buildCookie(String value, int maxAgeSeconds) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite(sameSiteAttribute())
                .path("/")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }

    private String sameSiteAttribute() {
        String value = properties.cookieSameSite();
        return Character.toUpperCase(value.charAt(0)) + value.substring(1).toLowerCase();
    }

    private String encode(Long userId) {
        long expiresAt = Instant.now().plusSeconds(properties.sessionMaxAgeSeconds()).getEpochSecond();
        String payload = userId + ":" + expiresAt;
        String encodedPayload = base64UrlEncode(payload.getBytes(StandardCharsets.UTF_8));
        return encodedPayload + "." + sign(encodedPayload);
    }

    private Optional<Long> decode(String cookieValue) {
        int dot = cookieValue.indexOf('.');
        if (dot < 0) {
            return Optional.empty();
        }
        String encodedPayload = cookieValue.substring(0, dot);
        String signature = cookieValue.substring(dot + 1);
        if (!MessageDigest.isEqual(
                sign(encodedPayload).getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8))) {
            return Optional.empty();
        }
        String payload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
        int colon = payload.indexOf(':');
        if (colon < 0) {
            return Optional.empty();
        }
        try {
            long expiresAt = Long.parseLong(payload.substring(colon + 1));
            if (Instant.now().getEpochSecond() > expiresAt) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(payload.substring(0, colon)));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    private String sign(String data) {
        try {
            String secret = properties.sessionSecret() == null || properties.sessionSecret().isBlank()
                    ? LOCAL_DEV_SECRET
                    : properties.sessionSecret();
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM));
            return base64UrlEncode(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("세션 서명에 실패했습니다.", e);
        }
    }

    private String base64UrlEncode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
