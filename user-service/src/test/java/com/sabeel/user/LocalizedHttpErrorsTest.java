package com.sabeel.user;

import com.sabeel.user.dto.UpdateProfileRequest;
import com.sabeel.user.exception.ApiException;
import com.sabeel.user.exception.GlobalExceptionHandler;
import jakarta.validation.Valid;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LocalizedHttpErrorsTest {
    @RestController
    static class Probe {
        @GetMapping("/probe/missing")
        String missing() {
            throw ApiException.notFound("profile not found");
        }

        @PutMapping("/probe/profile")
        String update(@Valid @RequestBody UpdateProfileRequest request) {
            return "ok";
        }
    }

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setSupportedLocales(List.of(Locale.ENGLISH, Locale.forLanguageTag("ar")));
        resolver.setDefaultLocale(Locale.ENGLISH);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new Probe())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setLocaleResolver(resolver)
                .setValidator(validator)
                .build();
    }

    @Test
    void arabicAcceptLanguageProducesArabicProblem() throws Exception {
        mvc.perform(get("/probe/missing").header("Accept-Language", "ar-EG,ar;q=0.9"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Content-Language", "ar"))
                .andExpect(jsonPath("$.detail").value("الملف الشخصي غير موجود"))
                .andExpect(jsonPath("$.title").value("غير موجود"));
    }

    @Test
    void missingOrUnsupportedAcceptLanguageProducesEnglish() throws Exception {
        for (String header : new String[]{null, "fr-FR", "en-US"}) {
            var request = get("/probe/missing");
            if (header != null) {
                request.header("Accept-Language", header);
            }
            mvc.perform(request)
                    .andExpect(header().string("Content-Language", "en"))
                    .andExpect(jsonPath("$.detail").value("profile not found"))
                    .andExpect(jsonPath("$.title").value("Not Found"));
        }
    }

    @Test
    void validationErrorsAreArabicWithArabicFieldMessages() throws Exception {
        mvc.perform(put("/probe/profile").header("Accept-Language", "ar")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"x\",\"preferredLanguage\":\"fr\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Language", "ar"))
                .andExpect(jsonPath("$.detail").value("فشل التحقق من صحة البيانات"))
                .andExpect(jsonPath("$.title").value("فشل التحقق من البيانات"))
                .andExpect(jsonPath("$.fields.name").value(org.hamcrest.Matchers.matchesPattern(".*[\\u0600-\\u06FF].*")));
    }

    @Test
    void validationErrorsStayEnglishWithoutHeader() throws Exception {
        mvc.perform(put("/probe/profile").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("validation failed"))
                .andExpect(jsonPath("$.fields.name").value("size must be between 2 and 120"));
    }
}
