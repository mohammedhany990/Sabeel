---
title: "Sabeel - Islamic Life Platform"
subtitle: "Backend Project Documentation · Phases 1-3"
author: "Mohammed Hany"
date: "November 2026"
geometry: margin=2.2cm
fontsize: 11pt
colorlinks: true
toc: true
toc-depth: 2
---

# Introduction

Sabeel is a microservices backend for an Islamic lifestyle platform: Quran reading and listening, personalized memorization planning, smart spaced-repetition revision, prayer times with Qibla and Hijri calendar, daily azkar with streaks, online courses, community challenges and badges, recitation evaluation (local whisper.cpp ASR for real audio plus a transcript-comparison demo mode; it is text alignment, not tajweed assessment - see recitation-service), and event-driven notifications. This document covers Phases 1 through 3 as actually delivered: what is implemented, how it is built, how to run and test it, and the reasoning behind the design decisions.

The stack is Java (bytecode targets Java 17 per the spec; the build and tests ran on a JDK 21 toolchain), Spring Boot 3.5.16, Spring Cloud 2025.0.3 (the Spring Cloud train paired with Boot 3.5.x), Apache Kafka (KRaft), PostgreSQL 16, Redis 7, Docker and Docker Compose. Kafka was chosen over RabbitMQ deliberately (see Design Decisions).

# System Overview

```
                          +------------------+
   clients -------------> |    api-gateway   |  JWT validation, rate limiting, CORS
                          +---------+--------+
                                    |
   +---------+-------+------+-------+------+---------+-----------+---------+
   |         |       |      |              |         |           |         |
 auth-svc user-svc quran-svc memorization-svc revision-svc notification-svc prayer-svc azkar-svc
 (8081)   (8082)   (8083)      (8084)          (8085)        (8086)       (8087)    (8088)

 learning-svc (8089)   community-svc (8090)   recitation-svc (8091)
 MongoDB courses       sabeel_community       sabeel_recitation
 + sabeel_learning_tx  (badges/challenges/    (evaluation jobs)
                       circles)

   \_______________________________ Kafka (event bus) _______________________________/
                                        Redis (rate limit)
   Observability: Prometheus scrapes /actuator/prometheus on the 11 backend services; Grafana dashboards on top.
```

Every service owns its database exclusively. No service reads another service's tables; facts that cross a boundary travel as Kafka events.

# Services

## api-gateway (8080)

Single entry point. A global filter validates the JWT on every request except a public whitelist (register, login, refresh, password reset, email verification, public Quran reads, Swagger). Actuator management endpoints are neither whitelisted nor routed, and actuator exposure is limited to `health,info` and forwards the caller identity to downstream services as `X-User-Id` / `X-User-Role` headers. Redis-backed token-bucket rate limiting (default 20 req/s, burst 40) is keyed by user id, falling back to client IP.

## auth-service (8081)

Registration, login, logout, email verification, password reset, and token management.

- Access tokens: JWT (HS256), 15 minutes, claims `sub` (user id), `email`, `role` (USER / TEACHER / ADMIN).
- Refresh tokens: opaque random strings, stored only as SHA-256 hashes, 30-day expiry, **rotated on every use**. Presenting an already-rotated token is treated as theft: the entire session family for that user is revoked.
- Publishes `auth.user.registered` and `auth.password.reset-requested` to Kafka; the service never sends email itself.

## user-service (8082)

Profile (name, image, country, timezone, preferred reciter, preferred language), notification preferences, and FCM device tokens. The profile row is created automatically by consuming `auth.user.registered`, so registration never depends on two services being up at once. Registering a device token publishes `user.device-token.registered`.

## quran-service (8083)

Quran reference data and the personal reading experience: surah/ayah lookup, mushaf pages, juz, full-text search, five reciters with per-ayah audio URLs (pattern verified live against the public CDN), bookmarks, reading state and reading history.

Ships with the full 6236-ayah Tanzil Quran text (Uthmani and simple-clean) with surah, juz, hizb and page metadata from Tanzil, loaded on first start from bundled verbatim files that keep the Tanzil notice (license: Creative Commons Attribution 3.0; attribution and a tanzil.net link are required, and the text must not be changed). `QURAN_SEED_MODE=sample` loads a 27-ayah development sample instead. A database that holds only the sample is upgraded on the next start in full mode. The text should still be reviewed against a certified mushaf before public launch. Reciter audio URLs point at the public quranicaudio.com and everyayah.com hosts; audio is streamed and never rehosted, and its commercial-use rights are not established (see PRODUCTION-READINESS.md).

## memorization-service (8084)

The heart of the platform.

- Plan creation: user supplies starting surah/ayah, target surah and target date; the service computes the daily target (`ceil(remaining_ayahs / days)`; whole Quran in 24 months = 9 ayahs/day, 63/week).
- A nightly job materializes tomorrow's task per active plan and carries unfinished work forward as a CARRYOVER task.
- Completing a task advances the plan position, detects plan completion, and emits `memorization.task.completed` with the self-assessed accuracy.
- All outbound events go through a **transactional outbox**: the state change and the event row commit in one database transaction, and a relay publishes pending rows to Kafka every 5 seconds.

