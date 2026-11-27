import glob, json, os, subprocess
out = {}
for f in sorted(glob.glob("audio/*")):
    if f.endswith(".json"):
        continue
    d = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode().strip()
    out[os.path.splitext(os.path.basename(f))[0]] = round(float(d), 3)
json.dump(out, open("audio/durations.json", "w"))
print(out)
