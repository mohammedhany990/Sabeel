package com.sabeel.community.controller;

import com.sabeel.community.dto.BadgeResponse;
import com.sabeel.community.dto.ChallengeRequest;
import com.sabeel.community.dto.ChallengeResponse;
import com.sabeel.community.dto.CircleRequest;
import com.sabeel.community.dto.CircleResponse;
import com.sabeel.community.dto.JoinCircleRequest;
import com.sabeel.community.dto.MyChallengeResponse;
import com.sabeel.community.service.BadgeService;
import com.sabeel.community.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/community")
@RequiredArgsConstructor
public class CommunityController {
    private final CommunityService communityService;
    private final BadgeService badgeService;

    @GetMapping("/challenges")
    public List<ChallengeResponse> activeChallenges() {
        return communityService.activeChallenges().stream().map(c ->
                ChallengeResponse.of(c, 0)).toList();
    }

    @PostMapping("/challenges")
    @PreAuthorize("hasRole('ADMIN')")
    public ChallengeResponse createChallenge(@AuthenticationPrincipal String userId,
                                             @Valid @RequestBody ChallengeRequest request) {
        var challenge = communityService.createChallenge(UUID.fromString(userId), request.title(),
                request.description(), request.metric(), request.targetValue(),
                Instant.parse(request.startsAt()), Instant.parse(request.endsAt()));
        return ChallengeResponse.of(challenge, 0);
    }

    @PostMapping("/challenges/{id}/join")
    public MyChallengeResponse joinChallenge(@AuthenticationPrincipal String userId, @PathVariable UUID id) {
        return MyChallengeResponse.of(communityService.joinChallenge(UUID.fromString(userId), id));
    }

    @GetMapping("/challenges/me")
    public List<MyChallengeResponse> myChallenges(@AuthenticationPrincipal String userId) {
        return communityService.myChallenges(UUID.fromString(userId)).stream()
                .map(MyChallengeResponse::of).toList();
    }

    @PostMapping("/circles")
    public CircleResponse createCircle(@AuthenticationPrincipal String userId,
                                       @Valid @RequestBody CircleRequest request) {
        return CircleResponse.of(communityService.createCircle(UUID.fromString(userId), request.name(),
                request.description()));
    }

    @PostMapping("/circles/join")
    public CircleResponse joinCircle(@AuthenticationPrincipal String userId,
                                     @Valid @RequestBody JoinCircleRequest request) {
        return CircleResponse.of(communityService.joinCircle(UUID.fromString(userId), request.inviteCode()));
    }

    @GetMapping("/circles/me")
    public List<CircleResponse> myCircles(@AuthenticationPrincipal String userId) {
        return communityService.myCircles(UUID.fromString(userId)).stream().map(CircleResponse::of).toList();
    }

    @GetMapping("/circles/{id}/members")
    public List<Map<String, String>> members(@AuthenticationPrincipal String userId, @PathVariable UUID id) {
        return communityService.members(UUID.fromString(userId), id).stream().map(m -> Map.of(
                "userId", m.getUserId().toString(), "role", m.getRole().name(),
                "joinedAt", m.getJoinedAt().toString())).toList();
    }

    @GetMapping("/badges")
    public List<BadgeResponse> badges() {
        return badgeService.definitions().stream().map(BadgeResponse::definition).toList();
    }

    @GetMapping("/badges/me")
    public List<BadgeResponse> myBadges(@AuthenticationPrincipal String userId) {
        Map<String, String> titles = badgeService.definitions().stream().collect(
                Collectors.toMap(b -> b.getCode(), b -> b.getTitle()));
        return badgeService.myBadges(UUID.fromString(userId)).stream()
                .map(b -> BadgeResponse.earned(b, titles.getOrDefault(b.getBadgeCode(), b.getBadgeCode())))
                .toList();
    }
}
