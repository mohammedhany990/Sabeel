package com.sabeel.quran.controller;

import com.sabeel.quran.dto.*;
import com.sabeel.quran.service.EditionService;
import com.sabeel.quran.service.QuranService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/quran")
@RequiredArgsConstructor
@Tag(name = "Quran")
public class QuranController {
    private final QuranService quranService;
    private final EditionService editionService;

    @GetMapping("/surahs")
    @Operation(summary = "List all surahs")
    public List<SurahResponse> surahs() {
        return quranService.surahs();
    }

    @GetMapping("/surahs/{id}")
    @Operation(summary = "Get a surah with its ayahs")
    public List<AyahResponse> surah(@PathVariable int id) {
        return quranService.surahAyahs(id);
    }

    @GetMapping("/ayahs/{surah}/{number}")
    @Operation(summary = "Get one ayah")
    public AyahResponse ayah(@PathVariable int surah, @PathVariable int number) {
        return quranService.ayah(surah, number);
    }

    @GetMapping("/pages/{page}")
    @Operation(summary = "Get a mushaf page")
    public List<AyahResponse> page(@PathVariable int page) {
        return quranService.page(page);
    }

    @GetMapping("/juz/{juz}")
    @Operation(summary = "Get a juz")
    public List<AyahResponse> juz(@PathVariable int juz) {
        return quranService.juz(juz);
    }

    @GetMapping("/search")
    @Operation(summary = "Full-text search over ayah text")
    public PagedResponse<AyahResponse> search(@RequestParam String q,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return quranService.search(q, page, size);
    }

    @GetMapping("/reciters")
    @Operation(summary = "List available reciters")
    public List<ReciterResponse> reciters() {
        return quranService.reciters();
    }

    @GetMapping("/reciters/{id}/audio")
    @Operation(summary = "Get the audio URL of one ayah for a reciter")
    public AyahAudioResponse audio(@PathVariable int id, @RequestParam int surah, @RequestParam int ayah) {
        return quranService.ayahAudio(id, surah, ayah);
    }

    @GetMapping("/reciters/{id}/surahs/{surahId}/timings")
    @Operation(summary = "Get ayah start and end times inside the full-surah audio of a reciter")
    public SurahTimingsResponse surahTimings(@PathVariable int id, @PathVariable int surahId) {
        return quranService.surahTimings(id, surahId);
    }

    @GetMapping("/reciters/{id}/surahs/{surahId}/audio")
    @Operation(summary = "Get the full-surah recitation audio URL for a reciter")
    public SurahAudioResponse surahAudio(@PathVariable int id, @PathVariable int surahId) {
        return quranService.surahAudio(id, surahId);
    }

    @GetMapping("/editions")
    @Operation(summary = "List bundled tafsir and translation editions with source and version")
    public List<EditionInfo> editions() {
        return editionService.editions();
    }

    @GetMapping("/editions/{key}/{surah}/{ayah}")
    @Operation(summary = "Get the tafsir, translation or word meanings of one ayah from an edition")
    public EditionAyahResponse editionAyah(@PathVariable String key, @PathVariable int surah, @PathVariable int ayah) {
        return editionService.ayah(key, surah, ayah);
    }
}
