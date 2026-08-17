package com.budgeats.sg.service.places;

import com.budgeats.sg.core.BudgeatsProperties;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Google Places API (New) 호출 전담. 이 클래스 밖에서 구글을 직접 호출하는 코드를 만들지
 * 않는다 (CLAUDE.md 3.1절, backend/CLAUDE.md). 필드 마스크는 호출부별로 최소화한다 —
 * reviews/photos 는 어떤 요청에서도 요청하지 않는다 (상위 SKU 과금).
 */
@Component
public class PlacesClient {

    private static final Logger log = LoggerFactory.getLogger(PlacesClient.class);
    private static final String BASE_URL = "https://places.googleapis.com/v1";

    private static final String NEARBY_FIELD_MASK =
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel";
    private static final String SEARCH_FIELD_MASK = "places.id,places.displayName,places.formattedAddress";
    private static final String DETAIL_FIELD_MASK =
            "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel";

    private final BudgeatsProperties properties;
    private final RestClient restClient = RestClient.create();

    public PlacesClient(BudgeatsProperties properties) {
        this.properties = properties;
    }

    public List<GooglePlace> searchNearby(double lat, double lng, int radiusM) {
        Map<String, Object> body = Map.of(
                "includedTypes", List.of("restaurant"),
                "maxResultCount", 20,
                "locationRestriction", Map.of(
                        "circle", Map.of(
                                "center", Map.of("latitude", lat, "longitude", lng),
                                "radius", (double) radiusM
                        )
                )
        );
        PlacesSearchResponse response = post("/places:searchNearby", NEARBY_FIELD_MASK, body, PlacesSearchResponse.class);
        return response == null || response.places() == null ? List.of() : response.places();
    }

    public List<GooglePlace> searchText(String query) {
        Map<String, Object> body = Map.of("textQuery", query);
        PlacesSearchResponse response = post("/places:searchText", SEARCH_FIELD_MASK, body, PlacesSearchResponse.class);
        return response == null || response.places() == null ? List.of() : response.places();
    }

    public GooglePlace getDetails(String placeId) {
        try {
            GooglePlace place = restClient.get()
                    .uri(BASE_URL + "/places/{placeId}", placeId)
                    .header("X-Goog-Api-Key", properties.googlePlacesApiKey())
                    .header("X-Goog-FieldMask", DETAIL_FIELD_MASK)
                    .retrieve()
                    .body(GooglePlace.class);
            if (place == null) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "식당 정보를 찾을 수 없습니다.");
            }
            return place;
        } catch (RestClientException e) {
            log.error("Places 상세 조회 실패", e);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "식당 정보를 찾을 수 없습니다.");
        }
    }

    private <T> T post(String path, String fieldMask, Object body, Class<T> responseType) {
        try {
            return restClient.post()
                    .uri(BASE_URL + path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Goog-Api-Key", properties.googlePlacesApiKey())
                    .header("X-Goog-FieldMask", fieldMask)
                    .body(body)
                    .retrieve()
                    .body(responseType);
        } catch (RestClientException e) {
            log.error("Places 검색 실패: {}", path, e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "식당 정보를 불러오지 못했습니다.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PlacesSearchResponse(List<GooglePlace> places) {
    }
}
