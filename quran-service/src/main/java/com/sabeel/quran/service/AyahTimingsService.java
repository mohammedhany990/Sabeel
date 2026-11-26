package com.sabeel.quran.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.quran.dto.AyahTiming;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Service
public class AyahTimingsService {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Path root;

    public AyahTimingsService() {
        this("");
    }

    @Autowired
    public AyahTimingsService(@Value("${quran.timings.dir:}") String dir) {
        this.root = dir == null || dir.isBlank() ? null : Path.of(dir.trim());
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Timings(List<AyahTiming> ayahs) {
    }

    public boolean hasAny(String reciterKey) {
        if (root == null || reciterKey == null || !reciterKey.matches("[a-z0-9][a-z0-9_-]*")) {
            return false;
        }
        Path dir = root.resolve(reciterKey);
        if (!Files.isDirectory(dir)) {
            return false;
        }
        try (Stream<Path> files = Files.list(dir)) {
            return files.anyMatch(p -> p.getFileName().toString().matches("\\d{3}\\.json"));
        } catch (IOException e) {
            return false;
        }
    }

    public Optional<List<AyahTiming>> load(String reciterKey, int surah) {
        if (root == null || reciterKey == null || !reciterKey.matches("[a-z0-9][a-z0-9_-]*")) {
            return Optional.empty();
        }
        Path file = root.resolve(reciterKey).resolve(String.format("%03d.json", surah));
        if (!Files.isRegularFile(file)) {
            return Optional.empty();
        }
        try (InputStream in = Files.newInputStream(file)) {
            return Optional.of(parse(in));
        } catch (IOException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    static List<AyahTiming> parse(InputStream in) throws IOException {
        Timings timings = MAPPER.readValue(in, Timings.class);
        if (timings.ayahs() == null || timings.ayahs().isEmpty()) {
            throw new IllegalArgumentException("timings file has no ayahs");
        }
        List<AyahTiming> out = new ArrayList<>();
        double previousStart = -1;
        for (AyahTiming t : timings.ayahs()) {
            if (t.start() < 0 || t.end() <= t.start() || t.start() < previousStart) {
                throw new IllegalArgumentException("invalid timing for ayah " + t.ayah());
            }
            previousStart = t.start();
            out.add(t);
        }
        return out;
    }
}
