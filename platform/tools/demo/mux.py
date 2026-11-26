import glob
import json
import os
import subprocess
import sys

out = sys.argv[1]
timeline = json.load(open(os.path.join(out, "timeline.json")))
inputs = ["-i", os.path.join(out, "demo.webm")]
filters = []
labels = []
n = 0
for item in timeline:
    files = glob.glob("audio/%s.*" % item["id"])
    files = [f for f in files if not f.endswith(".json")]
    if not files:
        continue
    inputs += ["-i", files[0]]
    n += 1
    ms = int(item["at"] * 1000)
    filters.append("[%d:a]adelay=%d|%d[a%d]" % (n, ms, ms, n))
    labels.append("[a%d]" % n)
cmd = ["ffmpeg", "-y"] + inputs
if labels:
    filters.append("".join(labels) + "amix=inputs=%d:normalize=0[aout]" % n)
    cmd += ["-filter_complex", ";".join(filters), "-map", "0:v", "-map", "[aout]", "-c:a", "aac", "-b:a", "128k"]
else:
    cmd += ["-map", "0:v"]
cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-shortest", os.path.join(out, "sabeel-demo.mp4")]
subprocess.check_call(cmd)
