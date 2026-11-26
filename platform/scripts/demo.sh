#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
EMAIL="${EMAIL:-demo@sabeel.app}"
PASSWORD="${PASSWORD:-password123}"

echo "== 1. register =="
curl -s -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Demo User\"}" | jq .

echo "== 2. login =="
TOKENS=$(curl -s -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$TOKENS" | jq .
ACCESS=$(jq -r .accessToken <<<"$TOKENS")
AUTH="Authorization: Bearer $ACCESS"

echo "== 3. my profile (created from the Kafka event) =="
curl -s "$BASE/api/v1/users/me" -H "$AUTH" | jq .

echo "== 4. quran: list surahs and read Al-Fatihah =="
curl -s "$BASE/api/v1/quran/surahs" -H "$AUTH" | jq '.[0:3]'
curl -s "$BASE/api/v1/quran/ayahs/1/2" -H "$AUTH" | jq .

echo "== 5. reciter audio URL for Al-Fatihah 1 =="
curl -s "$BASE/api/v1/quran/reciters/1/audio?surah=1&ayah=1" -H "$AUTH" | jq .

echo "== 6. bookmark an ayah and save reading state =="
curl -s -X POST "$BASE/api/v1/quran/bookmarks" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"ayahId":2,"note":"rab al-alamin"}' | jq .
curl -s -X PUT "$BASE/api/v1/quran/reading-state" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"lastAyahId":7}' | jq .

echo "== 7. create a memorization plan (whole quran in 24 months) =="
PLAN=$(curl -s -X POST "$BASE/api/v1/memorization/plans" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"startingSurahId":1,"startingAyah":1,"targetSurahId":114,"targetDate":"2028-11-26"}')
echo "$PLAN" | jq .
PLAN_ID=$(jq -r .id <<<"$PLAN")

echo "== 8. today's tasks =="
TASKS=$(curl -s "$BASE/api/v1/memorization/tasks/today" -H "$AUTH")
echo "$TASKS" | jq .
TASK_ID=$(jq -r '.[0].id' <<<"$TASKS")

echo "== 9. complete the task with 92% accuracy =="
curl -s -X POST "$BASE/api/v1/memorization/tasks/$TASK_ID/complete" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"accuracy":92}' | jq .

echo "== 10. progress =="
curl -s "$BASE/api/v1/memorization/plans/$PLAN_ID/progress" -H "$AUTH" | jq .

echo "== 11. revision item appeared via Kafka (wait a few seconds first) =="
sleep 5
curl -s "$BASE/api/v1/revision/upcoming?days=7" -H "$AUTH" | jq .
curl -s "$BASE/api/v1/revision/stats" -H "$AUTH" | jq .

echo "== 12. notifications (task.created event consumed) =="
curl -s "$BASE/api/v1/notifications/me" -H "$AUTH" | jq '.[0:3]'

echo "== 13. prayer times, qibla, hijri =="
curl -s -X PUT "$BASE/api/v1/prayer/settings" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"latitude":30.0444,"longitude":31.2357,"method":"EGYPT","timezone":"Africa/Cairo","asrFactor":1}' | jq .
curl -s "$BASE/api/v1/prayer/times" -H "$AUTH" | jq .
curl -s "$BASE/api/v1/prayer/qibla?lat=30.0444&lng=31.2357" -H "$AUTH" | jq .
curl -s "$BASE/api/v1/prayer/hijri" -H "$AUTH" | jq .

echo "== 14. azkar checklist and progress =="
curl -s "$BASE/api/v1/azkar/today" -H "$AUTH" | jq '.[0] | {code, nameAr, completedItems, totalItems}'
FIRST_ITEM=$(curl -s "$BASE/api/v1/azkar/categories/MORNING/items" -H "$AUTH" | jq -r '.[0].id')
curl -s -X POST "$BASE/api/v1/azkar/items/$FIRST_ITEM/progress" -H "$AUTH" | jq .
curl -s "$BASE/api/v1/azkar/streaks" -H "$AUTH" | jq .

echo "== 15. full-surah audio =="
curl -s "$BASE/api/v1/quran/reciters/1/surahs/1/audio" -H "$AUTH" | jq .

echo "== 16. learning: teacher publishes a course =="
curl -s -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' \
  -d '{"email":"teacher@sabeel.dev","password":"P@ssw0rd!23","name":"Teacher One"}' > /dev/null
docker compose exec -T postgres psql -U "${POSTGRES_USER:-sabeel}" -d sabeel_auth -c \
  "UPDATE users SET role='TEACHER' WHERE email='teacher@sabeel.dev';" > /dev/null
TEACHER_TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"teacher@sabeel.dev","password":"P@ssw0rd!23"}' | jq -r '.accessToken')
TEACHER_AUTH="Authorization: Bearer $TEACHER_TOKEN"
COURSE_ID=$(curl -s -X POST "$BASE/api/v1/learning/courses" -H "$TEACHER_AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Tafsir Al-Fatiha","description":"A guided walkthrough","category":"TAFSIR"}' | jq -r '.id')
curl -s -X POST "$BASE/api/v1/learning/courses/$COURSE_ID/lessons" -H "$TEACHER_AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"The Opening","videoUrl":"https://videos.example/l1.mp4","durationSec":600,"sortOrder":1}' | jq '.lessons | length'
curl -s -X POST "$BASE/api/v1/learning/courses/$COURSE_ID/publish" -H "$TEACHER_AUTH" | jq '{slug, status}'
curl -s "$BASE/api/v1/learning/courses?category=TAFSIR" -H "$AUTH" | jq '.[0] | {title, ratingAvg}'

echo "== 17. learning: student enrolls and tracks progress =="
ENROLLMENT=$(curl -s -X POST "$BASE/api/v1/learning/enrollments/$COURSE_ID" -H "$AUTH")
echo "$ENROLLMENT" | jq .
LESSON_ID=$(curl -s "$BASE/api/v1/learning/courses/tafsir-al-fatiha" -H "$AUTH" | jq -r '.lessons[0].lessonId')
curl -s -X POST "$BASE/api/v1/learning/progress" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"enrollmentId\":\"$(echo "$ENROLLMENT" | jq -r '.id')\",\"lessonId\":\"$LESSON_ID\",\"watchedSeconds\":600}" | jq .
curl -s -X POST "$BASE/api/v1/learning/courses/$COURSE_ID/ratings" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"rating":5,"review":"excellent"}' | jq '{ratingAvg, ratingCount}'

echo "== 18. community: badges, circle, challenge =="
curl -s "$BASE/api/v1/community/badges" -H "$AUTH" | jq '.[0:3]'
curl -s -X POST "$BASE/api/v1/community/circles" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Fajr Circle","description":"morning hifz group"}' | jq '{name, inviteCode}'
curl -s "$BASE/api/v1/community/challenges/me" -H "$AUTH" | jq .

echo "== 19. recitation: evaluation job via async worker =="
EVAL=$(curl -s -X POST "$BASE/api/v1/recitation/evaluations" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"surahId":1,"fromAyah":1,"toAyah":4,"transcript":"بسم الله الرحمن الرحيم","expectedText":"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}')
echo "$EVAL" | jq '{id, status}'
sleep 6
curl -s "$BASE/api/v1/recitation/evaluations/$(echo "$EVAL" | jq -r '.id')" -H "$AUTH" | jq .

echo "demo finished"
