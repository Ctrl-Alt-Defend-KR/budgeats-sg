package com.budgeats.sg.service.review;

import com.budgeats.sg.core.BudgeatsProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ReviewRateLimiter {

    private static final Duration WINDOW = Duration.ofHours(1);

    private final int limit;
    private final Clock clock;
    // ponytail: 단일 인스턴스용 메모리 제한기다. 서버를 수평 확장할 때 공유 저장소 기반으로 교체한다.
    private final ConcurrentHashMap<Long, ArrayDeque<Instant>> attempts = new ConcurrentHashMap<>();

    @Autowired
    public ReviewRateLimiter(BudgeatsProperties properties) {
        this(properties.reviewRateLimitPerHour(), Clock.systemUTC());
    }

    ReviewRateLimiter(int limit, Clock clock) {
        this.limit = limit;
        this.clock = clock;
    }

    void check(Long userId) {
        Instant now = clock.instant();
        Instant cutoff = now.minus(WINDOW);
        attempts.compute(userId, (ignored, timestamps) -> {
            ArrayDeque<Instant> current = timestamps == null ? new ArrayDeque<>() : timestamps;
            while (!current.isEmpty() && !current.peekFirst().isAfter(cutoff)) {
                current.removeFirst();
            }
            if (current.size() >= limit) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "리뷰 작성 요청 한도를 초과했습니다.");
            }
            current.addLast(now);
            return current;
        });
    }
}
