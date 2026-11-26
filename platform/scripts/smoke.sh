#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://localhost:8080}"
EMAIL="${EMAIL:-smoke@sabeel.app}"
PASSWORD="${PASSWORD:-password123}"
FAILED=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $name"
  else
    echo "FAIL  $name (expected [$expected], got [$actual])"
    FAILED=1
  fi
}

wait_http() {
  local url="$1" tries="${2:-60}"
  for _ in $(seq "$tries"); do
    if curl -sf -o /dev/null "$url"; then return 0; fi
    sleep 2
  done
  echo "TIMEOUT waiting for $url, last response:"
  curl -si --max-time 5 "$url" | head -c 600 || true
  echo
  return 1
}

echo "== waiting for the gateway and services =="
wait_http "$BASE/actuator/health" 90
for port in 8081 8082 8083 8084 8085 8086 8087 8088 8089 8090 8091; do
  wait_http "http://localhost:$port/actuator/health" 90 || FAILED=1
done

echo "== auth =="
curl -s -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}" > /dev/null || true
TOKENS=$(curl -s -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
ACCESS=$(jq -r '.accessToken // empty' <<<"$TOKENS")
check "login returns an access token" "yes" "$([ -n "$ACCESS" ] && echo yes || echo no)"
AUTH="Authorization: Bearer $ACCESS"

check "gateway strips spoofed identity header" "401" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/v1/users/me" -H 'X-User-Id: fake')"
check "gateway actuator management is not exposed" "404" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/actuator/gateway/routes")"

echo "== profile via kafka =="
for _ in $(seq 90); do
  NAME=$(curl -s "$BASE/api/v1/users/me" -H "$AUTH" | jq -r '.name // empty')
  [ -n "$NAME" ] && break
  sleep 2
done
check "profile created from auth.user.registered event" "Smoke Test" "$NAME"

echo "== quran =="
check "list surahs" "Al-Faatiha" "$(curl -s "$BASE/api/v1/quran/surahs" -H "$AUTH" | jq -r '.[0].nameEn')"
check "read ayah 1:1" "1" "$(curl -s "$BASE/api/v1/quran/ayahs/1/1" -H "$AUTH" | jq -r '.ayahNumber')"
check "editions list has 5 sources" "5" "$(curl -s "$BASE/api/v1/quran/editions" | jq -r 'length')"
check "muyassar tafsir for 2:255 is Arabic text" "true" "$(curl -s "$BASE/api/v1/quran/editions/arabic_moyassar/2/255" | jq -r '.entries[0].text | test("[\u0600-\u06FF]")')"
check "english translation version" "1.0.21" "$(curl -s "$BASE/api/v1/quran/editions/english_rwwad/1/2" | jq -r '.edition.version')"
check "per-ayah audio url" "https://everyayah.com/data/Alafasy_128kbps/001001.mp3" \
  "$(curl -s "$BASE/api/v1/quran/reciters/1/audio?surah=1&ayah=1" -H "$AUTH" | jq -r '.audioUrl')"
check "full-surah audio url" "https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/001.mp3" \
  "$(curl -s "$BASE/api/v1/quran/reciters/1/surahs/1/audio" -H "$AUTH" | jq -r '.url')"

echo "== memorization + revision loop =="
PLAN=$(curl -s -X POST "$BASE/api/v1/memorization/plans" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"startingSurahId":1,"startingAyah":1,"targetSurahId":114,"targetDate":"2028-11-26"}')
PLAN_ID=$(jq -r '.id // empty' <<<"$PLAN")
check "plan created" "yes" "$([ -n "$PLAN_ID" ] && echo yes || echo no)"
for _ in $(seq 10); do
  TASK_ID=$(curl -s "$BASE/api/v1/memorization/tasks/today" -H "$AUTH" | jq -r '.[0].id // empty')
  [ -n "$TASK_ID" ] && break
  sleep 2
done
check "today task generated" "yes" "$([ -n "$TASK_ID" ] && echo yes || echo no)"
curl -s -X POST "$BASE/api/v1/memorization/tasks/$TASK_ID/complete" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"accuracy":92}' > /dev/null
REVISION_COUNT=0
for _ in $(seq 90); do
  REVISION_COUNT=$(curl -s "$BASE/api/v1/revision/upcoming?days=7" -H "$AUTH" | jq '[.[] | select(.surahId==1)] | length' 2>/dev/null || echo 0)
  [ "$REVISION_COUNT" = "1" ] && break
  sleep 2
done
check "revision item created from task.completed event" "1" "$REVISION_COUNT"

