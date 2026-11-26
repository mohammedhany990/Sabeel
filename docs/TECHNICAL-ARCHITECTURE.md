# Sabeel — Islamic Life Platform
## Technical Architecture Document

**Version:** 1.0 · **Date:** November 26, 2026 · **Companion to:** Sabeel Backend Project Specification v1

This document turns the Sabeel project specification into an implementation-ready plan: service boundaries, data ownership and schemas, API design, Kafka event contracts, infrastructure layout, and the build order. It is written to be handed to a developer or an AI coding agent so that implementation starts from decisions, not guesses.

---

## 1. Confirmed Technology Decisions

| Area | Decision | Notes |
|---|---|---|
| Language / framework | Java 17+ bytecode, Spring Boot 3.5.16, Spring Cloud 2025.0.3 | Spec requires Java 17+; bytecode targets 17, built and tested with a JDK 21 toolchain. Boot 3.5.x pairs with the Spring Cloud 2025.0.x train |
| Architecture | Microservices behind an API Gateway | Boundaries defined in §2 |
| Messaging | **Apache Kafka** (KRaft mode, no Zookeeper) | Chosen by the project owner; replaces the RabbitMQ option in the spec |
| Relational data | PostgreSQL 16, database-per-service | One Postgres server with separate databases in dev; separate instances in production |
| Document data | MongoDB 7 | Learning content (courses, lessons, articles) |
| Cache / ephemeral | Redis 7 | Caching, rate limiting, streak/session data, idempotency keys |
| Gateway | Spring Cloud Gateway (Spring Cloud 2025.0.3) | Routing, JWT validation, rate limiting, CORS |
| Auth | Spring Security + JWT (access + refresh), OAuth2 (Google optional) | §6 |
| Containerization | Docker + Docker Compose | §8 |
| API docs | springdoc-openapi (Swagger UI) per service, aggregated at the gateway | §9 |
| Build | Maven, one repository per service (or a monorepo with one Maven module per service — pick one and stay consistent) | §10 |
| Notifications | Firebase Cloud Messaging (push), SMTP (email) | Via Notification Service |
| Testing | JUnit 5, Mockito, Testcontainers, WireMock | §11 |

### Design stance: full boundaries, staged deployment
All service boundaries below are defined now, but they are **built and deployed in phases** (§10). Phase 1 ships five deployable services plus the gateway and infrastructure. Services that don't exist yet are represented by their Kafka topics and API contracts only, so later phases plug in without rework.

---

## 2. Service Boundaries

Each service owns its data exclusively. No service reads another service's database; cross-service reads go through APIs or Kafka events.

| # | Service | Bounded context | Owns | Database |
|---|---|---|---|---|
| 1 | `api-gateway` | Edge routing, auth filter, rate limiting | Routes, CORS, request throttling | Redis (rate limit) |
| 2 | `auth-service` | Identity: registration, login, tokens, password reset, email verification, OAuth | users, roles, tokens | `sabeel_auth` (Postgres) |
| 3 | `user-service` | Profile and preferences: country, timezone, preferred reciter, notification settings | profiles, preferences, device tokens | `sabeel_users` (Postgres) |
| 4 | `quran-service` | Quran reference data and reading experience: surahs, ayahs, juz/hizb/page mapping, search, bookmarks, favorites, reading history, reciters and audio metadata | quran text (seeded), reciters, bookmarks, reading state | `sabeel_quran` (Postgres) |
| 5 | `memorization-service` | Memorization plans and daily task generation | plans, daily tasks | `sabeel_memorization` (Postgres) |
| 6 | `revision-service` | Spaced-repetition engine: revision items, scheduling, accuracy tracking | revision items, revision logs | `sabeel_revision` (Postgres) |
| 7 | `prayer-service` | Prayer times, Hijri calendar, Qibla direction | user prayer settings, cached prayer times | `sabeel_prayer` (Postgres) + Redis cache |
| 8 | `azkar-service` | Azkar content, daily checklists, counters, streaks | azkar content (seeded), user logs, streaks | `sabeel_azkar` (Postgres) |
| 9 | `learning-service` | Courses, lessons, enrollment, progress, ratings | courses, lessons (content); enrollment, progress | MongoDB `sabeel_learning` + `sabeel_learning_tx` (Postgres) for enrollment/progress |
| 10 | `community-service` | Challenges, memorization circles, badges (Phase 3) | challenges, circles, badges | `sabeel_community` (Postgres) |
| 11 | `recitation-service` | Recitation evaluation: audio → text → comparison (Phase 3) | evaluation jobs, results | `sabeel_recitation` (Postgres) + object storage |
| 12 | `notification-service` | All outbound notifications: consumes events, templates, FCM push, email | notification log, templates, delivery state | `sabeel_notifications` (Postgres) |
| 13 | `media-service` | File upload/download, profile images, thumbnails, recitation audio | file metadata | `sabeel_media` (Postgres) + S3-compatible object storage |

