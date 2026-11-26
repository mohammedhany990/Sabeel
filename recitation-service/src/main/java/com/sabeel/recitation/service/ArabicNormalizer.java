package com.sabeel.recitation.service;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ArabicNormalizer {

    public String normalize(String text) {
        if (text == null) {
            return "";
        }
        String s = text.replaceAll("[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]", "");
        s = s.replace("\u0640", "");
        s = s.replaceAll("[\\u0623\\u0625\\u0622\\u0671\\u0672\\u0673\\u0675]", "\u0627");
        s = s.replace("\u0629", "\u0647");
        s = s.replace("\u0649", "\u064A");
        s = s.replace("\u0624", "\u0648");
        s = s.replace("\u0626", "\u064A");
        s = s.replaceAll("[^\\u0621-\\u064A0-9\\s]", " ");
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }

    public List<String> tokens(String text) {
        String normalized = normalize(text);
        if (normalized.isEmpty()) {
            return List.of();
        }
        return List.of(normalized.split(" "));
    }
}
