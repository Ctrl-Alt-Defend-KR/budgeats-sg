package com.budgeats.sg.service.auth;

import com.budgeats.sg.core.BudgeatsProperties;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class GoogleIdTokenValidator {

    private static final Logger log = LoggerFactory.getLogger(GoogleIdTokenValidator.class);

    private final GoogleIdTokenVerifier verifier;

    @Autowired
    public GoogleIdTokenValidator(BudgeatsProperties properties) {
        this(new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(List.of(properties.googleOauthClientId()))
                .build());
    }

    GoogleIdTokenValidator(GoogleIdTokenVerifier verifier) {
        this.verifier = verifier;
    }

    public VerifiedClaims verify(String rawIdToken) {
        try {
            GoogleIdToken token = verifier.verify(rawIdToken);
            if (token == null || token.getPayload().getSubject() == null
                    || token.getPayload().getSubject().isBlank()) {
                throw invalidToken();
            }
            GoogleIdToken.Payload payload = token.getPayload();
            return new VerifiedClaims(
                    payload.getSubject(),
                    (String) payload.get("name"),
                    Boolean.TRUE.equals(payload.getEmailVerified()),
                    payload.getHostedDomain()
            );
        } catch (GeneralSecurityException | IOException | IllegalArgumentException exception) {
            log.warn("Google ID Token 검증 실패", exception);
            throw invalidToken();
        }
    }

    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "구글 ID Token 검증에 실패했습니다.");
    }

    public record VerifiedClaims(
            String subject,
            String name,
            boolean emailVerified,
            String hostedDomain
    ) {
    }
}