**Why Quran text lives in Postgres:** Quran data is small (6,236 ayahs, a few MB), highly relational (surah ↔ ayah ↔ juz/hizb/page), and searched with full-text queries. Postgres `tsvector` with Arabic configuration handles search without a separate search engine at MVP scale.

**MongoDB is reserved for learning content** because course/lesson structures vary (video, article, quiz blocks) and evolve frequently.

---

## 3. Database Schemas

Field types are Postgres unless noted. Every table has `created_at timestamptz` and `updated_at timestamptz` even when not listed. All IDs are UUID.

### 3.1 auth-service — `sabeel_auth`

```sql
users (
  id uuid PK,
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(100) NOT NULL,      -- BCrypt
  name varchar(120) NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'USER', -- USER | TEACHER | ADMIN
  email_verified boolean NOT NULL DEFAULT false,
  oauth_provider varchar(20),               -- NULL | GOOGLE
  oauth_subject varchar(255),
  enabled boolean NOT NULL DEFAULT true
)

refresh_tokens (
  id uuid PK,
  user_id uuid FK -> users(id),
  token_hash varchar(100) NOT NULL,         -- store hash, never the raw token
  device_info varchar(255),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false
)

verification_tokens ( id uuid PK, user_id uuid FK, token_hash varchar(100),
                      type varchar(20),          -- EMAIL_VERIFY | PASSWORD_RESET
                      expires_at timestamptz, used boolean DEFAULT false )
```

### 3.2 user-service — `sabeel_users`

```sql
profiles (
  user_id uuid PK,                          -- same UUID as auth users.id
  name varchar(120), profile_image_url varchar(500),
  country varchar(2), timezone varchar(50) DEFAULT 'Africa/Cairo',
  preferred_reciter_id int
)

notification_preferences (
  user_id uuid PK, push_enabled boolean DEFAULT true, email_enabled boolean DEFAULT true,
  memorization_reminder_time time, revision_reminder_time time,
  prayer_reminders boolean DEFAULT true, azkar_reminders boolean DEFAULT true
)

device_tokens ( id uuid PK, user_id uuid FK, fcm_token varchar(500) UNIQUE,
                platform varchar(10), last_seen_at timestamptz )
```

The auth/user split: auth-service owns *credentials and identity*; user-service owns *everything a user can edit about themselves*. They share the user UUID; user-service creates its profile row on the `user.registered` event.

### 3.3 quran-service — `sabeel_quran`

```sql
surahs ( id smallint PK,                    -- 1..114
  name_ar varchar(100), name_en varchar(100), transliteration varchar(100),
  revelation_type varchar(10),              -- MAKKI | MADANI
  ayah_count smallint, start_page smallint, start_juz smallint )

ayahs ( id int PK,                          -- global ayah number 1..6236
  surah_id smallint FK, ayah_number smallint,
  text_uthmani text NOT NULL, text_simple text NOT NULL,
  page smallint, juz smallint, hizb smallint, rub_el_hizb smallint )
-- UNIQUE(surah_id, ayah_number); full-text index on text_simple (arabic config)

reciters ( id serial PK, name_ar varchar(120), name_en varchar(120),
           country varchar(60), audio_base_url varchar(500), style varchar(60) )

recitation_audios ( id serial PK, reciter_id int FK, surah_id smallint FK,
                    ayah_number smallint,     -- NULL = full-surah audio
                    audio_url varchar(500), duration_ms int )

bookmarks ( id uuid PK, user_id uuid, ayah_id int FK, note text, UNIQUE(user_id, ayah_id) )
favorites ( id uuid PK, user_id uuid, ayah_id int FK, UNIQUE(user_id, ayah_id) )

reading_history ( id uuid PK, user_id uuid, ayah_id int FK, read_at timestamptz )
reading_state  ( user_id uuid PK, last_ayah_id int, last_read_at timestamptz )
```