echo "== prayer =="
curl -s -X PUT "$BASE/api/v1/prayer/settings" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"latitude":30.0444,"longitude":31.2357,"method":"EGYPT","timezone":"Africa/Cairo","asrFactor":1}' > /dev/null
check "prayer times for Cairo" "true" \
  "$(curl -s "$BASE/api/v1/prayer/times" -H "$AUTH" | jq '.times | has("fajr") and has("maghrib")')"
check "qibla bearing from Cairo" "true" \
  "$(curl -s "$BASE/api/v1/prayer/qibla?lat=30.0444&lng=31.2357" -H "$AUTH" | jq '.bearingDegrees > 130 and .bearingDegrees < 142')"
check "hijri conversion" "true" \
  "$(curl -s "$BASE/api/v1/prayer/hijri?date=2026-11-26" -H "$AUTH" | jq '.hijriYear >= 1447 and .hijriYear <= 1448')"

TODAY=$(TZ=Africa/Cairo date +%F)
curl -s -X PUT "$BASE/api/v1/prayer/log" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"date\":\"$TODAY\",\"prayer\":\"FAJR\",\"prayed\":true}" > /dev/null
check "prayer tracker records fajr" "1" \
  "$(curl -s "$BASE/api/v1/prayer/log?from=$TODAY&to=$TODAY" -H "$AUTH" | jq -r '.prayedInRange')"
check "tracker rejects sunrise" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$BASE/api/v1/prayer/log" -H "$AUTH" -H 'Content-Type: application/json' -d "{\"date\":\"$TODAY\",\"prayer\":\"SUNRISE\",\"prayed\":true}")"
check "adhan catalog endpoint answers with a list" "array" \
  "$(curl -s "$BASE/api/v1/prayer/adhans" -H "$AUTH" | jq -r 'type')"

echo "== azkar =="
check "azkar categories seeded" "MORNING" \
  "$(curl -s "$BASE/api/v1/azkar/categories" -H "$AUTH" | jq -r '.[0].code')"
ITEM_ID=$(curl -s "$BASE/api/v1/azkar/categories/MORNING/items" -H "$AUTH" | jq -r '.[0].id')
check "azkar progress increments" "1" \
  "$(curl -s -X POST "$BASE/api/v1/azkar/items/$ITEM_ID/progress" -H "$AUTH" | jq -r '.count')"

curl -s -X POST "$BASE/api/v1/azkar/tasbeeh" -H "$AUTH" -H 'Content-Type: application/json' -d '{"phrase":"SUBHANALLAH","count":33}' > /dev/null
check "tasbeeh total after saving 33" "33" \
  "$(curl -s "$BASE/api/v1/azkar/tasbeeh" -H "$AUTH" | jq -r '.today.SUBHANALLAH')"
check "tasbeeh rejects an unknown phrase" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/azkar/tasbeeh" -H "$AUTH" -H 'Content-Type: application/json' -d '{"phrase":"NOPE","count":1}')"

echo "== daily ayah and edition search =="
check "daily ayah has text" "true" \
  "$(curl -s "$BASE/api/v1/quran/daily" -H "$AUTH" | jq -r '.ayah.textUthmani | length > 0')"
check "daily ayah is stable for a date" "true" \
  "$(A=$(curl -s "$BASE/api/v1/quran/daily?date=2026-03-01" -H "$AUTH" | jq -r '.ayah.id'); B=$(curl -s "$BASE/api/v1/quran/daily?date=2026-03-01" -H "$AUTH" | jq -r '.ayah.id'); [ "$A" = "$B" ] && echo true || echo false)"
check "edition search finds a tafsir hit" "true" \
  "$(curl -s -G "$BASE/api/v1/quran/editions/english_rwwad/search" --data-urlencode 'q=merciful' --data-urlencode 'limit=5' | jq -r 'length > 0')"
check "edition search rejects short text" "400" \
  "$(curl -s -o /dev/null -w '%{http_code}' -G "$BASE/api/v1/quran/editions/english_rwwad/search" --data-urlencode 'q=ab')"

echo "== khatma =="
check "khatma starts with a daily target" "21" \
  "$(curl -s -X POST "$BASE/api/v1/quran/khatma" -H "$AUTH" -H 'Content-Type: application/json' -d '{"days":30}' | jq -r '.pagesPerDay')"
check "khatma progress is stored" "100" \
  "$(curl -s -X PUT "$BASE/api/v1/quran/khatma/progress" -H "$AUTH" -H 'Content-Type: application/json' -d '{"page":100}' | jq -r '.currentPage')"
