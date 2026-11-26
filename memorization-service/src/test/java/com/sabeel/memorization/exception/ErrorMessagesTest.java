package com.sabeel.memorization.exception;

import com.sabeel.memorization.i18n.ErrorMessages;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class ErrorMessagesTest {
    private static final Locale AR = Locale.forLanguageTag("ar-EG");
    private static final Locale EN = Locale.ENGLISH;

    @Test
    void englishIsReturnedUnchanged() {
        assertEquals("course not found", ErrorMessages.translate("course not found", EN));
        assertEquals("course not found", ErrorMessages.translate("course not found", null));
        assertEquals("course not found", ErrorMessages.translate("course not found", Locale.FRENCH));
    }

    @Test
    void arabicLocaleVariantsResolveToArabic() {
        assertEquals("الدورة غير موجودة", ErrorMessages.translate("course not found", Locale.forLanguageTag("ar")));
        assertEquals("الدورة غير موجودة", ErrorMessages.translate("course not found", AR));
        assertEquals(ErrorMessages.AR, ErrorMessages.language(Locale.forLanguageTag("ar-SA")));
        assertEquals(ErrorMessages.EN, ErrorMessages.language(Locale.GERMAN));
    }

    @Test
    void parameterisedMessagesKeepTheirValues() {
        assertEquals("المنطقة الزمنية 'Mars/Base' غير معروفة", ErrorMessages.translate("unknown timezone 'Mars/Base'", AR));
        assertEquals("السورة غير معروفة: 200", ErrorMessages.translate("unknown surah 200", AR));
        assertEquals("لا يوجد تسجيل كامل للسورة للقارئ 7", ErrorMessages.translate("no full-surah audio for reciter 7", AR));
    }

    @Test
    void unknownMessagesFallBackToEnglish() {
        assertEquals("something new", ErrorMessages.translate("something new", AR));
    }

    @Test
    void handlerLocalisesDetailTitleAndContentLanguage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        MockHttpServletResponse arabic = new MockHttpServletResponse();
        ProblemDetail problem = handler.handleApi(new ApiException(HttpStatus.NOT_FOUND, "course not found"), AR, arabic);
        assertEquals("الدورة غير موجودة", problem.getDetail());
        assertEquals("غير موجود", problem.getTitle());
        assertEquals("ar", arabic.getHeader("Content-Language"));

        MockHttpServletResponse english = new MockHttpServletResponse();
        ProblemDetail plain = handler.handleApi(new ApiException(HttpStatus.NOT_FOUND, "course not found"), EN, english);
        assertEquals("course not found", plain.getDetail());
        assertEquals("Not Found", plain.getTitle());
        assertEquals("en", english.getHeader("Content-Language"));
    }

    @Test
    void everyLiteralApiExceptionMessageInTheSourceHasAnArabicTranslation() throws IOException {
        Pattern literal = Pattern.compile("ApiException(?:\\.\\w+\\(|\\([^,]+,\\s*)\"([^\"]+)\"\\s*\\)");
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path file : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                Matcher m = literal.matcher(Files.readString(file));
                while (m.find()) {
                    assertTrue(ErrorMessages.hasArabic(m.group(1)), "missing Arabic translation for: " + m.group(1));
                }
            }
        }
    }
}
