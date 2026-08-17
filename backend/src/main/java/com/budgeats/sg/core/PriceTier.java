package com.budgeats.sg.core;

import com.fasterxml.jackson.annotation.JsonValue;

/** 핀 색상 등급 (CLAUDE.md 5.1절). JSON 직렬화는 소문자 — frontend/src/constants/price.ts 와 일치해야 한다. */
public enum PriceTier {
    LOW,
    MID,
    HIGH;

    @JsonValue
    public String toJson() {
        return name().toLowerCase();
    }
}