check "second khatma is rejected" "409" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/v1/quran/khatma" -H "$AUTH" -H 'Content-Type: application/json' -d '{"days":10}')"

echo "== learning =="
TEACHER_TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"teacher@sabeel.dev","password":"P@ssw0rd!23"}' | jq -r '.accessToken')
if [[ "$TEACHER_TOKEN" == "null" ]]; then
  curl -s -X POST "$BASE/api/v1/auth/register" -H 'Content-Type: application/json' \
    -d '{"email":"teacher@sabeel.dev","password":"P@ssw0rd!23","name":"Teacher One"}' > /dev/null
fi
docker compose exec -T postgres psql -U "${POSTGRES_USER:-sabeel}" -d sabeel_auth -c \
  "UPDATE users SET role='TEACHER' WHERE email='teacher@sabeel.dev' AND role<>'TEACHER';" > /dev/null
TEACHER_TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"teacher@sabeel.dev","password":"P@ssw0rd!23"}' | jq -r '.accessToken')
TEACHER_AUTH="Authorization: Bearer $TEACHER_TOKEN"
COURSE_ID=$(curl -s -X POST "$BASE/api/v1/learning/courses" -H "$TEACHER_AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Tafsir Al-Fatiha","description":"intro","category":"TAFSIR"}' | jq -r '.id')
curl -s -X POST "$BASE/api/v1/learning/courses/$COURSE_ID/lessons" -H "$TEACHER_AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Lesson 1","videoUrl":"https://videos.example/l1.mp4","durationSec":600,"sortOrder":1}' > /dev/null
check "teacher publishes course" "PUBLISHED" \
  "$(curl -s -X POST "$BASE/api/v1/learning/courses/$COURSE_ID/publish" -H "$TEACHER_AUTH" | jq -r '.status')"
check "course visible by slug" "tafsir-al-fatiha" \
  "$(curl -s "$BASE/api/v1/learning/courses/tafsir-al-fatiha" -H "$AUTH" | jq -r '.slug')"
ENROLLMENT=$(curl -s -X POST "$BASE/api/v1/learning/enrollments/$COURSE_ID" -H "$AUTH")
check "student enrolls" "ACTIVE" "$(echo "$ENROLLMENT" | jq -r '.status')"
LESSON_ID=$(curl -s "$BASE/api/v1/learning/courses/tafsir-al-fatiha" -H "$AUTH" | jq -r '.lessons[0].lessonId')
check "lesson progress completes" "true" \
  "$(curl -s -X POST "$BASE/api/v1/learning/progress" -H "$AUTH" -H 'Content-Type: application/json' \
    -d "{\"enrollmentId\":\"$(echo "$ENROLLMENT" | jq -r '.id')\",\"lessonId\":\"$LESSON_ID\",\"watchedSeconds\":600}" | jq '.completed')"

echo "== community =="
check "badge definitions seeded" "true" \
  "$(curl -s "$BASE/api/v1/community/badges" -H "$AUTH" | jq '[.[] | select(.code=="first-task")] | length == 1')"
CIRCLE=$(curl -s -X POST "$BASE/api/v1/community/circles" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"name":"Fajr Circle","description":"morning hifz group"}')
check "circle created with invite code" "true" \
  "$(echo "$CIRCLE" | jq '.inviteCode | length == 8')"

echo "== recitation =="
EVAL=$(curl -s -X POST "$BASE/api/v1/recitation/evaluations" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"surahId":1,"fromAyah":1,"toAyah":4,"transcript":"بسم الله الرحمن الرحيم","expectedText":"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ"}')
EVAL_ID=$(echo "$EVAL" | jq -r '.id')
EVAL_STATUS=""
for i in $(seq 1 30); do
  EVAL_STATUS=$(curl -s "$BASE/api/v1/recitation/evaluations/$EVAL_ID" -H "$AUTH" | jq -r '.status')
  [ "$EVAL_STATUS" = "COMPLETED" ] && break
  sleep 2
done
check "recitation evaluation completes via worker" "COMPLETED" "$EVAL_STATUS"

echo "== web =="
check "web frontend serves the app shell" "200" \
  "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/)"
check "web runtime config is served" "200" \
  "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4200/config.js)"

echo "== observability =="
check "prometheus scrapes all services" "true" \
  "$(curl -s 'http://localhost:9090/api/v1/targets?state=active' | jq '[.data.activeTargets[] | select(.health=="up")] | length >= 11')"

echo
if [[ "$FAILED" == "1" ]]; then
  echo "SMOKE FAILED"
  exit 1
fi
echo "SMOKE PASSED"
