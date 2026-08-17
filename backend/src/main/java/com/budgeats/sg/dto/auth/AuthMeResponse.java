package com.budgeats.sg.dto.auth;

/** CLAUDE.md 6.2절. googleSub 은 내부 식별자라 응답에 넣지 않는다. */
public record AuthMeResponse(UserSummary user) {

    public record UserSummary(Long id, String displayName) {
    }
}
