import glob
import json
import os
import subprocess

res = {}
for f in sorted(glob.glob("audio/n[0-9][0-9].mp3")):
    d = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode().strip()
    res[os.path.basename(f)[:-4]] = round(float(d), 3)
json.dump(res, open("audio/durations2.json", "w"))
print(res)