## revision-service (8085)

Spaced-repetition engine. It learns what to schedule purely from `memorization.task.completed` events — no direct coupling to the memorization service.

- Ladder: 1, 3, 7, 14, 30, 60 days.
- accuracy >= 90: advance one step; finishing the ladder marks the item MASTERED (long-term interval = 60 × ease factor).
- 70–89: repeat the current step.
- < 70: drop two steps, reset repetitions, mark HARD.
- Ease factor follows the SM-2 formula, clamped to [1.3, 3.0].
- A nightly job flips due items and publishes `revision.due` per user.

## notification-service (8086)

The only service that talks to email and push providers.

- Consumes every domain topic; each message is processed **idempotently** (a `processed_events` table keyed by event id), so at-least-once Kafka delivery is safe.
- Keeps local mirrors of user contact data and device tokens (event-carried state transfer) — it never calls user-service or auth-service synchronously.
- Reminders respect the user's preferences and preferred reminder time in the user's timezone, replicated through the `user.preferences.updated` event. The same event carries the `prayerReminders` and `azkarReminders` toggles: when one is off, matching reminder events are dropped instead of scheduled, and turning a toggle off immediately cancels that user's already-queued PENDING reminders of the matching type (they are marked CANCELLED, never delivered). Scheduling a reminder also deduplicates by natural key (user, type, scheduled instant): a republished event for the same slot replaces its queued copy instead of doubling it, and a `prayer.settings.updated` event cancels queued prayer reminders whenever the user changes location, method or timezone.
- A dispatcher sends PENDING notifications whose scheduled time has arrived. Email goes through SMTP (Mailhog in development); push uses the Firebase Admin SDK (FCM HTTP v1) and logs-only until `FCM_ENABLED=true` with a service-account JSON at `FCM_CREDENTIALS_PATH`.

## prayer-service (8087)

Prayer times, Qibla direction and the Hijri calendar, computed locally with no external API.

