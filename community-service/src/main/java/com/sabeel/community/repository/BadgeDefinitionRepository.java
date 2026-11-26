package com.sabeel.community.repository;

import com.sabeel.community.domain.BadgeDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BadgeDefinitionRepository extends JpaRepository<BadgeDefinition, String> {
    List<BadgeDefinition> findByTriggerType(BadgeDefinition.Trigger triggerType);
}
