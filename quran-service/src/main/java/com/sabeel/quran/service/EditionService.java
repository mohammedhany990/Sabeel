package com.sabeel.quran.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sabeel.quran.dto.EditionAyahResponse;
import com.sabeel.quran.dto.EditionEntry;
import com.sabeel.quran.dto.EditionHit;
import com.sabeel.quran.dto.EditionInfo;
import com.sabeel.quran.exception.ApiException;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EditionService {
    private static final ObjectMapper MAPPER = new ObjectMapper().configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private static final String BASE = "/quran/editions/";

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Manifest(List<EditionInfo> editions) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Row(int s, int from, int to, String text, String notes) {
    }

    private final List<EditionInfo> editions;
    private final Map<String, Map<Integer, List<Row>>> cache = new ConcurrentHashMap<>();

    public EditionService() {
        try (InputStream in = EditionService.class.getResourceAsStream(BASE + "editions.json")) {
            this.editions = in == null ? List.of() : MAPPER.readValue(in, Manifest.class).editions();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public List<EditionInfo> editions() {
        return editions;
    }

    public EditionInfo info(String key) {
        return editions.stream().filter(e -> e.key().equals(key)).findFirst()
                .orElseThrow(() -> ApiException.notFound("edition not found"));
    }

    public EditionAyahResponse ayah(String key, int surah, int ayah) {
        EditionInfo info = info(key);
        if (surah < 1 || surah > 114 || ayah < 1) {
            throw ApiException.badRequest("Invalid surah or ayah");
        }
        List<Row> rows = load(info.key()).getOrDefault(surah, List.of());
        List<EditionEntry> out = new ArrayList<>();
        for (Row r : rows) {
            if (r.from() >= 1 && r.from() <= ayah && ayah <= r.to()) {
                out.add(new EditionEntry(r.from(), r.to(), r.text(), r.notes()));
            }
        }
        return new EditionAyahResponse(info, surah, ayah, out);
    }

    public List<EditionHit> search(String key, String query, int limit) {
        EditionInfo info = info(key);
        String q = query == null ? "" : query.strip();
        if (q.codePointCount(0, q.length()) < 3) {
            throw ApiException.badRequest("Search text must be at least 3 characters");
        }
        int max = Math.max(1, Math.min(limit, 50));
        String needle = q.toLowerCase();
        List<EditionHit> hits = new ArrayList<>();
        Map<Integer, List<Row>> bySurah = load(info.key());
        for (int surah = 1; surah <= 114 && hits.size() < max; surah++) {
            for (Row r : bySurah.getOrDefault(surah, List.of())) {
                if (r.text() == null) {
                    continue;
                }
                int at = r.text().toLowerCase().indexOf(needle);
                if (at >= 0) {
                    hits.add(new EditionHit(surah, r.from(), snippet(r.text(), at, needle.length())));
                    if (hits.size() >= max) {
                        break;
                    }
                }
            }
        }
        return hits;
    }

    static String snippet(String text, int at, int length) {
        int from = Math.max(0, at - 60);
        int to = Math.min(text.length(), at + length + 120);
        String body = text.substring(from, to).replaceAll("\\s+", " ").strip();
        return (from > 0 ? "..." : "") + body + (to < text.length() ? "..." : "");
    }

    private Map<Integer, List<Row>> load(String key) {
        return cache.computeIfAbsent(key, k -> {
            Map<Integer, List<Row>> bySurah = new ConcurrentHashMap<>();
            try (InputStream in = EditionService.class.getResourceAsStream(BASE + k + ".jsonl")) {
                if (in == null) {
                    return bySurah;
                }
                BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isBlank()) {
                        continue;
                    }
                    Row row = MAPPER.readValue(line, Row.class);
                    bySurah.computeIfAbsent(row.s(), s -> new ArrayList<>()).add(row);
                }
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
            return bySurah;
        });
    }
}