- Prayer times use the standard solar-position algorithm (sun declination and equation of time) with five calculation methods: MWL, ISNA, EGYPT (the default), MAKKAH (Isha = Maghrib + 90 min) and KARACHI; Asr supports standard (1) and Hanafi (2) shadow factors. Tested against known Cairo values.
- Qibla is the great-circle initial bearing to the Kaaba (21.4225, 39.8262).
- Hijri conversion uses the tabular (civil) Islamic calendar and says so in its response: it can differ by a day from local moon-sighting calendars.
- Users save location, method, timezone and Asr factor via `PUT /prayer/settings`. An hourly job computes, for each user, their *current local date* from their own timezone and publishes `prayer.time.reminder` per remaining prayer of that local date, so the push arrives at the prayer time itself. A `prayer_reminder_days` marker table (one row per user per local date) deduplicates the hourly runs, past prayers of a partially-finished day are skipped, and saving new settings clears the user's markers so the next run recomputes with the new values.
- Accuracy caveat: these are computed astronomical times (a PrayTimes-style solar algorithm), not an official timetable. They can differ by a few minutes from local religious authorities (for example Egypt's official survey authority), and users should verify against their local authority. High-latitude locations where the sun never reaches the required angle are a documented MVP limitation: no high-latitude adjustment method is implemented, and the API returns a clear `422 Unprocessable Entity` problem explaining this instead of a generic server error.
- Hijri caveat: conversion uses the tabular (civil) Islamic calendar - an arithmetic calendar that can differ by a day or two from official moon-sighting announcements.

## azkar-service (8088)

Seeded azkar content with daily checklists, counters and streaks.

- Four categories (morning, evening, after-prayer, sleep) seeded with authentic items, Arabic text, repeat targets and source references (Bukhari, Muslim, Abu Dawud, Tirmidhi, An-Nasa'i).
- `POST /azkar/items/{id}/progress` increments today's counter, capped at the item's repeat target.
- Completing every item of a category advances that category's streak (consecutive days only; a gap restarts at 1). Day 7, 30, 100 and 365 publish `azkar.streak.milestone`.
- All day boundaries are the user's local dates, never the server's: `GET /azkar/today`, category items and `POST /azkar/items/{id}/progress` accept an optional `?tz=<IANA timezone>` (falling back to the timezone replicated from the user's preferences, then UTC), and counters/streaks are keyed on that date. The service keeps a minimal `user_mirror` (user id + timezone) replicated through `auth.user.registered` and `user.preferences.updated` events.
- An hourly job publishes `azkar.reminder` (morning and evening) for users active in the last 30 days, computed against each user's own local date and deduplicated by an `azkar_reminder_days` marker table (one row per user, local date and category) so every local date is covered exactly once; notification-service schedules the push at 06:00 / 17:00 in the user's timezone.
- Content caveat: the seed is a starter set from well-known authentic collections with a source reference per item (Bukhari, Muslim, Abu Dawud, Tirmidhi, An-Nasa'i - the standard Hisn al-Muslim canon). It is not exhaustive; additional categories and items can be appended as data without code changes.

## learning-service (8089)

Online courses with lessons, enrollment, per-lesson progress and ratings.

- Courses and lessons live in MongoDB (`sabeel_learning`): a course is one document with its lessons embedded, because course/lesson structures vary and are always read together. Enrollments, lesson progress, ratings and the outbox live in PostgreSQL (`sabeel_learning_tx`), where the unique constraints and transactional outbox belong.
- Course lifecycle is DRAFT, PUBLISHED, ARCHIVED. Publishing requires at least one lesson and emits `learning.course.published`; only the owning teacher (role TEACHER) can add lessons or publish, enforced with `@PreAuthorize` plus an ownership check.
- Public catalog endpoints list published courses only, filterable by category (TAFSIR, HADITH, FIQH, SEERAH, TAJWEED) and title search, addressable by unique slug.
- Enrollment is idempotent (unique user+course) and emits `learning.enrollment.created` once; lesson progress accumulates watched seconds capped at the lesson duration and completes a lesson at 95% watched. Ratings are one per user per course and recompute the course average in the same transaction.

## community-service (8090)

Challenges, memorization circles and badges driven entirely by platform events.

- Consumes `memorization.task.completed`, `memorization.plan.completed` and `azkar.streak.milestone` with the same process-then-mark idempotency as every other consumer; each event moves a per-user stat counter (`user_stats`) and evaluates badge definitions.
- Six badge definitions are seeded at startup (first task, 10/100 tasks, first plan completed, 7/30-day streaks). Awarding a badge writes the user_badges row (unique user+badge) and emits `community.badge.awarded` through the outbox, so a badge can never be awarded twice and the notification is never lost.
- Challenges are time-windowed goals over the same three metrics, created by ADMIN. Joining is idempotent; event consumption advances joined, active, unfinished participants only and stamps `completedAt` when the target is met.
- Circles are small private memorization groups: the creator becomes OWNER automatically, and anyone with the 8-character invite code can join (idempotently). Member listing is restricted to members.

## recitation-service (8091)

Asynchronous recitation evaluation: audio (or a transcript in development) against the expected uthmani text, returning mistakes and an accuracy score.

- `POST /recitation/evaluations` creates a PENDING job and emits `recitation.evaluation.requested`; the service's own worker consumer (`recitation-service-worker` group) picks it up, runs the speech-to-text engine, aligns the transcript with the expected text, stores the result and emits `recitation.evaluation.completed`, which notification-service turns into a push with the score. Every evaluation response carries an `evaluationMode` field so no result can be mistaken for real audio analysis: `TRANSCRIPT_COMPARISON_DEMO` for the passthrough engine, `UNCONFIGURED_NO_ASR` when no engine is set (such jobs end FAILED with an explicit reason, never with a score).
- The speech-to-text engine is a pluggable `SpeechToTextEngine` interface. Three engine modes ship: the unconfigured default (jobs FAIL with an explicit reason, never a score), the transcript passthrough (a text-comparison demo, labeled `TRANSCRIPT_COMPARISON_DEMO` in every API response), and a real local ASR adapter (`RECITATION_ENGINE=whispercpp`, labeled `WHISPER_CPP_LOCAL_ASR`) that transcribes actual audio with whisper.cpp and a locally stored Whisper model - no external account, no paid service. The whisper adapter downloads the job's audio over http/https with SSRF guards (public hosts only; loopback, private, link-local and unresolvable hosts rejected at request time with a 400), caps downloads at 25 MB, probes duration of the downloaded file before conversion and rejects audio over 10 minutes (ffmpeg output is additionally capped at that duration), pins the validated public IPs for the actual connection (resolve-then-pin, so DNS cannot flip between validation and connect; TLS keeps the original hostname), and runs the model under a configurable process timeout (default 300 s) with child output drained concurrently with a hard 1 MB streaming cap that terminates the process on overflow and a per-job temp workspace that is always cleaned up. The whisper-enabled image builds from `recitation-service/Dockerfile.whisper`: it compiles whisper.cpp pinned to commit `868e55578ea5f69550c046da22aefe11dc6e04c0` and downloads the public `ggml-base.bin` model from HuggingFace at image build, verified against SHA-256 `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe`, so the ASR supply chain is immutable and reproducible. Limits, stated plainly: this is automated speech-to-text followed by word-level text alignment - it is NOT a tajweed assessment and carries no religious authority; Whisper's Arabic accuracy on recitation audio varies with reciter, recording quality and model size (`ggml-base` verified locally on two Al-Fatiha ayah recordings through the CLI, and once through the full recitation chain on a single clip, see Testing; larger models improve accuracy at higher cost). A hosted ASR API can still be added later behind the same interface if ever wanted.
- Arabic normalization before comparison strips harakat and other diacritics, tatweel and punctuation, and unifies alef variants (plain, hamza above/below, madda, wasla), taa marbuta to haa, alef maqsura to yaa, and hamza-on-waw/yaa to their base letters, so Tajweed-irrelevant orthographic variance never counts as a mistake.
- Alignment is a word-level Levenshtein edit script classified into SUBSTITUTION, OMISSION and ADDITION mistakes with positions; accuracy is `100 * (1 - edits / expected words)`. Both the normalizer and the aligner are pure functions with focused unit tests.
- The expected text travels with the request: the mobile client already holds the uthmani text of the range from quran-service, so the evaluation path avoids a synchronous cross-service call, in line with the event-first design.

# Data Design

One PostgreSQL server with eleven databases in development, plus one MongoDB database for the learning module (`db-init/01-create-databases.sql`); separate instances per service in production. Key tables:

| Database | Tables |
|---|---|
| sabeel_auth | users, refresh_tokens, verification_tokens, outbox_events |
| sabeel_users | profiles, notification_preferences, device_tokens, outbox_events |
| sabeel_quran | surahs, ayahs, reciters, bookmarks, reading_state, reading_history |
| sabeel_memorization | memorization_plans, daily_tasks, outbox_events |
| sabeel_revision | revision_items, revision_logs, outbox_events, processed_events |
| sabeel_notifications | notifications, processed_events, user_mirror, device_token_mirror |
| sabeel_prayer | prayer_settings, prayer_reminder_days, outbox_events |
| sabeel_azkar | azkar_categories, azkar_items, user_azkar_logs, azkar_streaks, user_mirror, azkar_reminder_days, processed_events, outbox_events |
| sabeel_learning (MongoDB) | courses (lessons embedded) |
| sabeel_learning_tx | enrollments, lesson_progress, ratings, outbox_events |
| sabeel_community | challenges, challenge_participants, circles, circle_members, badge_definitions, user_badges, user_stats, processed_events, outbox_events |
| sabeel_recitation | evaluation_jobs, processed_events, outbox_events |

Quran text lives in Postgres because it is small (a few MB), highly relational, and searched with simple indexed LIKE queries at MVP scale. MongoDB is reserved for the Phase 3 learning module, where course/lesson structures genuinely vary.

# API Summary

All traffic goes through the gateway at `http://localhost:8080/api/v1/**`. Errors use RFC 7807 `application/problem+json`, localised in English or Arabic from the `Accept-Language` header (see Languages). Each service exposes Swagger UI at `http://localhost:<port>/swagger-ui.html`.

| Area | Endpoints |
|---|---|
| auth | POST /auth/register, /auth/login, /auth/refresh, /auth/logout, /auth/forgot-password, /auth/reset-password, GET /auth/verify-email, GET /auth/me |
| users | GET/PUT /users/me (includes `preferredLanguage`), GET/PUT /users/me/preferences, POST/DELETE /users/me/device-tokens |
| quran | GET /quran/surahs, /quran/surahs/{id}, /quran/ayahs/{s}/{n}, /quran/pages/{p}, /quran/juz/{j}, /quran/search, /quran/reciters, /quran/reciters/{id}/audio + bookmarks and reading-state/history (authenticated) |
| memorization | POST /memorization/plans, GET /plans/me, PATCH /plans/{id}, GET /tasks/today, POST /tasks/{id}/complete, GET /plans/{id}/progress |
| revision | GET /revision/due, /revision/upcoming, POST /revision/items/{id}/review, GET /revision/stats |
| notifications | GET /notifications/me, POST /notifications/me/{id}/read |
| prayer | GET /prayer/times, /prayer/times/month, /prayer/qibla, /prayer/hijri, GET/PUT /prayer/settings |
| azkar | GET /azkar/categories, /azkar/categories/{code}/items, /azkar/today, /azkar/streaks, POST /azkar/items/{id}/progress (all day-boundary endpoints accept ?tz=IANA-timezone) |
| learning | GET /learning/courses, /learning/courses/{slug}, POST /learning/courses + /courses/{id}/lessons + /courses/{id}/publish (TEACHER), POST /learning/enrollments/{courseId}, GET /learning/my-courses, POST /learning/progress, POST /learning/courses/{id}/ratings |
| community | GET /community/challenges, POST /community/challenges (ADMIN), POST /community/challenges/{id}/join, GET /community/challenges/me, POST /community/circles, POST /community/circles/join, GET /community/circles/me, GET /community/circles/{id}/members, GET /community/badges, /community/badges/me |
| recitation | POST /recitation/evaluations, GET /recitation/evaluations, GET /recitation/evaluations/{id} |

# Kafka Events

Envelope: `{ eventId, eventType, eventVersion, occurredAt, payload }`. Topic keys are user or plan ids, preserving per-user ordering.

| Topic | Producer | Consumer | Effect |
|---|---|---|---|
| auth.user.registered | auth | user, notification, azkar | profile created; verification email; azkar user mirror baseline |
| auth.password.reset-requested | auth | notification | reset email |
| user.device-token.registered | user | notification | token mirror updated |
| user.preferences.updated | user | notification, azkar | reminder times, timezone, push/email toggles + prayer/azkar reminder toggles mirrored (notification cancels queued reminders of a disabled type); azkar user mirror timezone |
| memorization.task.created | memorization (nightly) | notification | push: today's task |
| memorization.task.completed | memorization | revision, notification, community | revision item scheduled; badge counters + challenge progress |
| memorization.plan.completed | memorization | notification, community | milestone push; badge counters + challenge progress |
| revision.due | revision (nightly) | notification | push: revision due, at the user's preferred revision reminder time |
| revision.item.mastered | revision | notification | milestone push |
| prayer.time.reminder | prayer (hourly, per-user local date, deduped) | notification | push at each prayer time (dropped when the user's prayerReminders toggle is off) |
| prayer.settings.updated | prayer | notification | queued prayer reminders cancelled so the recomputed schedule replaces them |
| azkar.reminder | azkar (hourly, per-user local date, deduped) | notification | push: morning/evening azkar (dropped when the user's azkarReminders toggle is off) |
| azkar.streak.milestone | azkar | notification, community | milestone push; streak badges + challenge progress |
| learning.course.published | learning | notification | push to teacher: course live |
| learning.enrollment.created | learning | notification | push: enrollment confirmation |
| recitation.evaluation.requested | recitation | recitation (worker group) | async evaluation execution |
| recitation.evaluation.completed | recitation | notification | push: accuracy score ready |
| community.badge.awarded | community | notification | push: badge earned |

# Languages: English and Arabic

The backend supports two languages, `en` (default) and `ar`, end to end. The Arabic text covers API error messages, notification content and the reference content that the services seed. Quran text, azkar text and surah names were already Arabic. Translations in this section were written for this project and have not been reviewed by a native-speaking editor or a religious scholar. The Arabic azkar meanings in particular are plain English renderings of Arabic source text, and the Arabic UI strings should be reviewed before any public release.

**Preferred language.** user-service stores `preferredLanguage` (`en` or `ar`) on the profile. `GET /users/me` returns it. `PUT /users/me` accepts it and rejects any other value with a 400. A profile created before this change reads as `en`. Registration accepts an optional `language` field, which seeds the profile through the `auth.user.registered` event.

**Events.** `auth.user.registered` and `user.preferences.updated` carry a `language` field. `user.preferences.updated` is now also published when the timezone or the language changes on the profile, not only when preferences change. Consumers treat a missing `language` as `en` (or as "keep the current value" for preference updates), so old events still work.

**API error messages.** Every service resolves the request language from the standard `Accept-Language` header. `ar`, `ar-EG`, `ar-SA` and similar all mean Arabic; anything else, or no header, means English. The `detail` and `title` of the RFC 7807 problem body are translated, and the response carries `Content-Language: ar` or `en`. Field-level validation messages come from Hibernate Validator in the same locale. The gateway's own 401 responses are localised the same way. A message with no Arabic translation falls back to English and never fails. The header always wins over the stored preference, so clients should send `Accept-Language` from their language switch.

**Notifications.** notification-service keeps the user's language in its user mirror, updated by the two events above. Every notification (email verification, password reset, memorization task, revision due, prayer and azkar reminders, streak milestones, achievements, course and enrollment messages, recitation result, badge awards) is rendered in that language when it is created, using templates for `en` and `ar`. The stored notification keeps its own `language`, and `GET /notifications/me` returns it. Memorization task notifications name the surah in the chosen language. Emails are sent as UTF-8.

**Reference content.**

| Area | Added |
|---|---|
| azkar | `textEn` (English meaning) and `referenceAr` (Arabic source name) on every item; categories already had `nameEn` and `nameAr` |
| community badges | `titleAr` and `descriptionAr` on definitions, `titleAr` on earned badges; the badge award event carries `titleAr` |
| prayer | `namesAr` and `hijriDateAr` on prayer times; `hijriAr`, `monthNameAr` and `noteAr` on the Hijri endpoint |
| quran | `revelationTypeAr` on surahs; `countryAr` and `styleAr` on reciters; surahs and reciters already had Arabic names |

Existing databases are upgraded on startup: Hibernate adds the new columns (`ddl-auto: update`; language columns default to `en`), and the azkar and badge seeders fill in missing translations for rows that already exist. User-created content (courses, challenges, circles) is stored as written and is not translated.

# Design Decisions

These are the decisions an interviewer is most likely to probe.

**Kafka over RabbitMQ.** The spec allowed either. Kafka was chosen for durable, replayable event logs (a new service can rebuild its state by replaying topics), per-key ordering, and horizontal consumer scaling with consumer groups. RabbitMQ is a better fit for work queues with complex routing; Sabeel's traffic is domain events, where Kafka's log model wins.

**Transactional outbox.** Writing to the database and then publishing to Kafka is a dual-write: a crash in between loses the event. Every producer in every service writes the event into an `outbox_events` table inside the same transaction as the state change; a relay publishes pending rows every few seconds and marks them sent. A failed publish is retried up to 10 times; a row that still fails is marked dead and **kept, not deleted** — dead rows are automatically requeued every hour, so a broker outage self-heals. To inspect dead rows: `SELECT * FROM outbox_events WHERE dead_at IS NOT NULL`. To replay manually without waiting for the hourly pass: `UPDATE outbox_events SET dead_at = NULL, attempts = 0 WHERE id = '<event-id>'` — the relay picks the row up within seconds and republishes it. No event is silently discarded; the honest cost is that a permanently poisoned payload resurfaces hourly until someone fixes it.

**Idempotent consumers with retry and DLQ.** The outbox makes delivery at-least-once, so consumers must tolerate duplicates. Consumers process first and record the `eventId` in `processed_events` inside the same transaction: if processing fails, the marker rolls back with everything else and the message is redelivered. A DefaultErrorHandler retries 3 times with backoff, then publishes the poison message to `<topic>.DLT` (Spring Kafka's default dead-letter suffix; the dev broker auto-creates those topics). revision-service deduplicates by event id as well, so a republished completion never advances the repetition ladder twice.

**Event-carried state transfer.** notification-service needs user emails and device tokens it does not own. Instead of calling user-service at send time (tight coupling, runtime dependency), it keeps local mirrors fed by events. The tradeoff is eventual consistency, which is fine for delivery data.

**Refresh token rotation with reuse detection.** Short-lived JWTs limit exposure; rotating refresh tokens mean a stolen token is detected the moment the real client uses its replacement — and the whole family is revoked. Registration always assigns role USER; elevated roles are never self-selected.

**Edge hardening.** The gateway strips inbound `X-User-Id`/`X-User-Role` headers before any other processing, so clients cannot spoof identity or bypass per-user rate limiting. Actuator exposure is limited to `health,info`. Every service also validates JWTs itself — but a caller who reaches a service port directly still bypasses the gateway's rate limiting and header sanitization. That is why Compose binds every non-gateway port (services, Postgres, Redis, Kafka, Mailhog, Kafka UI) to `127.0.0.1`; only the gateway (8080) is published. Keep that binding outside local development.

**HS256 now, RS256 later.** All services share one HMAC secret for JWT validation, which is simple and correct inside one trust domain. The documented upgrade is RS256, where only auth-service holds the private key and every other service verifies with the public key.

**Lazy task generation.** Plans do not insert hundreds of future task rows at creation. Tomorrow's task is materialized nightly, so pausing, resuming and carryover need no back-dated cleanup.

# Running the Project

The delivery is 13 ZIPs: one per service plus the platform bundle. Each service ZIP contains exactly one top-level directory; the platform ZIP contains `platform/`, `docs/`, `.github/` and the top-level `README.md`. Extract all of them into one empty directory and they assemble into the project tree with no nesting conflicts:

```bash
mkdir sabeel && cd sabeel
for z in /path/to/sabeel-*.zip; do unzip -q "$z"; done
```

Resulting layout:

```
sabeel/
  platform/                  docker-compose.yml, .env.example, db-init/,
                             scripts/demo.sh, scripts/smoke.sh,
                             prometheus/, grafana/
  docs/                      TECHNICAL-ARCHITECTURE.md
  .github/workflows/         integration-smoke.yml (CI: build + compose + smoke)
  README.md
  api-gateway/  auth-service/  user-service/  quran-service/
  memorization-service/  revision-service/  notification-service/
  prayer-service/  azkar-service/  learning-service/
  community-service/  recitation-service/
```

Then:

```bash
cd platform
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL (eleven databases created by `db-init`), MongoDB, Redis, Kafka, Kafka UI, Mailhog, Prometheus, Grafana, and all twelve services. Then run the demo:

```bash
./scripts/demo.sh
```

The demo walks the full loop through the gateway: register, login, profile (created via Kafka), read Quran, get a reciter audio URL, bookmark, create a 24-month plan, list today's task, complete it with 92% accuracy, watch the revision item appear via the `memorization.task.completed` event, and list the resulting notifications. Email output is visible in Mailhog at `http://localhost:8025`; topics and messages in Kafka UI at `http://localhost:8180`.

Prometheus scrapes all eleven backend services at `http://localhost:9090` (gateway excluded: its actuator stays at `health,info`), and Grafana at `http://localhost:3000` (admin/admin by default) comes pre-wired to it.

Continuous verification: `.github/workflows/integration-smoke.yml` builds all twelve services, runs `docker compose up -d --build`, then executes `platform/scripts/smoke.sh` — an assertion-based end-to-end suite (auth flow, header-stripping and actuator checks, profile-via-Kafka, Quran reads and both audio patterns, the memorization→revision event loop, prayer/qibla/hijri, azkar progress, the learning publish/enroll/progress loop, community badges and circles, the recitation evaluation worker flow, and Prometheus target health) that fails the pipeline on any mismatch. Status, honestly: the workflow is written and statically validated (YAML parsed, compose file parsed, script syntax-checked), but it has NOT been executed here — this environment has no Docker daemon. Its first run happens on GitHub Actions, which provides Docker.

Configuration needed for real delivery: a strong `JWT_SECRET`, an FCM service-account JSON (`FCM_ENABLED=true`, `FCM_CREDENTIALS_PATH`), and a real SMTP provider. The full 6236-ayah Tanzil text is bundled and loads by default (`QURAN_SEED_MODE=sample` selects the 27-ayah sample).

# Testing

**Status, stated plainly: every service compiles and its unit tests pass (`mvn package`, JDK 21 toolchain, bytecode targeting Java 17) — 230 tests, all green (126 before the English/Arabic work, plus 104 for it, all rerun together on 2026-11-26 on JDK 17). On 2026-11-26 a bounded live chain was executed without Docker: real PostgreSQL 16.4 (two databases), real Kafka 3.8.0 in KRaft mode, and the recitation-service and notification-service jars, all running as plain processes in a resource-constrained sandbox. A POST to `/api/v1/recitation/evaluations` with a hand-minted HS256 JWT (dev secret) returned a PENDING job; the Kafka `recitation.evaluation.requested` event was consumed by the worker, the passthrough engine compared the transcript to the expected text, and a follow-up GET showed the job COMPLETED with accuracy 100.0 and `evaluationMode: TRANSCRIPT_COMPARISON_DEMO` (the honest demo label). The worker's `recitation.evaluation.completed` event was then consumed by notification-service, which wrote a `RECITATION_RESULT` notification row (status SENT) to its own database. This verifies the recitation evaluation chain end to end - HTTP auth, persistence, Kafka produce/consume both directions, and cross-service notification - but it is the recitation chain subset with the passthrough engine, NOT the full twelve-service Docker Compose stack, which has still not been executed (no Docker daemon here; the CI smoke workflow remains the sanctioned full-stack path). Two distinct pieces of evidence, not to be conflated: (1) the whisper ASR adapter was verified at the CLI level on two real Al-Fatiha ayah recordings, and then through the application chain once (see next paragraph); (2) the application chain above ran the transcript passthrough demo engine, which exercises everything except ASR itself. Also note the notification row's SENT status means the local dispatch pipeline completed: in this run FCM was disabled, the test user had no device tokens and no user-mirror email, so no external push or email was actually delivered (the push sender logs and skips when disabled or tokenless).**

**Real-ASR chain run (2026-11-26, one clip).** with `RECITATION_ENGINE=whispercpp` (whisper.cpp pinned commit, `ggml-base.bin` verified against the pinned SHA-256) and the public audio URL `https://everyayah.com/data/Alafasy_128kbps/001001.mp3` (Al-Fatiha 1, the basmalah, expected text given as plain Arabic), the job went PENDING to COMPLETED with `evaluationMode: WHISPER_CPP_LOCAL_ASR`, accuracy 100.0 and no mistakes, in about 67 seconds on a 1-CPU sandbox with one whisper thread. This run exposed a real defect in the earlier release: the process runner merged the child's stderr into stdout, so whisper's model-load log numbers entered the transcript and the first run scored 0.0 with 91 false ADDITION mistakes. The fix discards stderr, and a regression test (`stderrIsNotMergedIntoStdout`) now guards it. The notification status for the real-ASR run was not confirmed. Limits: one clip, one reciter, plain-text expected text; this is not a tajweed assessment and not a broad accuracy benchmark, and the full twelve-service Compose stack remains unexecuted.

- gateway: spoofed `X-User-Id`/`X-User-Role` headers are stripped on public and protected paths; identity headers come only from a validated JWT; a tokenless protected request gets a 401.
- auth: JWT claim correctness and tamper rejection; outbox relay marks success, counts failures, marks a 10-times-failed event dead **without deleting it**, and the hourly requeue resets dead events for another round.
- quran: reciter audio URL pattern.
- memorization: plan calculator — ayah-count table sums to exactly 6236, 24-month plan yields 9 ayahs/day, range generation stays inside a surah, plan position advances across surah boundaries.
- revision: every branch of the repetition ladder, ease-factor clamping, mastery detection; a duplicate `memorization.task.completed` event id is skipped without touching the ladder.
- user: the `user.preferences.updated` event payload carries the prayer/azkar reminder toggles, both when flipped off and when left on.
- notification: template rendering, reminder scheduling across timezones with fallbacks, and process-then-mark ordering — failed work leaves no processed marker, so Kafka redelivery retries it. Preference toggles propagate to the mirror, disabling prayer/azkar reminders cancels that user's already-queued reminders of that type, and the enabled checks default to true for users without a mirror row yet. Natural-key dedup: a republished reminder for the same (user, type, scheduled instant) replaces the queued copy; reminders at other times are untouched.
- prayer: Cairo prayer times land in known windows and stay ordered, MAKKAH's Isha interval, Hanafi vs standard Asr, Qibla bearings from Cairo and Jakarta, Hijri-Gregorian round-trips and a Ramadan anchor date. Timezone-boundary regression coverage: a New York user at 00:45 UTC is scheduled only the still-future prayers of their previous local day and gets the full new day once their local date rolls over, an already-scheduled (user, local date) pair is never duplicated, and saving new settings clears the markers and publishes `prayer.settings.updated` so queued reminders are recomputed. A high-latitude date returns a 422 problem, not a server error.
- azkar: counter increments and caps at the repeat target, streak start/continuation/reset rules, the day-7 milestone event, no double-counting on same-day recompletion, and progress logged on the caller's explicit local date. Timezone resolution (explicit `?tz=` param, mirrored preference timezone, UTC fallback, invalid zone rejected) and reminder-job per-user local dates with dedup markers are covered.
- learning: slug uniqueness suffixing, publish rules (needs a lesson, draft-only, owner-only), enrollment idempotency with exactly one enrollment event, 95% lesson completion threshold with duration capping, rating average recomputation and the enrollment-required rule.
- community: badge award at threshold, no double award, below-threshold no-op, streak keeps the best value, challenge progress advances only joined active unfinished participants and stamps completion, completed challenges never advance again; join idempotency for challenges and circles, expired-challenge rejection, backwards-window rejection, owner auto-membership, unknown invite codes, member-only member listing.
- recitation: normalization (harakat, tatweel, alef variants, taa marbuta, alef maqsura, punctuation), alignment scoring (perfect match, substitution, omission, addition, empty inputs), job lifecycle (pending to completed with event, engine failure marks FAILED with the reason and never emits a score, completed jobs never re-execute), and owner-only reads.

- languages: every service has an `ErrorMessagesTest` (English passthrough, Arabic locale variants, parameterised messages, English fallback, handler output with `Content-Language`, and a source scan asserting that every literal `ApiException` message has an Arabic translation). user-service also has HTTP-level tests with MockMvc proving `Accept-Language: ar` yields an Arabic problem body with Arabic field messages and that no or unsupported headers yield English, plus profile language update/publish rules. auth-service tests the registration event language and validation. notification-service tests every template in both languages, language selection per user, and language updates from events. The gateway tests localised 401 bodies. azkar, community, prayer and quran have tests for the added translations and the startup backfill. Not covered by tests: the Arabic wording itself (no native-speaker review), and any run against a real database, Kafka or the Compose stack.

# Roadmap

This delivery implements the Phase 1 MVP; the Phase 2 worship utilities (prayer-service, azkar-service, full-surah Quran audio, Prometheus + Grafana, CI smoke workflow); and from Phase 3, learning-service (courses in MongoDB with enrollment, progress and ratings in PostgreSQL), community-service (event-driven badges, challenges and circles) and recitation-service's asynchronous evaluation pipeline.

Recitation evaluation runs on a local whisper.cpp adapter (real audio, no external account or paid service) with a labeled transcript-comparison demo mode for development; accuracy varies with reciter and recording quality, it is text alignment and not a tajweed judgment, and a hosted ASR API remains an optional future adapter behind the same interface. Still unimplemented from the wider design: media-service (recitation object-key storage), admin tooling, and any production deployment.


## Web app notes and licensing

- The web app now includes: tafsir and translation panels (QuranEnc editions served by the backend), a sticky reader player, Husary and Minshawi teaching reciters streamed from everyayah.com, share ayah (text or image), a tajweed mushaf view (Quran Foundation API, fetched at runtime, internet needed for each page the first time), adhan by Nasr al-Din Tobar and a 15-minute prayer reminder, prayer tracker with qada and qiyam, tasbih, duas, Asma ul-Husna, Hijri calendar with fasting tracker, an approximate zakat calculator, prophet stories with a quiz, and an installable PWA.
- Removed: the recitation check page in the web app (the recitation-service and its API remain), the bundled Saheeh International translation, and the bundled Madinah, Al-Aqsa and Alafasy adhan recordings, because their licenses do not allow redistribution of modified copies or are unclear.
- Hijri dates are an arithmetic approximation; verify with local moon-sighting. The zakat calculator is approximate guidance, not a fatwa.
- Audio of the teaching reciters streams from a public host and is not copied by this project; check that host's terms before building a product on it.
