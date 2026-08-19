package com.budgeats.sg.dto.review;

import com.budgeats.sg.domain.VisitType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ReviewUpdateRequest(
        @Min(1) @Max(5) Integer rating,
        @Positive BigDecimal pricePerPerson,
        String content,
        @Size(max = 4) List<@Valid @NotBlank String> tasteTags,
        @Size(max = 5) List<@Valid @NotBlank String> studentTags,
        VisitType visitType,
        Boolean revisit,
        Boolean isAnonymous,
        Boolean freeWater,
        Boolean serviceCharge,
        Boolean taxCharge
) {
    public boolean hasChanges() {
        return rating != null
                || pricePerPerson != null
                || content != null
                || tasteTags != null
                || studentTags != null
                || visitType != null
                || revisit != null
                || isAnonymous != null
                || freeWater != null
                || serviceCharge != null
                || taxCharge != null;
    }
}
