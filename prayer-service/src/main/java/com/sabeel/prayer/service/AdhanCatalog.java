package com.sabeel.prayer.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Component
public class AdhanCatalog {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Adhan(String id, String name, String nameAr, String url) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record File(List<Adhan> adhans) {
    }

    private final List<Adhan> adhans;

    public AdhanCatalog() {
        this("");
    }

    @Autowired
    public AdhanCatalog(@Value("${prayer.adhan.file:}") String file) {
        this.adhans = load(file);
    }

    public List<Adhan> adhans() {
        return adhans;
    }

    private static List<Adhan> load(String file) {
        if (file == null || file.isBlank()) {
            return List.of();
        }
        try {
            File parsed = MAPPER.readValue(Files.readString(Path.of(file.trim())), File.class);
            List<Adhan> valid = new ArrayList<>();
            for (Adhan a : parsed.adhans() == null ? List.<Adhan>of() : parsed.adhans()) {
                if (a.id() != null && a.id().matches("[a-z0-9][a-z0-9_-]*") && a.name() != null && validUrl(a.url())) {
                    valid.add(a);
                }
            }
            return List.copyOf(valid);
        } catch (IOException e) {
            throw new UncheckedIOException("cannot read adhan catalog " + file, e);
        }
    }

    private static boolean validUrl(String url) {
        if (url == null) {
            return false;
        }
        try {
            String scheme = URI.create(url).getScheme();
            return "https".equals(scheme) || "http".equals(scheme);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
