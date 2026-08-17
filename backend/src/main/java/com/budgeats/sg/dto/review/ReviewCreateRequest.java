package com.budgeats.sg.dto.review;

import com.budgeats.sg.domain.VisitType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ReviewCreateRequest(
        @NotBlank @Size(max = 255) String placeId,
        @NotNull @Min(1) @Max(5) Integer rating,
        @NotNull @Positive BigDecimal pricePerPerson,
        @NotBlank String content,
        @Size(max = 4) List<@Valid @NotBlank String> tasteTags,
        @Size(max = 5) List<@Valid @NotBlank String> studentTags,
        @NotNull VisitType visitType,
        boolean revisit,
        boolean isAnonymous
) {
}
