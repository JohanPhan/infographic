#!/usr/bin/env python3
"""Mix narration + synthesized SFX + a light upbeat music bed into one track.
All SFX are generated procedurally so there are no external assets."""
import numpy as np, wave, json

SR = 22050

def read_wav(p):
    with wave.open(p) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    return a

scenes = json.load(open("/tmp/scenes_obj.json"))
total = scenes["total"]
N = int(total * SR) + SR
track_sfx = np.zeros(N, np.float32)
track_mus = np.zeros(N, np.float32)

def place(buf, sig, t):
    i = int(t * SR); j = min(len(buf), i + len(sig))
    if i < 0 or i >= len(buf): return
    buf[i:j] += sig[:j - i]

def env(n, a, d):  # attack/decay envelope
    e = np.ones(n); ai = int(a * n); di = int(d * n)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if di: e[-di:] = np.linspace(1, 0, di)
    return e

def tone(f, dur, vol=.5, kind="sine", a=.02, d=.3, slidef=None):
    n = int(dur * SR); t = np.arange(n) / SR
    freq = f if slidef is None else np.linspace(f, slidef, n)
    ph = 2 * np.pi * np.cumsum(freq) / SR if slidef is not None else 2 * np.pi * f * t
    if kind == "sine": w = np.sin(ph)
    elif kind == "tri": w = 2 * np.abs(2 * (ph / (2 * np.pi) % 1) - 1) - 1
    else: w = np.sign(np.sin(ph))
    return (w * env(n, a, d) * vol).astype(np.float32)

def whoosh(dur=.45, vol=.35):
    n = int(dur * SR); noise = np.random.RandomState(7).randn(n)
    # simple one-pole sweep
    out = np.zeros(n); b = 0.0
    cut = np.linspace(0.02, 0.45, n)
    for i in range(n):
        b += cut[i] * (noise[i] - b); out[i] = b
    e = np.sin(np.linspace(0, np.pi, n))
    return (out * e * vol).astype(np.float32)

def ding(f=1200, dur=.5, vol=.4):
    return tone(f, dur, vol, "sine", .005, .9) + tone(f * 2.01, dur, vol * .4, "sine", .005, .9)

def pop(f=720, vol=.4):
    return tone(f, .12, vol, "sine", .01, .8, slidef=f * 1.6)

def chord(freqs, dur=.8, vol=.3):
    s = np.zeros(int(dur * SR), np.float32)
    for f in freqs: s += tone(f, dur, vol / len(freqs), "tri", .01, .8)
    return s

# ---- SFX placement (global times) ----
sc = {s["key"]: s for s in scenes["scenes"]}
def S(key, off): return sc[key]["start"] + off

place(track_sfx, whoosh(.6, .3), S("title", 0.2))                       # rocket flyby
place(track_sfx, whoosh(.4), S("vectors", 1.4)); place(track_sfx, whoosh(.4), S("vectors", 3.6))
place(track_sfx, whoosh(.45), S("diff", 1.2)); place(track_sfx, whoosh(.55, .28), S("diff", 3.2))
place(track_sfx, ding(1400, .6), S("formula", 1.3))
place(track_sfx, whoosh(.4), S("example", 1.2)); place(track_sfx, whoosh(.4), S("example", 2.4))
for n, off in [("3", 4.9), ("2", 5.6), ("1", 6.3)]:
    place(track_sfx, tone(880, .18, .35, "sine", .01, .6), S("example", off))
place(track_sfx, tone(220, .7, .4, "sine", .01, .5, slidef=900) + whoosh(.7, .25), S("example", 7.0))  # launch
for off in [1.4, 3.0, 4.6]:
    place(track_sfx, pop(760), S("compute", off))
for off in [8.3, 8.6, 8.9]:                                              # squares 9,16,144
    place(track_sfx, pop(900), S("compute", off))
place(track_sfx, pop(1000), S("compute", 10.4))                          # 169
place(track_sfx, ding(1500, .8, .5), S("compute", 13.3))                 # 13!
place(track_sfx, chord([523, 659, 784, 1046], .9, .42), S("recap", 0.5)) # tada
place(track_sfx, chord([659, 784, 988, 1318], .9, .34), S("recap", 1.4))

# ---- light upbeat music bed (gentle, low volume) ----
bpm = 120; beat = 60 / bpm
bass_notes = [130.81, 130.81, 174.61, 196.00]   # C3 C3 F3 G3 per bar (4 beats each)
arp = [523.25, 659.25, 783.99, 659.25]          # C5 E5 G5 E5
t = 0.0; bar = 0
while t < total:
    root = bass_notes[bar % len(bass_notes)]
    place(track_mus, tone(root, beat * 0.9, .16, "tri", .01, .5), t)     # bass on beat 1
    place(track_mus, tone(root, beat * 0.9, .12, "tri", .01, .5), t + 2 * beat)
    for k in range(4):                                                   # arpeggio
        place(track_mus, tone(arp[k] / 2 if False else arp[k], beat * 0.5, .06, "sine", .02, .7), t + k * beat)
    t += 4 * beat; bar += 1

# fade music in/out
fade = int(1.2 * SR)
track_mus[:fade] *= np.linspace(0, 1, fade)
track_mus[-fade:] *= np.linspace(1, 0, fade)

# ---- mix with narration ----
narr = read_wav("/tmp/narration_vec.wav")
if len(narr) < N: narr = np.concatenate([narr, np.zeros(N - len(narr), np.float32)])
else: narr = narr[:N]
mix = narr * 1.0 + track_sfx * 0.55 + track_mus * 0.5
# soft limit
peak = np.max(np.abs(mix));
if peak > 0.98: mix *= 0.98 / peak
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
with wave.open("/tmp/final_vec.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print("mixed -> /tmp/final_vec.wav  dur", round(len(out) / SR, 2), "peak", round(float(peak), 3))
