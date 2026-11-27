package com.sabeel.auth.repository;

import com.sabeel.auth.domain.RefreshToken;
import com.sabeel.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken t set t.revoked = true where t.user = :user and t.revoked = false")
    void revokeAllForUser(User user);

    @Modifying
    @Query("update RefreshToken t set t.revoked = true where t.user = :user and t.revoked = false and t.tokenHash <> :keepHash")
    void revokeAllForUserExcept(User user, String keepHash);
}
