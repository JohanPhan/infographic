import subprocess, wave, json, os, struct

MODEL = "/tmp/piper/en_US-amy-medium.onnx"
SCENES = [
 ("title",   "How do we find the distance between two points in three dimensional space? Let's build it up, step by step."),
 ("recall2d","Start in two dimensions. The distance between two points is the hypotenuse of a right triangle. By the Pythagorean theorem, it equals the square root of the change in x squared, plus the change in y squared."),
 ("to3d",    "Now we add a third axis: z. The two points differ in x, y and z. These three differences form the edges of a rectangular box, and the distance between the points is the box's space diagonal."),
 ("formula", "Using the Pythagorean theorem twice gives the three dimensional distance formula. The distance equals the square root of, delta x squared, plus delta y squared, plus delta z squared."),
 ("example", "Let's try an example. Take point A at one, two, three. And point B at four, six, fifteen."),
 ("compute", "First, the differences. Four minus one is three. Six minus two is four. And fifteen minus three is twelve. Now square and add: nine, plus sixteen, plus one hundred and forty four, equals one hundred and sixty nine. And the square root of one hundred and sixty nine, is thirteen."),
 ("recap",   "So the distance from A to B is thirteen. In general, the distance is the length of the vector from A to B: the square root of the sum of the squared differences. And that's it!"),
]

LEAD = 0.35     # visuals lead the voice
TAIL = 0.9      # linger after voice
GAP  = 0.25     # gap added into scene end

def wav_dur(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate(), w.getframerate(), w.getnchannels(), w.getsampwidth()

scenes = []
t = 0.6   # initial silence
clips = []
for key, text in SCENES:
    out = f"/tmp/narr/{key}.wav"
    subprocess.run(["piper", "-m", MODEL, "-f", out], input=text.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    dur, sr, ch, sw = wav_dur(out)
    narr_start = t + LEAD
    scene_dur = LEAD + dur + TAIL + GAP
    scenes.append({"key": key, "start": round(t, 2), "dur": round(scene_dur, 2),
                   "narrStart": round(narr_start, 2), "narrDur": round(dur, 2), "text": text})
    clips.append((narr_start, out))
    t += scene_dur

total = round(t + 0.5, 2)
data = {"total": total, "scenes": scenes}
json.dump(data, open("/home/user/infographic/scenes.json", "w"), indent=1)
with open("/home/user/infographic/scenes.js", "w") as f:
    f.write("window.SCENES = "); json.dump(data, f); f.write(";\n")

# assemble master narration wav (16-bit mono @ voice sr)
_, sr, ch, sw = wav_dur(clips[0][1])
N = int(total * sr)
buf = bytearray(N * sw * ch)
for start, path in clips:
    with wave.open(path) as w:
        frames = w.readframes(w.getnframes())
    off = int(start * sr) * sw * ch
    end = min(len(buf), off + len(frames))
    buf[off:end] = frames[:end - off]
with wave.open("/tmp/narration.wav", "w") as w:
    w.setnchannels(ch); w.setsampwidth(sw); w.setframerate(sr)
    w.writeframes(bytes(buf))

print("total", total, "sr", sr)
for s in scenes:
    print(f'{s["key"]:9s} start={s["start"]:6.2f} dur={s["dur"]:5.2f} narr={s["narrDur"]:.2f}')
