from faster_whisper import WhisperModel
import json
model = WhisperModel("small", device="cpu", compute_type="int8")
segments, info = model.transcribe("/tmp/song.wav", language="no", word_timestamps=True, vad_filter=False)
print("LANG:", info.language, "PROB:", round(info.language_probability,2))
out=[]
for s in segments:
    words=[{"w":w.word,"s":round(w.start,2),"e":round(w.end,2)} for w in (s.words or [])]
    out.append({"start":round(s.start,2),"end":round(s.end,2),"text":s.text,"words":words})
    print(f"[{s.start:6.2f} - {s.end:6.2f}] {s.text}")
json.dump(out, open("/tmp/transcript.json","w"), ensure_ascii=False, indent=1)
