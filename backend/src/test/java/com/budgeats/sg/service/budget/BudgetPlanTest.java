package com.budgeats.sg.service.budget;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.budgeats.sg.core.BudgeatsProperties;
import com.budgeats.sg.core.PriceTier;
import com.budgeats.sg.core.PriceTierSource;
import com.budgeats.sg.dto.budget.BudgetPlanRequest;
import com.budgeats.sg.dto.budget.BudgetPlanResponse;
import com.budgeats.sg.dto.place.PlaceSummary;
import com.budgeats.sg.service.places.GooglePlace;
import com.budgeats.sg.service.places.PlacesClient;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@AutoConfigureMockMvc
class BudgetPlanTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BudgetPlanService budgetPlanService;

    @Autowired
    private BudgeatsProperties properties;

    @Autowired
    private Validator validator;

    @Autowired
    private DataSource dataSource;

    @MockitoBean
    private PlacesClient placesClient;

    @Test
    void endpointCallsNearbyOnceAndReturnsSharedPlaceShape() throws Exception {
        when(placesClient.searchNearby(anyDouble(), anyDouble(), anyInt())).thenReturn(List.of(
                googlePlace("budget-a"),
                googlePlace("budget-b")
        ));

        mockMvc.perform(post("/api/v1/budget-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"totalBudgetSgd":32,"days":2,"mealsPerDay":2,
                                 "lat":1.2966,"lng":103.7764}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.perMealBudgetSgd").value(8.0))
                .andExpect(jsonPath("$.data.targetPriceTier").value("low"))
                .andExpect(jsonPath("$.data.days[0].meals[0].place.placeId").value("budget-a"))
                .andExpect(jsonPath("$.data.days[1].meals[0].place.placeId").value("budget-b"))
                .andExpect(jsonPath("$.data.notice").doesNotExist());
        verify(placesClient).searchNearby(
                eq(1.2966),
                eq(103.7764),
                eq(properties.placesNearbyDefaultRadiusM())
        );
    }

    @Test
    void endpointRejectsOversizedScheduleBeforeCallingPlaces() throws Exception {
        mockMvc.perform(post("/api/v1/budget-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"totalBudgetSgd":100,"days":15,"mealsPerDay":5,
                                 "lat":1.2966,"lng":103.7764}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        verifyNoInteractions(placesClient);
    }

    @Test
    void endpointReturnsEmptyPlanWithNoticeWhenNearbyLookupFails() throws Exception {
        when(placesClient.searchNearby(anyDouble(), anyDouble(), anyInt()))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Places unavailable"));

        mockMvc.perform(post("/api/v1/budget-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"totalBudgetSgd":100,"days":2,"mealsPerDay":2,
                                 "lat":1.2966,"lng":103.7764}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.perMealBudgetSgd").value(25.0))
                .andExpect(jsonPath("$.data.targetPriceTier").value("high"))
                .andExpect(jsonPath("$.data.days[0].meals[0].place").doesNotExist())
                .andExpect(jsonPath("$.data.days[1].meals[1].place").doesNotExist())
                .andExpect(jsonPath("$.data.notice")
                        .value("조건에 맞는 식당이 부족해 일부 끼니를 비워 두었습니다."));
        verify(placesClient).searchNearby(anyDouble(), anyDouble(), anyInt());
    }

    @Test
    void calculatesRoundedPerMealBudgetAndTargetTier() {
        BudgetPlanRequest request = request("100", 3, 3);

        BudgetPlanResponse response = budgetPlanService.create(request, List.of(
                place("mid", PriceTier.MID),
                place("low", PriceTier.LOW)
        ));

        assertThat(response.perMealBudgetSgd()).isEqualByComparingTo("11.11");
        assertThat(response.targetPriceTier()).isEqualTo(PriceTier.MID);
        assertThat(response.days()).hasSize(3);
        assertThat(response.notice()).isNotNull();
    }

    @Test
    void appliesInclusiveEightAndFifteenDollarBoundaries() {
        assertThat(budgetPlanService.create(request("8", 1, 1), List.of()).targetPriceTier())
                .isEqualTo(PriceTier.LOW);
        assertThat(budgetPlanService.create(request("15", 1, 1), List.of()).targetPriceTier())
                .isEqualTo(PriceTier.MID);
        assertThat(budgetPlanService.create(request("15.01", 1, 1), List.of()).targetPriceTier())
                .isEqualTo(PriceTier.HIGH);
    }

    @Test
    void avoidsDuplicatesWithinDayAndRotatesCandidatesNextDay() {
        BudgetPlanResponse response = budgetPlanService.create(request("32", 2, 2), List.of(
                place("a", PriceTier.LOW),
                place("b", PriceTier.LOW),
                place("ignored", PriceTier.HIGH)
        ));

        assertThat(response.days().get(0).meals())
                .extracting(meal -> meal.place().placeId())
                .containsExactly("a", "b");
        assertThat(response.days().get(1).meals())
                .extracting(meal -> meal.place().placeId())
                .containsExactly("b", "a");
        assertThat(response.notice()).isNull();
    }

    @Test
    void leavesUnmatchedMealsEmptyAndReturnsNotice() {
        BudgetPlanResponse response = budgetPlanService.create(request("32", 1, 4), List.of(
                place("only", PriceTier.LOW)
        ));

        assertThat(response.days().getFirst().meals()).hasSize(4);
        assertThat(response.days().getFirst().meals().getFirst().place().placeId()).isEqualTo("only");
        assertThat(response.days().getFirst().meals().subList(1, 4))
                .allMatch(meal -> meal.place() == null);
        assertThat(response.notice()).isEqualTo("조건에 맞는 식당이 부족해 일부 끼니를 비워 두었습니다.");
    }

    @Test
    void validatesScheduleLimits() {
        BudgetPlanRequest invalid = new BudgetPlanRequest(
                BigDecimal.TEN, 15, 5, 91.0, 181.0, 0
        );

        assertThat(validator.validate(invalid)).extracting(violation -> violation.getPropertyPath().toString())
                .contains("days", "mealsPerDay", "lat", "lng", "radius");
    }

    @Test
    void doesNotCreateBudgetPlansTable() throws Exception {
        try (var connection = dataSource.getConnection();
             var tables = connection.getMetaData().getTables(null, null, "BUDGET_PLANS", new String[]{"TABLE"})) {
            assertThat(tables.next()).isFalse();
        }
    }

    private BudgetPlanRequest request(String total, int days, int mealsPerDay) {
        return new BudgetPlanRequest(
                new BigDecimal(total), days, mealsPerDay, 1.2966, 103.7764, null
        );
    }

    private PlaceSummary place(String id, PriceTier tier) {
        return new PlaceSummary(
                id,
                "식당 " + id,
                "Singapore",
                4.0,
                10,
                1.2966,
                103.7764,
                tier,
                PriceTierSource.GOOGLE,
                null,
                0L
        );
    }

    private GooglePlace googlePlace(String id) {
        return new GooglePlace(
                id,
                new GooglePlace.DisplayName("식당 " + id),
                "Singapore",
                new GooglePlace.Location(1.2966, 103.7764),
                4.5,
                10,
                "PRICE_LEVEL_INEXPENSIVE"
        );
    }
}
