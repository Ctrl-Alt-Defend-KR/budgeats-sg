package com.budgeats.sg.core;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "budgeats")
public record BudgeatsProperties(
        @NotBlank String appEnv,
        @NotBlank String frontendOrigin,
        String googlePlacesApiKey,
        String googleOauthClientId,
        String googleOauthClientSecret,
        @NotBlank String googleOauthRedirectUri,
        @NotBlank String oauthSuccessRedirect,
        String sessionSecret,
        @Positive int sessionMaxAgeSeconds,
        boolean cookieSecure,
        @NotBlank String cookieSameSite,
        @NotNull BigDecimal priceTierLowMaxSgd,
        @NotNull BigDecimal priceTierMidMaxSgd,
        @Positive int priceActualMinReviews,
        @Positive int reviewContentMaxLength,
        @Positive int placesNearbyDefaultRadiusM,
        @Positive int reviewRateLimitPerHour
) {
}
