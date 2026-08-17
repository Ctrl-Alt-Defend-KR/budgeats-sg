package com.budgeats.sg.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.budgeats.sg.core.session.SessionManager;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SessionManager sessionManager;

    @Test
    void unauthenticatedMeReturns401WithCommonFailureEnvelope() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void unauthenticatedLogoutReturns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHENTICATED"));
    }

    @Test
    void loggedInSessionReturnsCurrentUserWithoutExposingTokens() throws Exception {
        User user = userRepository.save(new User("google-sub-auth-test", "지한"));
        Cookie sessionCookie = issueSessionCookie(user.getId());

        mockMvc.perform(get("/api/v1/auth/me").cookie(sessionCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.user.id").value(user.getId()))
                .andExpect(jsonPath("$.data.user.displayName").value("지한"))
                .andExpect(jsonPath("$.data.user.googleSub").doesNotExist())
                .andExpect(jsonPath("$.data.accessToken").doesNotExist())
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist());
    }

    @Test
    void googleLoginRedirectsWithHttpOnlyStateCookie() throws Exception {
        mockMvc.perform(get("/api/v1/auth/google"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith(
                        "https://accounts.google.com/o/oauth2/v2/auth")))
                .andExpect(result -> {
                    String setCookie = result.getResponse().getHeader("Set-Cookie");
                    assertThat(setCookie).contains("oauth_state=");
                    assertThat(setCookie).containsIgnoringCase("HttpOnly");
                });
    }

    @Test
    void sessionCookieIsHttpOnlyAndScopedToConfiguredSameSite() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        sessionManager.issue(response, 1L);

        String setCookie = response.getHeader("Set-Cookie");
        assertThat(setCookie).contains("HttpOnly");
        assertThat(setCookie).containsIgnoringCase("SameSite=Lax");
    }

    private Cookie issueSessionCookie(Long userId) {
        MockHttpServletResponse response = new MockHttpServletResponse();
        sessionManager.issue(response, userId);
        String setCookie = response.getHeader("Set-Cookie");
        String value = setCookie.substring("session=".length(), setCookie.indexOf(';'));
        return new Cookie("session", value);
    }
}
