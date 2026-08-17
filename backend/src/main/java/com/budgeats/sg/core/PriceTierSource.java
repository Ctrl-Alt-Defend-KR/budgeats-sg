package com.budgeats.sg.core;

import com.fasterxml.jackson.annotation.JsonValue;

/** 등급 산정 근거 (backend-agent-plan.md 6절 응답 필드 priceTierSource). */
public enum PriceTierSource {
    ACTUAL,
    GOOGLE,
    UNKNOWN;

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }
}
