#!/usr/bin/env python3
"""Energetic, kid-friendly narration for the VECTOR distance explainer.
Brighter Piper voice (kristin), faster pace, slight pitch-up. Emits a master
narration wav and a scenes timing file the animation follows."""
import json, os, subprocess, wave, struct

MODEL = "/tmp/piper/en_US-kristin-medium.onnx"
OUT = "/tmp/vec"
os.makedirs(OUT, exist_ok=True)

SCENES = [
 ("title",   "Two vectors are zooming through space! How far apart are their tips? Let's blast off and find out!"),
 ("vectors", "A vector is an arrow from the origin. Here comes vector a... and here comes vector b. Whoosh!"),
 ("diff",    "To jump from a to b, we follow the difference vector: b minus a. That arrow is the gap between them!"),
 ("formula", "Its length is the distance! We crack it with the 3D Pythagoras: square each difference, add them up, then take the square root!"),
 ("example", "Let's try it! Vector a is one, two, three. Vector b is four, six, fifteen. Ready? Three! Two! One!"),
 ("compute", "Subtract! Four minus one is three. Six minus two is four. Fifteen minus three is twelve. Square them: nine, sixteen, and one hundred forty four. Add them up: one hundred sixty nine. And the square root... is thirteen!"),
 ("recap",   "The distance between the vectors is thirteen! Woo-hoo! You are a space math hero!"),
]

def wav_dur(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()

def read_pcm(p):
    with wave.open(p) as w:
        return w.getframerate(), w.getnchannels(), w.getsampwidth(), w.readframes(w.getnframes())

clips = []
for key, text in SCENES:
    raw = f"{OUT}/{key}_raw.wav"; fin = f"{OUT}/{key}.wav"
    subprocess.run(["piper", "-m", MODEL, "--length-scale", "0.92", "-f", raw],
                   input=text.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # brighten: +6% pitch, keep tempo
    subprocess.run(["ffmpeg", "-y", "-i", raw, "-af",
                    "asetrate=22050*1.06,atempo=0.9434,aresample=22050", fin],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    clips.append((key, fin, wav_dur(fin)))

# ---- build timeline ----
LEAD, TAIL = 0.30, 0.85
scenes, t = [], 0.0
for key, path, dur in clips:
    narr_start = t + LEAD
    scene_dur = LEAD + dur + TAIL
    scenes.append({"key": key, "start": round(t, 3), "dur": round(scene_dur, 3),
                   "narrStart": round(narr_start, 3), "narrDur": round(dur, 3)})
    t += scene_dur
total = round(t + 0.4, 3)

# ---- assemble master narration ----
sr, ch, sw = 22050, 1, 2
total_frames = int(total * sr)
buf = bytearray(total_frames * sw)
for sc, (key, path, dur) in zip(scenes, clips):
    fr, c, w2, data = read_pcm(path)
    off = int(sc["narrStart"] * sr) * sw
    end = min(len(buf), off + len(data))
    buf[off:end] = data[:end - off]
with wave.open("/tmp/narration_vec.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(bytes(buf))

with open("scenes.js", "w") as f:
    f.write("window.SCENES = " + json.dumps({"total": total, "scenes": scenes}) + ";\n")

print("total", total)
for s in scenes:
    print(s["key"], "start", s["start"], "dur", s["dur"], "narr", s["narrDur"])
