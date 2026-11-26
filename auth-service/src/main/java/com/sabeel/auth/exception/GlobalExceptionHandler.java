package com.sabeel.auth.exception;

import lombok.extern.slf4j.Slf4j;
import com.sabeel.auth.i18n.ErrorMessages;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    ProblemDetail handleApi(ApiException ex, Locale locale, HttpServletResponse response) {
        response.setHeader("Content-Language", ErrorMessages.language(locale));
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ErrorMessages.translate(ex.getMessage(), locale));
        problem.setTitle(ErrorMessages.title(ex.getStatus().getReasonPhrase(), locale));
        problem.setType(URI.create("https://sabeel.app/errors/" + ex.getStatus().value()));
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException ex, Locale locale, HttpServletResponse response) {
        response.setHeader("Content-Language", ErrorMessages.language(locale));
        Map<String, String> fields = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, f -> f.getDefaultMessage() == null ? "invalid" : f.getDefaultMessage(), (a, b) -> a));
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ErrorMessages.translate("validation failed", locale));
        problem.setTitle(ErrorMessages.title("Validation Failed", locale));
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("fields", fields);
        return problem;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleGeneric(Exception ex, Locale locale, HttpServletResponse response) {
        response.setHeader("Content-Language", ErrorMessages.language(locale));
        log.error("unhandled exception", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, ErrorMessages.translate("unexpected error", locale));
        problem.setTitle(ErrorMessages.title("Internal Server Error", locale));
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
