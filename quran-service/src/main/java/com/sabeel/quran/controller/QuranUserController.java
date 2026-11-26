package com.sabeel.quran.controller;

import com.sabeel.quran.dto.*;
import com.sabeel.quran.service.QuranService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/quran")
@RequiredArgsConstructor
@Tag(name = "Quran personal")
public class QuranUserController {
    private final QuranService quranService;

    @PostMapping("/bookmarks")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Bookmark an ayah")
    public BookmarkResponse addBookmark(Authentication auth, @Valid @RequestBody BookmarkRequest request) {
        return quranService.addBookmark(userId(auth), request);
    }

    @GetMapping("/bookmarks")
    @Operation(summary = "List my bookmarks")
    public List<BookmarkResponse> bookmarks(Authentication auth) {
        return quranService.bookmarks(userId(auth));
    }

    @DeleteMapping("/bookmarks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a bookmark")
    public void removeBookmark(Authentication auth, @PathVariable UUID id) {
        quranService.removeBookmark(userId(auth), id);
    }

    @PutMapping("/reading-state")
    @Operation(summary = "Save my last-read ayah")
    public ReadingStateResponse updateReadingState(Authentication auth, @Valid @RequestBody ReadingStateRequest request) {
        return quranService.updateReadingState(userId(auth), request.lastAyahId());
    }

    @GetMapping("/reading-state")
    @Operation(summary = "Get my last-read ayah")
    public ReadingStateResponse readingState(Authentication auth) {
        return quranService.readingState(userId(auth));
    }

    @GetMapping("/reading-history")
    @Operation(summary = "Get my reading history")
    public PagedResponse<ReadingHistoryResponse> history(Authentication auth,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return quranService.history(userId(auth), page, size);
    }

    private UUID userId(Authentication auth) {
        return UUID.fromString(auth.getName());
    }
}
