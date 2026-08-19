package com.budgeats.sg.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.budgeats.sg.service.auth.GoogleIdTokenValidator.VerifiedClaims;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.webtoken.JsonWebSignature;
import java.io.IOException;
import java.security.GeneralSecurityException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class GoogleIdTokenValidatorTest {

    private final GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
    private final GoogleIdTokenValidator validator = new GoogleIdTokenValidator(verifier);

    @Test
    void returnsOnlyClaimsFromTokenAcceptedByGoogleVerifier() throws Exception {
        when(verifier.verify("valid-token")).thenReturn(token("sub-1", "테스트 사용자", true, "test.example.edu"));

        VerifiedClaims claims = validator.verify("valid-token");

        assertThat(claims.subject()).isEqualTo("sub-1");
        assertThat(claims.name()).isEqualTo("테스트 사용자");
        assertThat(claims.emailVerified()).isTrue();
        assertThat(claims.hostedDomain()).isEqualTo("test.example.edu");
    }

    @ParameterizedTest(name = "Google verifier가 {0} 검증에 실패한 토큰을 거부한다")
    @ValueSource(strings = {"invalid-signature", "invalid-issuer", "invalid-audience", "expired"})
    void rejectsTokensRejectedByGoogleVerifier(String rawToken) throws Exception {
        when(verifier.verify(rawToken)).thenReturn(null);

        assertThatThrownBy(() -> validator.verify(rawToken))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void providerKeyLookupFailureIsRejected() throws Exception {
        when(verifier.verify("lookup-failure")).thenThrow(new IOException("test failure"));

        assertThatThrownBy(() -> validator.verify("lookup-failure"))
                .isInstanceOf(ResponseStatusException.class);
    }

    private GoogleIdToken token(String subject, String name, boolean emailVerified, String hostedDomain)
            throws GeneralSecurityException {
        GoogleIdToken.Payload payload = new GoogleIdToken.Payload()
                .setEmailVerified(emailVerified)
                .setHostedDomain(hostedDomain);
        payload.setSubject(subject);
        payload.set("name", name);
        return new GoogleIdToken(new JsonWebSignature.Header(), payload, new byte[0], new byte[0]);
    }
}