Quran seed data is loaded once from a verified source (Tanzil text or the quran.com API) at startup via a Flyway migration or an idempotent seeder. Audio URLs point at public recitation CDNs (e.g. everyayah.com / mp3quran patterns) per reciter; no audio files are stored by Sabeel in Phase 1–2.

### 3.4 memorization-service — `sabeel_memorization`

```sql
memorization_plans (
  id uuid PK, user_id uuid NOT NULL,
  starting_surah_id smallint NOT NULL, starting_ayah smallint DEFAULT 1,
  target_surah_id smallint NOT NULL DEFAULT 114,
  start_date date NOT NULL, target_date date NOT NULL,
  daily_ayah_target smallint NOT NULL,      -- computed at creation
  status varchar(20) DEFAULT 'ACTIVE',      -- ACTIVE | PAUSED | COMPLETED | CANCELLED
  current_surah_id smallint, current_ayah smallint )

daily_tasks (
  id uuid PK, plan_id uuid FK, user_id uuid NOT NULL,
  task_date date NOT NULL,
  surah_id smallint NOT NULL, from_ayah smallint NOT NULL, to_ayah smallint NOT NULL,
  task_type varchar(12) DEFAULT 'NEW',      -- NEW | CARRYOVER
  completed boolean DEFAULT false, completed_at timestamptz,
  UNIQUE(plan_id, task_date, task_type) )
```

**Plan generation algorithm** (runs at plan creation):

```
remaining_ayahs  = count of ayahs from (starting_surah, starting_ayah) to end of target_surah
days             = target_date - start_date
daily_ayah_target = ceil(remaining_ayahs / days)          -- e.g. 6236 / 730 = 9 per day
weekly_target    = daily_ayah_target * 7
```

Tasks are generated **lazily**: a nightly scheduled job (Spring `@Scheduled` or a cron-triggered internal endpoint) materializes tomorrow's task for every ACTIVE plan and publishes `memorization.task.created`. Lazy generation avoids inserting thousands of rows per plan and automatically adapts when a plan is paused. Uncompleted tasks become CARRYOVER tasks the next day.

### 3.5 revision-service — `sabeel_revision`

```sql
revision_items (
  id uuid PK, user_id uuid NOT NULL,
  surah_id smallint NOT NULL, from_ayah smallint NOT NULL, to_ayah smallint NOT NULL,
  memorized_at date NOT NULL,
  interval_days int NOT NULL DEFAULT 1,
  ease_factor numeric(3,2) NOT NULL DEFAULT 2.50,
  repetitions int NOT NULL DEFAULT 0,
  next_revision_date date NOT NULL,
  last_accuracy numeric(5,2),               -- 0..100
  difficulty varchar(10) DEFAULT 'NORMAL',  -- EASY | NORMAL | HARD
  status varchar(12) DEFAULT 'DUE' )        -- DUE | SCHEDULED | MASTERED

revision_logs ( id uuid PK, revision_item_id uuid FK, reviewed_at timestamptz,
                accuracy numeric(5,2), mistakes_count int, next_interval_days int )
```

