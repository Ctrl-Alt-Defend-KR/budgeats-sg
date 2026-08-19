package com.budgeats.sg.core;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ProductionSecretsValidator {

    private final BudgeatsProperties properties;

    public ProductionSecretsValidator(BudgeatsProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void validate() {
        if ("local".equalsIgnoreCase(properties.appEnv())) {
            return;
        }

        List<String> missing = new ArrayList<>();
        addIfBlank(missing, "GOOGLE_PLACES_API_KEY", properties.googlePlacesApiKey());
        addIfBlank(missing, "GOOGLE_OAUTH_CLIENT_ID", properties.googleOauthClientId());
        addIfBlank(missing, "GOOGLE_OAUTH_CLIENT_SECRET", properties.googleOauthClientSecret());
        addIfBlank(missing, "SESSION_SECRET", properties.sessionSecret());
        addIfBlank(missing, "SCHOOL_DOMAIN_MAPPINGS", properties.school().domainMappings());
        addIfBlank(missing, "TURNSTILE_SITE_KEY", properties.turnstile().siteKey());
        addIfBlank(missing, "TURNSTILE_SECRET_KEY", properties.turnstile().secretKey());
        addIfBlank(missing, "TURNSTILE_EXPECTED_HOSTNAME", properties.turnstile().expectedHostname());

        if (!missing.isEmpty()) {
            throw new IllegalStateException("필수 환경변수가 비어 있습니다: " + String.join(", ", missing));
        }
        if (!properties.cookieSecure()) {
            throw new IllegalStateException("운영 환경에서는 COOKIE_SECURE=true 여야 합니다.");
        }
    }

    private void addIfBlank(List<String> missing, String name, String value) {
        if (value == null || value.isBlank()) {
            missing.add(name);
        }
    }
}
