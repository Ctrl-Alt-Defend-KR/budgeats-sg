package com.budgeats.sg.controller;

import com.budgeats.sg.core.ApiResponse;
import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.core.CurrentUser;
import com.budgeats.sg.core.session.SessionManager;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.dto.auth.AuthMeResponse;
import com.budgeats.sg.service.auth.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.net.URI;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String STATE_COOKIE_NAME = "oauth_state";
    private static final int STATE_COOKIE_MAX_AGE_SECONDS = 300;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthService authService;
    private final SessionManager sessionManager;
    private final BudgeatsProperties properties;

    public AuthController(AuthService authService, SessionManager sessionManager, BudgeatsProperties properties) {
        this.authService = authService;
        this.sessionManager = sessionManager;
        this.properties = properties;
    }

    @GetMapping("/google")
    public ResponseEntity<Void> startLogin(HttpServletResponse response) {
        String state = generateState();
        response.addHeader(HttpHeaders.SET_COOKIE, stateCookie(state, STATE_COOKIE_MAX_AGE_SECONDS));
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(authService.buildAuthorizationUrl(state)))
                .build();
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> callback(
            @RequestParam String code,
            @RequestParam(required = false) String state,
            HttpServletRequest request,
            HttpServletResponse response) {
        verifyState(request, state);
        response.addHeader(HttpHeaders.SET_COOKIE, stateCookie("", 0));

        User user = authService.handleCallback(code);
        sessionManager.issue(response, user.getId());

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(properties.oauthSuccessRedirect()))
                .build();
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@CurrentUser Long userId, HttpServletResponse response) {
        sessionManager.clear(response);
        return ApiResponse.success(null);
    }

    @GetMapping("/me")
    public ApiResponse<AuthMeResponse> me(@CurrentUser User user) {
        return ApiResponse.success(new AuthMeResponse(new AuthMeResponse.UserSummary(user.getId(), user.getDisplayName())));
    }

    private void verifyState(HttpServletRequest request, String state) {
        Cookie[] cookies = request.getCookies();
        String expected = null;
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (STATE_COOKIE_NAME.equals(cookie.getName())) {
                    expected = cookie.getValue();
                }
            }
        }
        if (state == null || expected == null || !state.equals(expected)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인 요청이 만료되었거나 유효하지 않습니다.");
        }
    }

    private String generateState() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String stateCookie(String value, int maxAgeSeconds) {
        return ResponseCookie.from(STATE_COOKIE_NAME, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Lax")
                .path("/api/v1/auth")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }
}
