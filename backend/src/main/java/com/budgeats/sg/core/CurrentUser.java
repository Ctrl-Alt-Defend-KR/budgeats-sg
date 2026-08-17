package com.budgeats.sg.core;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 메서드 파라미터에 붙여 로그인한 사용자를 주입받는다.
 * 세션이 없으면 401을 반환한다. 해석기(HandlerMethodArgumentResolver) 구현은
 * Agent A(core/session) 소유 — 이 애노테이션 선언은 Step 0 seam 이므로 여기서 옮기지 않는다.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.PARAMETER)
public @interface CurrentUser {
}
