package com.budgeats.sg.dto.place;

/** CLAUDE.md 6.4절 — 평점·좌표는 리뷰 작성 팝업에 불필요해 넣지 않는다. */
public record PlaceSearchResult(String placeId, String name, String address) {
}
