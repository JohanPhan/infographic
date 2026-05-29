#!/usr/bin/env python3
"""Build rytme_data.js for "Tosifret Rytme".
Whisper heard the facts as "2x 1 er 2", so fact onsets come from the
'Nx' tokens. Chorus count-beats are extracted from the word stream
(skipping the 'tell med meg' = '10 er meg' triples and 'og'/'er' filler);
the known skip-count sequences are then assigned to those onsets in order.
"""
import json, re

w = json.load(open("/tmp/words3.json"))

def is_num(tok):
    return re.match(r"^\d", tok) is not None

# ---- fact onsets from 'Nx' tokens ----
facts = []
for i, x in enumerate(w):
    m = re.match(r"^(\d)x$", x["w"])
    if m:
        facts.append((int(m.group(1)), x["s"], i))
# group into tables 2,3,4 (each should have 9)
from collections import defaultdict
by_tab = defaultdict(list)
for tab, t, i in facts:
    by_tab[tab].append((t, i))
for tab in (2, 3, 4):
    assert len(by_tab[tab]) == 9, (tab, len(by_tab[tab]))

# ---- chorus windows: token index ranges ----
# A: after last 2x-fact tokens .. before first 3x ; etc.
first_idx = {tab: by_tab[tab][0][1] for tab in (2, 3, 4)}
last_idx = {tab: by_tab[tab][8][1] for tab in (2, 3, 4)}
windows = {
    2: (last_idx[2] + 4, first_idx[3]),       # +4 skips "Nx 9 er R"
    3: (last_idx[3] + 4, first_idx[4]),
    4: (last_idx[4] + 4, len(w)),
}

SEQ = {
    2: [2, 4, 6, 8, 10, 12, 14, 16, 18],
    3: [3, 6, 9, 12, 15, 18, 21, 24, 27],
    4: [4, 8, 12, 16, 20, 24, 28, 32, 36],
}

def extract_beats(lo, hi):
    """Return onset times of the count-beats inside a token window."""
    beats = []
    i = lo
    while i < hi:
        tok = w[i]["w"]
        nxt = w[i + 1]["w"] if i + 1 < hi else ""
        nxt2 = w[i + 2]["w"] if i + 2 < hi else ""
        base = re.sub(r"[^0-9a-zæøå]", "", tok.lower())
        if base in ("og", "er", "meg", "ho", ""):
            i += 1; continue
        # 'ti/10' + 'er' + 'meg'  => "tell med meg" (skip, no beat)
        if base in ("10", "ti") and re.sub(r"[^a-zæøå]", "", nxt.lower()) == "er":
            if re.sub(r"[^a-zæøå]", "", nxt2.lower()) == "meg":
                i += 3; continue
            # 'ti/10' + 'er' + number  => a compound number (tjueén/-fire/-sju)
            beats.append(w[i]["s"]); i += 3; continue
        if is_num(tok):
            beats.append(w[i]["s"]); i += 1; continue
        i += 1
    return beats

timeline = []
for tab in (2, 3, 4):
    for k, (t, i) in enumerate(by_tab[tab]):
        b = k + 1
        timeline.append({"t": round(t, 2), "type": "fact", "a": tab, "b": b, "c": tab * b})
    lo, hi = windows[tab]
    beats = extract_beats(lo, hi)
    seq = SEQ[tab]
    print(f"table {tab}: {len(beats)} beats -> {[round(x,2) for x in beats]}")
    # pad/trim to len(seq)
    if len(beats) > len(seq):
        beats = beats[:len(seq)]
    while len(beats) < len(seq):
        beats.append(beats[-1] + 0.6)
    for idx, (on, n) in enumerate(zip(beats, seq)):
        timeline.append({"t": round(on, 2), "type": "count", "table": tab,
                         "seq": seq, "idx": idx, "n": n})

timeline.sort(key=lambda e: e["t"])
data = {"duration": 127.04, "intro": 3.5, "outro": 5.0,
        "audio": "assets/tosifret_rytme.m4a", "timeline": timeline}
json.dump(data, open("rytme_data.json", "w"), ensure_ascii=False, indent=0)
with open("rytme_data.js", "w") as f:
    f.write("// Auto-generated timeline for Tosifret Rytme.\n")
    f.write("// Fact onsets from 'Nx' tokens; chorus beats from the word stream.\n")
    f.write("window.SONG_DATA = "); json.dump(data, f, ensure_ascii=False); f.write(";\n")

nf = sum(1 for e in timeline if e["type"] == "fact")
nc = sum(1 for e in timeline if e["type"] == "count")
print("events", len(timeline), "facts", nf, "counts", nc)
