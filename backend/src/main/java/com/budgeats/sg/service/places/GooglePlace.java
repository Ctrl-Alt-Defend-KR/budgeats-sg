package com.budgeats.sg.service.places;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Places API (New) 응답 매핑용. {@code place_id} 외의 필드는 절대 DB에 저장하지 않는다
 * (CLAUDE.md 3.1절) — 컨트롤러 응답에 실어 보내고 버린다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GooglePlace(
        String id,
        DisplayName displayName,
        String formattedAddress,
        Location location,
        Double rating,
        Integer userRatingCount,
        String priceLevel
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DisplayName(String text) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Location(Double latitude, Double longitude) {
    }

    public String name() {
        return displayName == null ? null : displayName.text();
    }

    /** PRICE_LEVEL_* enum 문자열 → PriceTierPolicy 가 쓰는 0~4 정수. 없으면 null (fallback UNKNOWN). */
    public Integer priceLevelValue() {
        if (priceLevel == null) {
            return null;
        }
        return switch (priceLevel) {
            case "PRICE_LEVEL_FREE" -> 0;
            case "PRICE_LEVEL_INEXPENSIVE" -> 1;
            case "PRICE_LEVEL_MODERATE" -> 2;
            case "PRICE_LEVEL_EXPENSIVE" -> 3;
            case "PRICE_LEVEL_VERY_EXPENSIVE" -> 4;
            default -> null;
        };
    }
}
