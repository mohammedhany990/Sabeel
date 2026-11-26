package com.sabeel.quran;

import com.sabeel.quran.dto.AyahTiming;
import com.sabeel.quran.service.AyahTimingsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class AyahTimingsServiceTest {
    @TempDir
    Path dir;

    private void write(String key, String name, String content) throws IOException {
        Path d = dir.resolve(key);
        Files.createDirectories(d);
        Files.writeString(d.resolve(name), content, StandardCharsets.UTF_8);
    }

    @Test
    void loadsValidTimings() throws IOException {
        write("husary_own", "001.json", "{\"surah\":1,\"ayahs\":[{\"ayah\":1,\"start\":0.0,\"end\":5.5},{\"ayah\":2,\"start\":5.5,\"end\":9.0}]}");
        AyahTimingsService service = new AyahTimingsService(dir.toString());
        assertThat(service.hasAny("husary_own")).isTrue();
        Optional<List<AyahTiming>> loaded = service.load("husary_own", 1);
        assertThat(loaded).isPresent();
        assertThat(loaded.get()).hasSize(2);
        assertThat(loaded.get().get(1).start()).isEqualTo(5.5);
    }

    @Test
    void missingOrInvalidTimingsFallBackToEmpty() throws IOException {
        write("husary_own", "002.json", "{\"ayahs\":[{\"ayah\":1,\"start\":4.0,\"end\":2.0}]}");
        AyahTimingsService service = new AyahTimingsService(dir.toString());
        assertThat(service.load("husary_own", 1)).isEmpty();
        assertThat(service.load("husary_own", 2)).isEmpty();
        assertThat(service.load("other", 1)).isEmpty();
        assertThat(service.hasAny("other")).isFalse();
    }

    @Test
    void unconfiguredDirectoryAndUnsafeKeysAreIgnored() {
        assertThat(new AyahTimingsService("").hasAny("husary_own")).isFalse();
        assertThat(new AyahTimingsService(dir.toString()).load("../x", 1)).isEmpty();
    }
}
