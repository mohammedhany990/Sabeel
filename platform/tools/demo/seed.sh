#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
PW='P@ssw0rd!23'
J='Content-Type: application/json'
login() { curl -s -X POST "$BASE/api/v1/auth/login" -H "$J" -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | jq -r '.accessToken'; }
for who in "demo-teacher@sabeel.dev:TEACHER:Demo Teacher" "demo-admin@sabeel.dev:ADMIN:Demo Admin"; do
  email="${who%%:*}"; rest="${who#*:}"; role="${rest%%:*}"; name="${rest#*:}"
  curl -s -X POST "$BASE/api/v1/auth/register" -H "$J" -d "{\"email\":\"$email\",\"password\":\"$PW\",\"name\":\"$name\"}" > /dev/null
  sleep 1
  docker compose exec -T postgres psql -U "${POSTGRES_USER:-sabeel}" -d sabeel_auth -c "UPDATE users SET role='$role' WHERE email='$email';" > /dev/null
done
TEACHER="Authorization: Bearer $(login demo-teacher@sabeel.dev)"
ADMIN="Authorization: Bearer $(login demo-admin@sabeel.dev)"
COURSE=$(curl -s -X POST "$BASE/api/v1/learning/courses" -H "$TEACHER" -H "$J" -d '{"title":"Tajweed Basics","description":"A short introduction.","category":"TAJWEED"}' | jq -r '.id')
curl -s -X POST "$BASE/api/v1/learning/courses/$COURSE/lessons" -H "$TEACHER" -H "$J" -d '{"title":"Lesson 1","videoUrl":"https://videos.example/l1.mp4","durationSec":600,"sortOrder":1}' > /dev/null
curl -s -X POST "$BASE/api/v1/learning/courses/$COURSE/publish" -H "$TEACHER" | jq -r '.status'
START=$(date -u +%Y-%m-%dT00:00:00Z)
END=$(date -u -d '+30 days' +%Y-%m-%dT00:00:00Z)
curl -s -X POST "$BASE/api/v1/community/challenges" -H "$ADMIN" -H "$J" -d "{\"title\":\"Ten tasks challenge\",\"description\":\"Complete ten memorization tasks.\",\"metric\":\"MEMORIZATION_TASKS\",\"targetValue\":10,\"startsAt\":\"$START\",\"endsAt\":\"$END\"}" | jq -r '.title'
