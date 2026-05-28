#!/usr/bin/env python3
"""Build data.js / data.json from the Whisper transcript.

The song walks the multiplication tables in order, in a rigid pattern of
[fact, fact, fact, cheer] x 3 per table.  We trust Whisper only for the
*onset time* of each line and generate the correct facts ourselves.
"""
import json

t = json.load(open("/tmp/transcript.json"))
starts = [round(s["start"], 2) for s in t]
assert len(starts) == 73, len(starts)

enc = {
    1: ["Se så lett det går med deg!", "Nå går det riktig kjekt!"],
    2: ["Du henger godt med!", "Bare fortsett sånn, du!"],
    3: ["Du lærer fort, så flink du er!", "Du kan mer enn du tror, min venn!"],
    4: ["Nå går vi helt i takt!", "Se hvor flink du er, det er sant!"],
    5: ["Vi tar en runde til!", "Du lærer mer for hver dag!"],
    6: ["Du er helt på stell!", "Du er virkelig på vei!"],
}
pattern = ["f1", "f2", "f3", "e0", "f4", "f5", "f6", "e1", "f7", "f8", "f9", "f10"]

timeline, idx = [], 0
for table in range(1, 7):
    for p in pattern:
        ts = starts[idx]; idx += 1
        if p[0] == "f":
            b = int(p[1:])
            timeline.append({"t": ts, "type": "fact", "a": table, "b": b, "c": table * b})
        else:
            timeline.append({"t": ts, "type": "enc", "text": enc[table][int(p[1])]})
timeline.append({"t": starts[idx], "type": "fact", "a": 7, "b": 1, "c": 7}); idx += 1
assert idx == 73

data = {"duration": 240.0, "audio": "assets/gangertabell.m4a", "timeline": timeline}
json.dump(data, open("data.json", "w"), ensure_ascii=False, indent=0)
with open("data.js", "w") as f:
    f.write("// Auto-generated synced timeline for Gangertabellsangen.\n")
    f.write("// 73 events aligned to vocal onsets (Whisper) over the multiplication-table song.\n")
    f.write("window.SONG_DATA = ")
    json.dump(data, f, ensure_ascii=False)
    f.write(";\n")
print("wrote data.js / data.json:", len(timeline), "events")
