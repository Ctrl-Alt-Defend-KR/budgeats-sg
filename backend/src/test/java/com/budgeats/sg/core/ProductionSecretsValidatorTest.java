package com.budgeats.sg.core;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ProductionSecretsValidatorTest {

    @Test
    void localAllowsEmptySecrets() {
        ProductionSecretsValidator validator = new ProductionSecretsValidator(properties("local", false, "", "", "", ""));
        assertDoesNotThrow(validator::validate);
    }

    @Test
    void nonLocalRejectsEmptySecrets() {
        ProductionSecretsValidator validator = new ProductionSecretsValidator(properties("production", true, "", "", "", ""));
        assertThrows(IllegalStateException.class, validator::validate);
    }

    @Test
    void nonLocalRequiresSecureCookie() {
        ProductionSecretsValidator validator = new ProductionSecretsValidator(properties("production", false, "x", "x", "x", "x"));
        assertThrows(IllegalStateException.class, validator::validate);
    }

    private BudgeatsProperties properties(
            String appEnv,
            boolean cookieSecure,
            String placesKey,
            String oauthClientId,
            String oauthClientSecret,
            String sessionSecret
    ) {
        return new BudgeatsProperties(
                appEnv,
                "http://localhost:5173",
                placesKey,
                oauthClientId,
                oauthClientSecret,
                "http://localhost:8000/api/v1/auth/google/callback",
                "http://localhost:5173",
                sessionSecret,
                604800,
                cookieSecure,
                "lax",
                new BigDecimal("8"),
                new BigDecimal("15"),
                3,
                1000,
                1500,
                10,
                new BudgeatsProperties.School("test.example.edu=TEST_SCHOOL"),
                new BudgeatsProperties.Turnstile(
                        "turnstile-site-key", "turnstile-secret-key", "review-create", "test.example.com", 5000
                )
        );
    }
}
