package com.sabeel.revision.repository;

import com.sabeel.revision.domain.RevisionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RevisionLogRepository extends JpaRepository<RevisionLog, UUID> {
}
