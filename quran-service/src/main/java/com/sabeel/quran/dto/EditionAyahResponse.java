package com.sabeel.quran.dto;

import java.util.List;

public record EditionAyahResponse(EditionInfo edition, int surah, int ayah, List<EditionEntry> entries) {
}