**Spaced repetition engine** (SM-2 variant, matched to the spec's example):

- Base ladder: **1, 3, 7, 14, 30, 60 days** — the spec's exact example.
- After each review, record accuracy, then:
  - `accuracy >= 90` → advance one step on the ladder; after 60 days the item becomes MASTERED (long-term maintenance, re-surface every `interval_days × ease_factor`).
  - `70 <= accuracy < 90` → repeat the current step.
  - `accuracy < 70` → drop back two steps (minimum day 1) and set `difficulty = HARD`.
- `ease_factor` adjusts per review: `EF' = EF + (0.1 − (5 − q) × 0.08)` where `q = accuracy/20` (0..5), clamped to [1.3, 3.0]. Long-term intervals are `previous_interval × EF`.
- A nightly job selects items with `next_revision_date <= tomorrow`, publishes `revision.due` events, and flips them to DUE.
- A memorization task completion event (`memorization.task.completed`) is what creates the revision item — the engine learns about new memorized ranges from Kafka, not from an API call.

### 3.6 prayer-service — `sabeel_prayer`

```sql
prayer_settings ( user_id uuid PK, latitude numeric(9,6), longitude numeric(9,6),
  calculation_method varchar(30) DEFAULT 'EGYPTIAN',  -- EGYPTIAN | UMM_AL_QURA | MWL | ISNA | KARACHI
  asr_juristic varchar(10) DEFAULT 'SHAFI',           -- SHAFI | HANAFI
  notifications_enabled boolean DEFAULT true )

prayer_times_cache ( id bigint PK, latitude numeric(9,6), longitude numeric(9,6),
  calc_date date, method varchar(30),
  fajr time, sunrise time, dhuhr time, asr time, maghrib time, isha time,
  hijri_date varchar(20), UNIQUE(latitude, longitude, calc_date, method) )
```

Calculation is done in-process with a proven library/port of the PrayTimes algorithm (Adhan-style), cached per (location, date, method). Qibla bearing is computed with the great-circle formula — no external API dependency. Hijri date comes from the same calculation pass.

### 3.7 azkar-service — `sabeel_azkar`

```sql
azkar_categories ( id serial PK, code varchar(30) UNIQUE, -- MORNING | EVENING | AFTER_PRAYER | SLEEP
                   name_ar varchar(120), name_en varchar(120), sort_order smallint )
azkar_items ( id serial PK, category_id int FK, text_ar text, repeat_target smallint DEFAULT 1,
              source varchar(200), virtue text, sort_order smallint )

user_azkar_logs ( id uuid PK, user_id uuid, azkar_item_id int FK, log_date date,
                  progress smallint DEFAULT 0, completed boolean DEFAULT false,
                  UNIQUE(user_id, azkar_item_id, log_date) )
user_streaks ( user_id uuid PK, category_code varchar(30), current_streak int DEFAULT 0,
               longest_streak int DEFAULT 0, last_completed_date date )
```

Streak update: on completing the last item of a category for a date, if `last_completed_date = date - 1` increment, else reset to 1. Streak state also lives in Redis (`streak:{userId}:{category}`) for fast reads; Postgres remains the source of truth.

### 3.8 learning-service — MongoDB `sabeel_learning` + Postgres `sabeel_learning_tx`

```js
// MongoDB: courses
{ _id, title, slug, description, teacherId, category,      // TAFSIR | HADITH | FIQH | SEERAH | TAJWEED
  thumbnailUrl, status,                                    // DRAFT | PUBLISHED | ARCHIVED
  lessons: [ { lessonId, title, videoUrl, durationSec, description, sortOrder } ],
  ratingAvg, ratingCount, createdAt, updatedAt }
```

```sql
-- Postgres: enrollment & progress (transactional, belongs with user state)
enrollments ( id uuid PK, user_id uuid, course_id varchar(24), enrolled_at timestamptz,
              status varchar(15) DEFAULT 'ACTIVE', UNIQUE(user_id, course_id) )
lesson_progress ( id uuid PK, enrollment_id uuid FK, lesson_id varchar(24),
                  watched_seconds int DEFAULT 0, completed boolean DEFAULT false,
                  last_watched_at timestamptz )
ratings ( id uuid PK, user_id uuid, course_id varchar(24), rating smallint, review text,
          UNIQUE(user_id, course_id) )
```

### 3.9 notification-service — `sabeel_notifications`

```sql
notifications ( id uuid PK, user_id uuid NOT NULL, type varchar(40),
                title varchar(200), body text, data jsonb,
                channel varchar(10),              -- PUSH | EMAIL | BOTH
                status varchar(15) DEFAULT 'PENDING',  -- PENDING | SENT | FAILED
                scheduled_for timestamptz, sent_at timestamptz, error text )
notification_templates ( code varchar(50) PK, title_ar text, body_ar text,
                         title_en text, body_en text )
idempotency_keys ( key varchar(120) PK, created_at timestamptz )   -- also mirrored in Redis with TTL
```

### 3.10 media-service — `sabeel_media`

```sql
media_files ( id uuid PK, owner_user_id uuid, bucket varchar(60), object_key varchar(300),
              mime_type varchar(100), byte_size bigint, purpose varchar(30),  -- PROFILE_IMAGE | COURSE_THUMB | RECITATION_AUDIO
              created_at timestamptz )
```

Uploads flow: client requests a pre-signed PUT URL from media-service → uploads directly to object storage → client confirms; media-service validates size/type and marks the file ready.

---

## 4. API Design

All traffic enters through the gateway at `/api/v1/**`. Conventions:

- **Versioning:** path prefix `/api/v1`.
- **Errors:** RFC 7807 `application/problem+json` — `{ "type", "title", "status", "detail", "instance", "timestamp", "traceId" }`.
- **Pagination:** `?page=0&size=20&sort=field,asc`; responses wrap in `{ "content": [], "page": { "number", "size", "totalElements", "totalPages" } }`.
- **Auth:** `Authorization: Bearer <access-token>` on every non-public endpoint; the gateway validates the JWT and forwards `X-User-Id` / `X-User-Role` headers downstream.
- **Docs:** each service exposes `/v3/api-docs`; the gateway aggregates them into one Swagger UI.

### Representative endpoint map

**auth-service** — `POST /api/v1/auth/register` · `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password` · `GET /auth/verify-email?token=` · `GET /auth/oauth2/google`

**user-service** — `GET/PUT /api/v1/users/me` · `PUT /users/me/preferences` · `POST /users/me/device-tokens` · `DELETE /users/me/device-tokens/{id}`

**quran-service** — `GET /quran/surahs` · `GET /quran/surahs/{id}` · `GET /quran/ayahs/{surah}/{number}` · `GET /quran/pages/{page}` · `GET /quran/juz/{juz}` · `GET /quran/search?q=` · `GET /quran/reciters` · `GET /quran/reciters/{id}/surahs/{surahId}/audio` · `GET/POST/DELETE /quran/bookmarks` · `GET/POST /quran/reading-state`

**memorization-service** — `POST /memorization/plans` (returns computed daily/weekly targets) · `GET /memorization/plans/me` · `PATCH /memorization/plans/{id}` (pause/resume) · `GET /memorization/tasks/today` · `POST /memorization/tasks/{id}/complete` (body: accuracy %, mistakes) · `GET /memorization/progress` (surah-level rollup)

**revision-service** — `GET /revision/due` · `GET /revision/upcoming?days=7` · `POST /revision/items/{id}/review` (body: accuracy, mistakes → returns next interval) · `GET /revision/stats`

**prayer-service** — `GET /prayer/times?date=&lat=&lng=&method=` · `GET /prayer/times/month?year=&month=` · `GET /prayer/qibla?lat=&lng=` · `GET /prayer/hijri?date=` · `GET/PUT /prayer/settings`

**azkar-service** — `GET /azkar/categories` · `GET /azkar/categories/{code}/items` · `GET /azkar/today` (checklist with progress) · `POST /azkar/items/{id}/progress` (increment counter) · `GET /azkar/streaks`

**learning-service** — `GET /learning/courses?category=&q=` · `GET /learning/courses/{slug}` · `POST /learning/courses` (TEACHER) · `POST /learning/courses/{id}/lessons` (TEACHER) · `POST /learning/enrollments/{courseId}` · `GET /learning/my-courses` · `POST /learning/progress` (watched seconds) · `POST /learning/courses/{id}/ratings`

**notification-service** — internal + user-facing: `GET /notifications/me` · `POST /notifications/me/{id}/read` · send operations are event-driven only (§5).

**media-service** — `POST /media/upload-url` · `POST /media/{id}/confirm` · `GET /media/{id}`

**Admin (cross-service, role ADMIN):** user management, reciter management, content moderation endpoints live in each owning service under `/api/v1/admin/**`.

---

## 5. Kafka Event Architecture

### Topology

One Kafka cluster (3 brokers in production, 1 in dev). Topic naming: `<domain>.<entity>.<event>`. Keys are the aggregate ID (userId or planId) so per-user ordering holds. Payloads are JSON with an envelope:

```json
{
  "eventId": "uuid",           // for consumer idempotency
  "eventType": "memorization.task.created",
  "eventVersion": 1,
  "occurredAt": "2026-11-26T02:00:00Z",
  "payload": { "...": "..." }
}
```

### Core topics

| Topic | Producer | Consumers | Key payload |
|---|---|---|---|
| `auth.user.registered` | auth | user, notification | userId, email, name |
| `auth.password.reset-requested` | auth | notification | userId, email, resetToken |
| `memorization.task.created` | memorization (nightly job) | notification | userId, taskId, date, surahId, fromAyah, toAyah |
| `memorization.task.completed` | memorization | revision, notification | userId, taskId, surahId, fromAyah, toAyah, accuracy, completedAt |
| `memorization.plan.completed` | memorization | notification, community | userId, planId |
| `revision.due` | revision (nightly job) | notification | userId, itemCount, surahRanges |
| `revision.item.mastered` | revision | notification | userId, surahId, fromAyah, toAyah |
| `prayer.time.reminder` | prayer (hourly scheduler, per-user local date, deduped) | notification | userId, prayer, time, timezone |
| `azkar.reminder` | azkar (hourly scheduler, per-user local date, deduped) | notification | userId, categoryCode, date |
| `azkar.streak.milestone` | azkar | notification | userId, categoryCode, streakDays |
| `learning.course.published` | learning | notification | courseId, title, teacherId |
| `learning.enrollment.created` | learning | notification | userId, courseId |
| `recitation.evaluation.requested` | recitation | recitation (worker pool) | jobId, userId, surahId, fromAyah, toAyah, audioObjectKey |
| `recitation.evaluation.completed` | recitation | notification | jobId, userId, mistakeCount, accuracy |
| `<topic>.DLT` | any consumer (on poison) | ops alerting | original topic, payload, error |

### Messaging rules

1. **Outbox pattern** for every producer: state change and event are written in one DB transaction; a relay (a simple scheduled publisher over an `outbox_events` table) moves rows to Kafka. No dual writes. Failed publishes retry up to 10 times, then the row is marked dead and retained; dead rows are requeued hourly and can be replayed manually, so events are never silently discarded.
2. **Idempotent consumers:** consumers process first and record `eventId` in a Postgres `processed_events` table inside the same transaction; a failure rolls the marker back so redelivery retries, and duplicates are skipped.
3. **Retries and DLQ:** 3 retries with backoff inside the consumer; poison messages go to `<topic>.DLT` (Spring Kafka's default dead-letter suffix) with the original payload and error.
4. **Notification Service is the only FCM/SMTP client.** Every other service publishes intent; notification-service owns templates, user preferences lookup, scheduling (`scheduled_for`), and delivery.
5. **Scheduling lives in the domain services** (memorization, revision, prayer, azkar each compute *when*); notification-service only handles *delivery*.

Example flow (memorization reminder, replacing the spec's RabbitMQ diagram):

```
memorization-service (nightly job) → generates tomorrow's DailyTask
   → writes outbox row → Kafka: memorization.task.created
   → notification-service consumes → checks user preferences
   → schedules FCM push at user's memorization_reminder_time
   → mobile notification
```

---

## 6. Security Design

- **JWT access token** (15 min, RS256 — private key signs at auth-service, public key shared to all services via config) + **opaque refresh token** (30 days, hashed at rest, rotated on every use; reuse of a rotated token revokes the family).
- **Gateway enforcement:** a `JwtAuthGatewayFilter` validates signature/expiry on every request except the public whitelist (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`, quran reference reads, swagger). Downstream services trust only `X-User-Id` from the gateway and reject direct external calls (network policy / internal-only ports).
- **Authorization:** role checks at the controller (`@PreAuthorize("hasRole('TEACHER')")`); ownership checks in the service layer (a user sees only their own plans/tasks/logs).
- **Passwords:** BCrypt (strength 12).
- **Rate limiting:** Redis token-bucket at the gateway — e.g. 100 req/min per user, 10 req/min per IP on auth endpoints.
- **Validation:** Jakarta Bean Validation on every request DTO; never let entities cross the API boundary.
- **Secure upload:** pre-signed URLs only; media-service validates MIME type and size server-side after upload; executables rejected.
- **Secrets:** environment variables in dev (`.env` + Compose); a secrets manager in production. Nothing secret in Git.

---

## 7. Cross-Cutting Concerns

- **Service discovery:** not needed in dev (Compose networking with fixed service names). If the project later moves to Kubernetes, introduce Spring Cloud Kubernetes or plain DNS-based discovery rather than Eureka.
- **Centralized config:** per-service `application.yml` with Spring profiles (`dev`, `docker`, `prod`); shared values via Compose env file. Spring Cloud Config Server is optional and not required at this scale.
- **Observability:** Spring Actuator + Micrometer on every service; Prometheus scrape endpoints; Grafana dashboard in Phase 2. Structured JSON logs with a `traceId` propagated via Micrometer Tracing (OpenTelemetry) across REST and Kafka.
- **Resilience:** Resilience4j circuit breakers + timeouts on any synchronous cross-service call (keep these rare; prefer events).
- **Migrations:** Flyway per service, versioned per database. MongoDB uses Mongock.

---

## 8. Docker & Compose Layout

```yaml
# docker-compose.yml (dev) — service skeleton
services:
  postgres:        image: postgres:16    # init script creates one DB per service
  mongodb:         image: mongo:7
  redis:           image:redis:7
  kafka:           image: apache/kafka:3.8   # KRaft mode, single broker in dev
  kafka-ui:        image: provectuslabs/kafka-ui   # dev only
  mailhog:         image: mailhog/mailhog        # SMTP capture in dev
  minio:           image: minio/minio            # S3-compatible storage in dev

  api-gateway:            build: ./api-gateway            ports: ["8080:8080"]
  auth-service:           build: ./auth-service
  user-service:           build: ./user-service
  quran-service:          build: ./quran-service
  memorization-service:   build: ./memorization-service
  revision-service:       build: ./revision-service
  notification-service:   build: ./notification-service
  # phase-2/3 services join the same file as they are built
```

- Every backend service: multi-stage `Dockerfile` (eclipse-temurin:21-jdk build → temurin:21-jre runtime), `SPRING_PROFILES_ACTIVE=docker`, healthcheck on `/actuator/health`.
- Compose env via `.env` (DB passwords, JWT keys path, FCM credentials path, SMTP host).
- **Production notes (later, not Phase 1):** managed Postgres/Kafka/Redis, separate DB instances per service, 3-broker Kafka with replication factor 3, object storage on real S3, Kubernetes or a container platform for scaling, TLS termination at a load balancer in front of the gateway.

---

## 9. Implementation Order

### Phase 0 — Foundation (before any feature code)
1. Repository layout, Maven parent POM, shared `common` module (envelope DTOs, problem+json error handler, base exceptions — keep it tiny; no shared business logic).
2. `docker-compose.yml` with infrastructure only (postgres, mongo, redis, kafka, kafka-ui, mailhog, minio).
3. `api-gateway` with route table and JWT filter (stub auth at first).
4. `auth-service` complete: register/login/refresh/verify/reset + `auth.user.registered` event.
5. CI skeleton: build + unit tests on every push.

### Phase 1 — Core MVP (matches spec Phase 1)
1. `user-service` (profile from `auth.user.registered`).
2. `quran-service`: seed Quran + reciters, reading endpoints, bookmarks, reading state.
3. `notification-service` shell: templates, preferences, FCM + SMTP senders, idempotent consumer, DLQ.
4. `memorization-service`: plan creation with the target calculator, nightly task generation, completion API, outbox events.
5. `revision-service`: consumes `memorization.task.completed`, SM-2 engine, due-item API, `revision.due` events.
6. End-to-end: register → create plan → receive task → complete task → revision item scheduled → reminder push.

**Definition of done for Phase 1:** the six flows above run in `docker compose up` from a clean clone, with integration tests (Testcontainers) proving the Kafka chains.

### Phase 2 — Worship utilities (implemented)
1. `prayer-service` (solar-position calculation, 5 methods, settings, `prayer.time.reminder`). Implemented; computed on the fly instead of a cache table, which the math makes unnecessary at MVP scale.
2. `azkar-service` (content seed, checklist, counters, streaks, `azkar.reminder`). Implemented.
3. Quran audio endpoints in quran-service (per-ayah and per-surah reciter audio).
4. Observability stack (Prometheus + Grafana).

### Phase 3 — Learning, community, AI (implemented)
1. `learning-service` (courses/lessons MongoDB, enrollment/progress Postgres, ratings).
2. `community-service` (challenges, circles, badges).
3. `recitation-service`: media upload → `recitation.evaluation.requested` → ASR worker (Arabic speech-to-text) → text normalization (strip diacritics variance, normalize alef/taa marbuta forms) → alignment diff against the uthmani text → mistakes + accuracy back to the user. Evaluate ASR options (Whisper with Arabic fine-tune vs. a hosted Arabic ASR API) at build time; keep the service async-first so the choice is swappable.

Within every service, build in this order: entities & migrations → repositories → service layer with unit tests → DTOs & controllers → security rules → OpenAPI annotations → integration tests.

---

## 10. Per-Service Code Standards

Standard package layout (every service):

```
com.sabeel.<service>
├── config          -- security, kafka, openapi beans
├── controller      -- REST endpoints, thin
├── service         -- business logic, interfaces + impl
├── repository      -- Spring Data
├── domain / entity -- JPA entities
├── dto             -- request/response records (Java records)
├── mapper          -- MapStruct mappers
├── event           -- producers, consumers, payload records
├── exception       -- domain exceptions + @RestControllerAdvice
└── util
```

- DTOs are Java `record`s; entities never leave the service layer.
- Global `@RestControllerAdvice` maps domain exceptions to RFC 7807 responses.
- Tests: unit (JUnit 5 + Mockito) for services; `@WebMvcTest` for controllers; `@DataJpaTest` for repositories; Testcontainers (Postgres, MongoDB, Kafka) for integration tests of the event chains; WireMock for stubbing sibling services.
- OpenAPI: springdoc annotations on every controller; CI fails if the spec is stale.

---

## 11. External Data & Integrations

| Need | Source | Notes |
|---|---|---|
| Quran text (uthmani + simple) | Tanzil / quran.com API | Seed once; verify surah/ayah counts (114 / 6236) after seeding |
| Reciter audio | Public recitation CDNs (everyayah, mp3quran) | Stored as URLs per reciter; verify availability per reciter before publishing |
| Prayer times | In-process Adhan/PrayTimes algorithm port | No runtime external dependency; cache aggressively |
| Hijri calendar | Same calculation library | |
| Push | Firebase Cloud Messaging | Server key/credentials via env |
| Email | SMTP (Mailhog in dev, real provider in prod) | |
| ASR (Phase 3) | Pluggable `SpeechToTextEngine`; transcript passthrough ships as the dev default | Production ASR (Whisper Arabic fine-tune or hosted API) needs paid credentials; deliberately left unconfigured, owner decides |

## 12. Explicit Non-Goals for Now

- No Kubernetes in Phase 1–2 (Compose is the dev environment; K8s is a productionization step).
- No Eureka/Config Server unless deployment targets demand them.
- No event sourcing or CQRS framework; plain transactional services + outbox events.
- No real payment/subscription system (not in the spec).

---

*End of document. Next artifact after this one: the Phase 0/1 repository skeleton with docker-compose and auth-service implemented.*
