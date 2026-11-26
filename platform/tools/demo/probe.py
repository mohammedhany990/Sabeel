import glob
import json
import subprocess

d = {}
for f in glob.glob("audio/s*.*"):
    if f.endswith(".json"):
        continue
    sid = f.split("/")[-1].split(".")[0]
    r = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f])
    d[sid] = float(r)
json.dump(d, open("audio/durations.json", "w"))
print(d)
