package com.sabeel.quran.service;

import com.sabeel.quran.domain.*;
import com.sabeel.quran.dto.*;
import com.sabeel.quran.exception.ApiException;
import com.sabeel.quran.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuranService {
    private final SurahRepository surahRepository;
    private final AyahRepository ayahRepository;
    private final ReciterRepository reciterRepository;
    private final BookmarkRepository bookmarkRepository;
    private final ReadingStateRepository readingStateRepository;
    private final ReadingHistoryRepository readingHistoryRepository;
    private final AudioUrlService audioUrlService;
    private final AyahTimingsService timingsService;

    @Transactional(readOnly = true)
    public List<SurahResponse> surahs() {
        return surahRepository.findAll().stream().map(this::toSurahResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AyahResponse> surahAyahs(int surahId) {
        return ayahRepository.findBySurahIdOrderByAyahNumber(surahId).stream().map(this::toAyahResponse).toList();
    }

    @Transactional(readOnly = true)
    public AyahResponse ayah(int surahId, int ayahNumber) {
        return toAyahResponse(ayahRepository.findBySurahIdAndAyahNumber(surahId, ayahNumber)
                .orElseThrow(() -> ApiException.notFound("ayah not found")));
    }

    @Transactional(readOnly = true)
    public List<AyahResponse> page(int page) {
        return ayahRepository.findByPageOrderById(page).stream().map(this::toAyahResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AyahResponse> juz(int juz) {
        return ayahRepository.findByJuzOrderById(juz).stream().map(this::toAyahResponse).toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<AyahResponse> search(String q, int page, int size) {
        return PagedResponse.of(ayahRepository.search(q, PageRequest.of(page, Math.min(size, 50))), this::toAyahResponse);
    }

    @Transactional(readOnly = true)
    public List<ReciterResponse> reciters() {
        return reciterRepository.findAll().stream()
                .map(r -> new ReciterResponse(r.getId(), r.getNameAr(), r.getNameEn(), r.getCountry(), r.getStyle(),
                        ArabicLabels.country(r.getCountry()), ArabicLabels.style(r.getStyle()),
                        r.getAudioBaseUrl() != null && !r.getAudioBaseUrl().isBlank(),
                        r.getFullAudioBaseUrl() != null && !r.getFullAudioBaseUrl().isBlank(),
                        timingsService.hasAny(r.getReciterKey())))
                .toList();
    }

    @Transactional(readOnly = true)
    public AyahAudioResponse ayahAudio(int reciterId, int surahId, int ayahNumber) {
        Reciter reciter = reciterRepository.findById(reciterId)
                .orElseThrow(() -> ApiException.notFound("reciter not found"));
        ayahRepository.findBySurahIdAndAyahNumber(surahId, ayahNumber)
                .orElseThrow(() -> ApiException.notFound("ayah not found"));
        if (reciter.getAudioBaseUrl() == null || reciter.getAudioBaseUrl().isBlank()) {
            throw ApiException.notFound("no ayah audio for reciter " + reciterId);
        }
        return new AyahAudioResponse(reciterId, surahId, ayahNumber,
                audioUrlService.ayahAudioUrl(reciter.getAudioBaseUrl(), surahId, ayahNumber));
    }

    public SurahTimingsResponse surahTimings(int reciterId, int surahId) {
        Reciter reciter = reciterRepository.findById(reciterId)
                .orElseThrow(() -> ApiException.notFound("unknown reciter " + reciterId));
        return timingsService.load(reciter.getReciterKey(), surahId)
                .map(t -> new SurahTimingsResponse(reciterId, surahId, t))
                .orElseThrow(() -> ApiException.notFound("no ayah timings for reciter " + reciterId + " surah " + surahId));
    }

    public SurahAudioResponse surahAudio(int reciterId, int surahId) {
        Reciter reciter = reciterRepository.findById(reciterId)
                .orElseThrow(() -> ApiException.notFound("unknown reciter " + reciterId));
        Surah surah = surahRepository.findById(surahId)
                .orElseThrow(() -> ApiException.notFound("unknown surah " + surahId));
        if (reciter.getFullAudioBaseUrl() == null || reciter.getFullAudioBaseUrl().isBlank()) {
            throw ApiException.notFound("no full-surah audio for reciter " + reciterId);
        }
        return new SurahAudioResponse(reciterId, surahId, surah.getNameEn(),
                audioUrlService.surahAudioUrl(reciter.getFullAudioBaseUrl(), surahId), "mp3");
    }

    @Transactional
    public BookmarkResponse addBookmark(UUID userId, BookmarkRequest request) {
        ayahRepository.findById(request.ayahId())
                .orElseThrow(() -> ApiException.notFound("ayah not found"));
        Bookmark bookmark = bookmarkRepository.findByUserIdAndAyahId(userId, request.ayahId())
                .orElse(Bookmark.builder().userId(userId).ayahId(request.ayahId()).createdAt(Instant.now()).build());
        bookmark.setNote(request.note());
        Bookmark saved = bookmarkRepository.save(bookmark);
        return new BookmarkResponse(saved.getId(), saved.getAyahId(), saved.getNote(), saved.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<BookmarkResponse> bookmarks(UUID userId) {
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(b -> new BookmarkResponse(b.getId(), b.getAyahId(), b.getNote(), b.getCreatedAt())).toList();
    }

    @Transactional
    public void removeBookmark(UUID userId, UUID bookmarkId) {
        Bookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> ApiException.notFound("bookmark not found"));
        if (!bookmark.getUserId().equals(userId)) {
            throw ApiException.notFound("bookmark not found");
        }
        bookmarkRepository.delete(bookmark);
    }

    @Transactional
    public ReadingStateResponse updateReadingState(UUID userId, int lastAyahId) {
        ayahRepository.findById(lastAyahId).orElseThrow(() -> ApiException.notFound("ayah not found"));
        ReadingState state = readingStateRepository.findById(userId)
                .orElse(ReadingState.builder().userId(userId).build());
        state.setLastAyahId(lastAyahId);
        state.setLastReadAt(Instant.now());
        ReadingState saved = readingStateRepository.save(state);
        readingHistoryRepository.save(ReadingHistory.builder().userId(userId).ayahId(lastAyahId).readAt(Instant.now()).build());
        return new ReadingStateResponse(saved.getLastAyahId(), saved.getLastReadAt());
    }

    @Transactional(readOnly = true)
    public ReadingStateResponse readingState(UUID userId) {
        return readingStateRepository.findById(userId)
                .map(s -> new ReadingStateResponse(s.getLastAyahId(), s.getLastReadAt()))
                .orElseThrow(() -> ApiException.notFound("no reading state yet"));
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReadingHistoryResponse> history(UUID userId, int page, int size) {
        return PagedResponse.of(readingHistoryRepository.findByUserIdOrderByReadAtDesc(userId, PageRequest.of(page, Math.min(size, 50))),
                h -> new ReadingHistoryResponse(h.getAyahId(), h.getReadAt()));
    }

    private SurahResponse toSurahResponse(Surah s) {
        return new SurahResponse(s.getId(), s.getNameAr(), s.getNameEn(), s.getTransliteration(),
                s.getRevelationType(), s.getAyahCount(), s.getStartPage(), s.getStartJuz(),
                ArabicLabels.revelationType(s.getRevelationType()));
    }

    private AyahResponse toAyahResponse(Ayah a) {
        return new AyahResponse(a.getId(), a.getSurahId(), a.getAyahNumber(), a.getTextUthmani(),
                a.getTextSimple(), a.getPage(), a.getJuz(), a.getHizb());
    }
}
