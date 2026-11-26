import argparse
import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

DIACRITICS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]")
LETTER_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})


def normalize(word):
    w = DIACRITICS.sub("", word).translate(LETTER_MAP)
    return re.sub(r"[^\u0621-\u064A]", "", w)


def load_reference(text_file, surah):
    ayahs = []
    for line in Path(text_file).read_text(encoding="utf-8").splitlines():
        parts = line.split("|", 2)
        if len(parts) == 3 and int(parts[0]) == surah:
            words = [w for w in (normalize(x) for x in parts[2].split()) if w]
            ayahs.append((int(parts[1]), words))
    if not ayahs:
        raise SystemExit("surah %d not found in %s" % (surah, text_file))
    return ayahs


def run_whisper(binary, model, mp3, threads, workdir):
    wav = workdir / "audio.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", "16000", "-ac", "1",
                    "-c:a", "pcm_s16le", str(wav)], check=True)
    prefix = workdir / "out"
    subprocess.run([binary, "-m", model, "-l", "ar", "-ml", "1", "-sow", "-oj", "-of", str(prefix),
                    "-t", str(threads), "-f", str(wav)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    data = json.loads((workdir / "out.json").read_text(encoding="utf-8"))
    return parse_words(data)


def parse_words(data):
    words = []
    for item in data.get("transcription", []):
        norm = normalize(item.get("text", ""))
        if norm:
            offsets = item["offsets"]
            words.append((norm, offsets["from"] / 1000.0, offsets["to"] / 1000.0))
    return words


def duration_of(mp3):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                          "default=noprint_wrappers=1:nokey=1", str(mp3)], check=True, capture_output=True, text=True)
    return float(out.stdout.strip())


def align(ayahs, asr_words, total_duration, surah):
    ref_words = []
    owner = []
    for number, words in ayahs:
        for w in words:
            ref_words.append(w)
            owner.append(number)
    asr_norm = [w[0] for w in asr_words]
    matcher = difflib.SequenceMatcher(None, ref_words, asr_norm, autojunk=False)
    first_time = {}
    last_time = {}
    matched = {number: 0 for number, _ in ayahs}
    for a, b, size in matcher.get_matching_blocks():
        for k in range(size):
            number = owner[a + k]
            start, end = asr_words[b + k][1], asr_words[b + k][2]
            first_time.setdefault(number, start)
            last_time[number] = end
            matched[number] += 1
    numbers = [n for n, _ in ayahs]
    starts = {}
    for n in numbers:
        if n in first_time:
            starts[n] = first_time[n]
    for i, n in enumerate(numbers):
        if n in starts:
            continue
        prev = next((m for m in reversed(numbers[:i]) if m in starts), None)
        nxt = next((m for m in numbers[i + 1:] if m in starts), None)
        lo = last_time.get(prev, starts[prev]) if prev is not None else 0.0
        hi = starts[nxt] if nxt is not None else total_duration
        lengths = {m: max(1, sum(len(w) for w in dict(ayahs)[m])) for m in numbers}
        group = [m for m in numbers if m not in starts and (prev is None or m > prev) and (nxt is None or m < nxt)]
        total = sum(lengths[m] for m in group)
        before = sum(lengths[m] for m in group if m < n)
        starts[n] = lo + (hi - lo) * before / total
    ordered = sorted(numbers)
    for i in range(1, len(ordered)):
        if starts[ordered[i]] < starts[ordered[i - 1]]:
            starts[ordered[i]] = starts[ordered[i - 1]]
    if surah not in (1, 9):
        starts[ordered[0]] = 0.0
    result = []
    for i, n in enumerate(ordered):
        end = starts[ordered[i + 1]] if i + 1 < len(ordered) else total_duration
        if end <= starts[n]:
            end = starts[n] + 0.01
        total_words = max(1, len(dict(ayahs)[n]))
        result.append({"ayah": n, "start": round(starts[n], 2), "end": round(end, 2),
                       "matched": round(matched[n] / total_words, 2)})
    overall = sum(matched.values()) / max(1, len(ref_words))
    return result, overall


def process(args, mp3, surah):
    ayahs = load_reference(args.text_file, surah)
    with tempfile.TemporaryDirectory() as tmp:
        words = run_whisper(args.whisper_cli, args.model, mp3, args.threads, Path(tmp))
    result, overall = align(ayahs, words, duration_of(mp3), surah)
    return result, overall


def main():
    p = argparse.ArgumentParser(description="Generate ayah timings for surah mp3 files with whisper.cpp")
    p.add_argument("--input", required=True, help="a surah mp3 (named SSS.mp3) or a folder of them")
    p.add_argument("--output", required=True, help="timings folder for this reciter, for example platform/reciters/timings/husary_own")
    p.add_argument("--whisper-cli", default="/opt/whisper/whisper-cli")
    p.add_argument("--model", default="/opt/whisper/model.bin")
    p.add_argument("--text-file", default=str(Path(__file__).resolve().parents[2] / "quran-service/src/main/resources/quran/tanzil-simple-clean.txt"))
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--min-match", type=float, default=0.6, help="surahs with a lower share of matched words are skipped")
    p.add_argument("--force", action="store_true", help="overwrite existing timing files")
    args = p.parse_args()
    src = Path(args.input)
    files = [src] if src.is_file() else sorted(src.glob("[0-9][0-9][0-9].mp3"))
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    skipped = 0
    for mp3 in files:
        surah = int(mp3.stem)
        target = out / ("%03d.json" % surah)
        if target.exists() and not args.force:
            print("%03d exists, skipping" % surah)
            continue
        try:
            result, overall = process(args, mp3, surah)
        except (subprocess.CalledProcessError, OSError) as e:
            print("%03d failed: %s" % (surah, e), file=sys.stderr)
            skipped += 1
            continue
        weak = [r["ayah"] for r in result if r["matched"] < 0.5]
        if overall < args.min_match:
            print("%03d skipped: only %.0f%% of words matched, playback falls back to the full surah" % (surah, overall * 100))
            skipped += 1
            continue
        target.write_text(json.dumps({"surah": surah, "ayahs": [{k: r[k] for k in ("ayah", "start", "end")} for r in result]},
                                     ensure_ascii=False, indent=1), encoding="utf-8")
        (out / ("%03d.report.json" % surah)).write_text(json.dumps({"surah": surah, "matchedShare": round(overall, 3), "ayahs": result}, indent=1), encoding="utf-8")
        print("%03d written, %.0f%% words matched%s" % (surah, overall * 100, ", weak ayahs: " + ",".join(map(str, weak)) if weak else ""))
    print("done, %d of %d surahs not written" % (skipped, len(files)))


if __name__ == "__main__":
    main()
