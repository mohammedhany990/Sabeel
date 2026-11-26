package com.sabeel.revision.service;

import com.sabeel.revision.domain.RevisionItem;
import com.sabeel.revision.domain.RevisionStatus;
import com.sabeel.revision.event.OutboxService;
import com.sabeel.revision.repository.RevisionItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.sabeel.revision.config.KafkaConfig.TOPIC_REVISION_DUE;

@Component
@RequiredArgsConstructor
@Slf4j
public class DueNotificationJob {
    private final RevisionItemRepository itemRepository;
    private final OutboxService outboxService;

    @Scheduled(cron = "${revision.due-check-cron:0 30 1 * * *}")
    @Transactional
    public void publishDueRevisions() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        List<RevisionItem> due = itemRepository.findByNextRevisionDateLessThanEqualAndStatusNot(tomorrow, RevisionStatus.MASTERED);
        Map<String, List<RevisionItem>> byUser = due.stream()
                .collect(Collectors.groupingBy(i -> i.getUserId().toString()));
        String dueDate = LocalDate.now().toString();
        byUser.forEach((userId, items) -> outboxService.record(TOPIC_REVISION_DUE, userId, Map.of(
                "userId", userId,
                "date", dueDate,
                "itemCount", items.size(),
                "ranges", items.stream()
                        .map(i -> i.getSurahId() + ":" + i.getFromAyah() + "-" + i.getToAyah())
                        .toList())));
        due.forEach(i -> {
            i.setStatus(RevisionStatus.DUE);
            itemRepository.save(i);
        });
        log.info("published revision.due for {} users", byUser.size());
    }
}
