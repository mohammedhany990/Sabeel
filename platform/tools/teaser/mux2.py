import json
import os
import subprocess
import sys

out = sys.argv[1]
timeline = json.load(open(os.path.join(out, "timeline2.json")))
FADE = 0.3
PRE = 0.15
POST = 0.05
inputs = ["-i", os.path.join(out, "teaser.webm")]
fc = []
vlabels = []
audio = []
cum = 0.0
n_audio = 0
for i, sc in enumerate(timeline):
    parts = []
    length = 0.0
    for j, (a, b) in enumerate(sc["ranges"]):
        a += PRE
        b -= POST
        if b - a <= 0.2:
            continue
        lab = "s%d_%d" % (i, j)
        fc.append("[0:v]trim=start=%.3f:end=%.3f,setpts=PTS-STARTPTS,fps=30[%s]" % (a, b, lab))
        parts.append("[%s]" % lab)
        length += b - a
    if not parts:
        continue
    seg = "v%d" % i
    if len(parts) > 1:
        fc.append("%sconcat=n=%d:v=1:a=0[%sc]" % ("".join(parts), len(parts), seg))
        src = "%sc" % seg
    else:
        src = parts[0].strip("[]")
    fc.append("[%s]fade=t=in:st=0:d=%.2f,fade=t=out:st=%.3f:d=%.2f[%s]" % (src, FADE, max(0, length - FADE), FADE, seg))
    vlabels.append("[%s]" % seg)
    clip = "audio/%s.mp3" % sc["id"]
    if os.path.exists(clip):
        inputs += ["-i", clip]
        n_audio += 1
        ms = int((cum + 0.25) * 1000)
        fc.append("[%d:a]adelay=%d|%d[a%d]" % (n_audio, ms, ms, n_audio))
        audio.append("[a%d]" % n_audio)
    cum += length
fc.append("%sconcat=n=%d:v=1:a=0[vout]" % ("".join(vlabels), len(vlabels)))
cmd = ["ffmpeg", "-y"] + inputs
maps = ["-map", "[vout]"]
if audio:
    fc.append("%samix=inputs=%d:normalize=0[aout]" % ("".join(audio), len(audio)))
    maps += ["-map", "[aout]", "-c:a", "aac", "-b:a", "160k"]
cmd += ["-filter_complex", ";".join(fc)] + maps
cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium", os.path.join(out, "sabeel-teaser2.mp4")]
subprocess.check_call(cmd)
json.dump({"total": cum}, open(os.path.join(out, "mux2.json"), "w"))
