package com.sabeel.quran.seed;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.quran.domain.Reciter;
import com.sabeel.quran.repository.ReciterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReciterCatalog {
    private static final String BUNDLED = "/quran/reciters.json";

    private final ReciterRepository reciterRepository;

    @Value("${quran.reciters.file:}")
    private String externalFile;

    @JsonIgnoreProperties(ignoreUnknown = false)
    public record Entry(String key, String nameAr, String nameEn, String country, String style,
                        String ayahBaseUrl, String surahBaseUrl) {
    }

    public record Catalog(List<Entry> reciters) {
    }

    public void sync() {
        Map<String, Entry> merged = new LinkedHashMap<>();
        try (InputStream in = ReciterCatalog.class.getResourceAsStream(BUNDLED)) {
            if (in == null) {
                throw new IllegalStateException("missing bundled reciters file");
            }
            parse(in).forEach(e -> merged.put(e.key(), e));
        } catch (IOException e) {
            throw new IllegalStateException("could not read bundled reciters", e);
        }
        if (externalFile != null && !externalFile.isBlank()) {
            Path path = Path.of(externalFile.trim());
            if (!Files.isRegularFile(path)) {
                throw new IllegalStateException("reciters file not found: " + path);
            }
            try (InputStream in = Files.newInputStream(path)) {
                parse(in).forEach(e -> merged.put(e.key(), e));
            } catch (IOException e) {
                throw new IllegalStateException("could not read reciters file " + path, e);
            }
        }
        merged.values().forEach(this::upsert);
        log.info("reciter catalog synced: {} reciters", merged.size());
    }

    public static List<Entry> parse(InputStream in) throws IOException {
        Catalog catalog = new ObjectMapper().readValue(in, Catalog.class);
        if (catalog.reciters() == null) {
            throw new IllegalArgumentException("reciters file needs a top-level \"reciters\" list");
        }
        List<Entry> out = new ArrayList<>();
        for (Entry e : catalog.reciters()) {
            validate(e);
            out.add(e);
        }
        return out;
    }

    private static void validate(Entry e) {
        require(e.key(), "key");
        require(e.nameAr(), "nameAr");
        require(e.nameEn(), "nameEn");
        if (blank(e.ayahBaseUrl()) && blank(e.surahBaseUrl())) {
            throw new IllegalArgumentException("reciter " + e.key() + " needs ayahBaseUrl, surahBaseUrl or both");
        }
        if (!e.key().matches("[a-z0-9][a-z0-9_-]*")) {
            throw new IllegalArgumentException("reciter key must be lowercase letters, digits, - or _: " + e.key());
        }
        if (!blank(e.ayahBaseUrl())) {
            checkUrl(e.key(), e.ayahBaseUrl());
        }
        if (!blank(e.surahBaseUrl())) {
            checkUrl(e.key(), e.surahBaseUrl());
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static void require(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("reciter entry is missing " + field);
        }
    }

    private static void checkUrl(String key, String url) {
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
            throw new IllegalArgumentException("reciter " + key + " needs an http(s) base URL: " + url);
        }
    }

    private void upsert(Entry e) {
        Reciter reciter = reciterRepository.findByReciterKey(e.key())
                .or(() -> reciterRepository.findFirstByNameEnAndReciterKeyIsNull(e.nameEn()))
                .orElseGet(Reciter::new);
        reciter.setReciterKey(e.key());
        reciter.setNameAr(e.nameAr());
        reciter.setNameEn(e.nameEn());
        reciter.setCountry(e.country());
        reciter.setStyle(e.style());
        reciter.setAudioBaseUrl(blank(e.ayahBaseUrl()) ? "" : e.ayahBaseUrl());
        reciter.setFullAudioBaseUrl(blank(e.surahBaseUrl()) ? null : e.surahBaseUrl());
        reciterRepository.save(reciter);
    }
}
