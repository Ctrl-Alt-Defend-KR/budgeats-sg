package com.budgeats.sg.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.domain.User;
import com.budgeats.sg.repository.UserRepository;
import com.budgeats.sg.service.auth.GoogleIdTokenValidator.VerifiedClaims;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AuthServiceSchoolEligibilityTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final AuthService authService = new AuthService(
            properties(), userRepository, mock(GoogleIdTokenValidator.class)
    );

    @Test
    void existingUserSchoolCodeIsUpdatedOnLogin() {
        User existing = new User("sub-existing", "기존 사용자", "OLD_SCHOOL");
        when(userRepository.findByGoogleSub("sub-existing")).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        User updated = authService.upsertVerifiedUser(
                new VerifiedClaims("sub-existing", "새 이름", true, "test.example.edu")
        );

        assertThat(updated.getSchoolCode()).isEqualTo("TEST_SCHOOL");
        verify(userRepository).save(existing);
    }

    @Test
    void unverifiedEmailDisallowedDomainAndMissingHdDoNotGrantSchool() {
        when(userRepository.findByGoogleSub(any())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User unverified = authService.upsertVerifiedUser(
                new VerifiedClaims("sub-unverified", "사용자", false, "test.example.edu")
        );
        User disallowed = authService.upsertVerifiedUser(
                new VerifiedClaims("sub-disallowed", "사용자", true, "other.example.edu")
        );
        User missingHd = authService.upsertVerifiedUser(
                new VerifiedClaims("sub-no-hd", "사용자", true, null)
        );

        assertThat(unverified.getSchoolCode()).isNull();
        assertThat(disallowed.getSchoolCode()).isNull();
        assertThat(missingHd.getSchoolCode()).isNull();
    }

    private BudgeatsProperties properties() {
        return new BudgeatsProperties(
                "local", "http://localhost:5173", "", "test-client", "",
                "http://localhost:8000/api/v1/auth/google/callback", "http://localhost:5173", "",
                604800, false, "lax", new BigDecimal("8"), new BigDecimal("15"),
                3, 1000, 1500, 10,
                new BudgeatsProperties.School("test.example.edu=TEST_SCHOOL"),
                new BudgeatsProperties.Turnstile(
                        "test-site", "test-secret", "review-create", "test.example.com", 5000
                )
        );
    }
}
