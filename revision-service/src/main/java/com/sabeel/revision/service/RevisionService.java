package com.sabeel.revision.service;

import com.sabeel.revision.domain.*;
import com.sabeel.revision.dto.*;
import com.sabeel.revision.engine.SpacedRepetitionEngine;
import com.sabeel.revision.event.OutboxService;
import com.sabeel.revision.exception.ApiException;
import com.sabeel.revision.repository.ProcessedEventRepository;
import com.sabeel.revision.repository.RevisionItemRepository;
import com.sabeel.revision.repository.RevisionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.sabeel.revision.config.KafkaConfig.TOPIC_ITEM_MASTERED;

@Service
@RequiredArgsConstructor
public class RevisionService {
    private final RevisionItemRepository itemRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final RevisionLogRepository logRepository;
    private final OutboxService outboxService;

    @Transactional
    public boolean processTaskCompleted(String eventId, UUID userId, int surahId, int fromAyah, int toAyah,
                                        double accuracy, java.time.LocalDate memorizedAt) {
        if (processedEventRepository.existsById(eventId)) {
            return false;
        }
        registerMemorizedRange(userId, surahId, fromAyah, toAyah, accuracy, memorizedAt);
        processedEventRepository.save(com.sabeel.revision.domain.ProcessedEvent.builder()
                .eventId(eventId).topic("memorization.task.completed").processedAt(java.time.Instant.now()).build());
        return true;
    }

    @Transactional
    public void registerMemorizedRange(UUID userId, int surahId, int fromAyah, int toAyah, double accuracy, LocalDate memorizedAt) {
        RevisionItem item = itemRepository.findByUserIdAndSurahIdAndFromAyahAndToAyah(userId, surahId, fromAyah, toAyah)
                .orElse(null);
        if (item != null) {
            applyReview(item, accuracy, 0, memorizedAt);
            return;
        }
        itemRepository.save(RevisionItem.builder()
                .userId(userId)
                .surahId(surahId)
                .fromAyah(fromAyah)
                .toAyah(toAyah)
                .memorizedAt(memorizedAt)
                .intervalDays(SpacedRepetitionEngine.LADDER[0])
                .easeFactor(2.5)
                .repetitions(0)
                .nextRevisionDate(memorizedAt.plusDays(SpacedRepetitionEngine.LADDER[0]))
                .lastAccuracy(accuracy)
                .difficulty(Difficulty.NORMAL)
                .status(RevisionStatus.SCHEDULED)
                .build());
    }

    @Transactional(readOnly = true)
    public List<RevisionItemResponse> due(UUID userId) {
        LocalDate today = LocalDate.now();
        return itemRepository.findByUserIdAndNextRevisionDateBetweenOrderByNextRevisionDate(userId, LocalDate.EPOCH, today)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RevisionItemResponse> upcoming(UUID userId, int days) {
        LocalDate today = LocalDate.now();
        return itemRepository.findByUserIdAndNextRevisionDateBetweenOrderByNextRevisionDate(userId, today.plusDays(1), today.plusDays(days))
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ReviewResponse review(UUID userId, UUID itemId, double accuracy, int mistakesCount) {
        RevisionItem item = itemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> ApiException.notFound("revision item not found"));
        SpacedRepetitionEngine.ReviewOutcome outcome = applyReview(item, accuracy, mistakesCount, LocalDate.now());
        if (outcome.mastered()) {
            outboxService.record(TOPIC_ITEM_MASTERED, userId.toString(), Map.of(
                    "userId", userId.toString(),
                    "surahId", item.getSurahId(),
                    "fromAyah", item.getFromAyah(),
                    "toAyah", item.getToAyah()));
        }
        return new ReviewResponse(item.getId(), outcome.intervalDays(), outcome.nextRevisionDate(),
                outcome.difficulty(), outcome.mastered());
    }

    @Transactional(readOnly = true)
    public RevisionStatsResponse stats(UUID userId) {
        long due = due(userId).size();
        long scheduled = itemRepository.countByUserIdAndStatus(userId, RevisionStatus.SCHEDULED);
        long mastered = itemRepository.countByUserIdAndStatus(userId, RevisionStatus.MASTERED);
        return new RevisionStatsResponse(due, scheduled, mastered);
    }

    private SpacedRepetitionEngine.ReviewOutcome applyReview(RevisionItem item, double accuracy, int mistakesCount, LocalDate reviewDate) {
        SpacedRepetitionEngine.ReviewOutcome outcome = SpacedRepetitionEngine.review(
                item.getIntervalDays(), item.getEaseFactor(), item.getRepetitions(), accuracy, reviewDate);
        item.setIntervalDays(outcome.intervalDays());
        item.setEaseFactor(outcome.easeFactor());
        item.setRepetitions(outcome.repetitions());
        item.setNextRevisionDate(outcome.nextRevisionDate());
        item.setLastAccuracy(accuracy);
        item.setDifficulty(Difficulty.valueOf(outcome.difficulty()));
        item.setStatus(outcome.mastered() ? RevisionStatus.MASTERED : RevisionStatus.SCHEDULED);
        itemRepository.save(item);
        logRepository.save(RevisionLog.builder()
                .item(item)
                .reviewedAt(Instant.now())
                .accuracy(accuracy)
                .mistakesCount(mistakesCount)
                .nextIntervalDays(outcome.intervalDays())
                .build());
        return outcome;
    }

    private RevisionItemResponse toResponse(RevisionItem i) {
        return new RevisionItemResponse(i.getId(), i.getSurahId(), i.getFromAyah(), i.getToAyah(),
                i.getNextRevisionDate(), i.getIntervalDays(), i.getLastAccuracy(),
                i.getDifficulty().name(), i.getStatus().name());
    }
}
