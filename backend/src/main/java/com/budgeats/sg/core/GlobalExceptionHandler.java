package com.budgeats.sg.core;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final Map<Integer, String> ERROR_CODES = Map.of(
            400, "INVALID_INPUT",
            401, "UNAUTHENTICATED",
            403, "FORBIDDEN",
            404, "NOT_FOUND",
            409, "CONFLICT",
            422, "INVALID_INPUT",
            429, "RATE_LIMITED"
    );

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<ApiResponse<Void>> handleNotFound(Exception exception) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 경로를 찾을 수 없습니다.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleBodyValidation(MethodArgumentNotValidException exception) {
        FieldError fieldError = exception.getBindingResult().getFieldError();
        String message = fieldError == null
                ? "입력값이 올바르지 않습니다."
                : fieldError.getField() + ": " + fieldError.getDefaultMessage();
        return invalidInput(message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintValidation(ConstraintViolationException exception) {
        ConstraintViolation<?> violation = exception.getConstraintViolations().stream().findFirst().orElse(null);
        String message = violation == null
                ? "입력값이 올바르지 않습니다."
                : violation.getPropertyPath() + ": " + violation.getMessage();
        return invalidInput(message);
    }

    @ExceptionHandler({
            HandlerMethodValidationException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleRequestValidation(Exception exception) {
        return invalidInput("입력값이 올바르지 않습니다.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatus(ResponseStatusException exception) {
        int status = exception.getStatusCode().value();
        String code = ERROR_CODES.getOrDefault(status, "ERROR");
        String message = exception.getReason() == null
                ? "요청을 처리할 수 없습니다."
                : exception.getReason();
        return error(exception.getStatusCode(), code, message);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception exception) {
        log.error("처리되지 않은 예외", exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 오류가 발생했습니다.");
    }

    private ResponseEntity<ApiResponse<Void>> invalidInput(String message) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_INPUT", message);
    }

    private ResponseEntity<ApiResponse<Void>> error(HttpStatusCode status, String code, String message) {
        return ResponseEntity.status(status).body(ApiResponse.failure(code, message));
    }
}
