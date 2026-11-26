package com.sabeel.auth.repository;

import com.sabeel.auth.domain.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, UUID> {
    Optional<VerificationToken> findByTokenHashAndType(String tokenHash, VerificationToken.TokenType type);
}
