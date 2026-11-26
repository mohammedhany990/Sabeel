package com.sabeel.notification;

import com.sabeel.notification.service.TemplateRenderer;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TemplateRendererTest {
    private final TemplateRenderer renderer = new TemplateRenderer();

    @Test
    void replacesNamedPlaceholders() {
        String out = renderer.render("Salam {name}, your task is surah {surah}.",
                Map.of("name", "Mohammed", "surah", "18"));
        assertThat(out).isEqualTo("Salam Mohammed, your task is surah 18.");
    }

    @Test
    void leavesUnknownPlaceholdersUntouched() {
        assertThat(renderer.render("hi {unknown}", Map.of())).isEqualTo("hi {unknown}");
    }
}
