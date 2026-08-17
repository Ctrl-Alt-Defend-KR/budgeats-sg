package com.budgeats.sg.core.session;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * {@code @CurrentUser} 해석기 등록 전용. 루트 {@code core/WebConfig} 는 동결 파일이라
 * 건드리지 않는다 — 별도 WebMvcConfigurer 빈으로 Spring MVC 설정을 합성한다.
 */
@Configuration
public class SessionWebConfig implements WebMvcConfigurer {

    private final CurrentUserArgumentResolver currentUserArgumentResolver;

    public SessionWebConfig(CurrentUserArgumentResolver currentUserArgumentResolver) {
        this.currentUserArgumentResolver = currentUserArgumentResolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserArgumentResolver);
    }
}
