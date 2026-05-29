#!/usr/bin/env python3
"""Build rytme_data.js for "Tosifret Rytme".
Whisper heard the facts as "2x 1 er 2", so fact onsets come from the
'Nx' tokens. Chorus count-beats are extracted from the word stream
(skipping the 'tell med meg' = '10 er meg' triples and 'og'/'er' filler);
the known skip-count sequences are then assigned to those onsets in order.
"""
import json, re

w = json.load(open("/tmp/words4.json"))

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

def linspace(a, b, n):
    if n == 1:
        return [a]
    return [round(a + (b - a) * k / (n - 1), 2) for k in range(n)]

def chorus_beats(lo, hi):
    """Each chorus = 'Tell med meg' x2, 4 numbers, 'Tell med meg' x2, 5 numbers.
    Use the 'tell' markers to find the two number groups, then place the 4 and 5
    beats evenly within each group's sung span (robust to compound-number splits)."""
    tells = [i for i in range(lo, hi) if w[i]["w"].lower().startswith("tell")]
    nums = [i for i in range(lo, hi) if is_num(w[i]["w"])]
    def first_num_after(idx):
        for j in nums:
            if j > idx:
                return j
        return None
    # group1 starts after the 2nd tell; group2 after the 4th (or last) tell
    g1s = first_num_after(tells[1]) if len(tells) >= 2 else (nums[0] if nums else lo)
    t3 = tells[2] if len(tells) >= 3 else None
    g2s = first_num_after(tells[3]) if len(tells) >= 4 else (first_num_after(t3) if t3 else None)
    g1_start = w[g1s]["s"]
    g1_end = w[t3]["s"] - 0.3 if t3 else w[g2s]["s"] - 0.3
    g2_start = w[g2s]["s"] if g2s else g1_end + 0.6
    last_num = max((w[j]["s"] for j in nums if w[j]["s"] >= g2_start), default=g2_start + 2.4)
    g2_end = last_num
    return linspace(g1_start, g1_end, 4) + linspace(g2_start, g2_end, 5)

timeline = []
for tab in (2, 3, 4):
    for k, (t, i) in enumerate(by_tab[tab]):
        b = k + 1
        timeline.append({"t": round(t, 2), "type": "fact", "a": tab, "b": b, "c": tab * b})
    lo, hi = windows[tab]
    beats = chorus_beats(lo, hi)
    seq = SEQ[tab]
    print(f"table {tab}: {len(beats)} beats -> {beats}")
    for idx, (on, n) in enumerate(zip(beats, seq)):
        timeline.append({"t": round(on, 2), "type": "count", "table": tab,
                         "seq": seq, "idx": idx, "n": n})

timeline.sort(key=lambda e: e["t"])
data = {"duration": 131.8, "intro": 3.5, "outro": 5.0,
        "audio": "assets/togangerbjelle.m4a", "timeline": timeline}
json.dump(data, open("rytme_data.json", "w"), ensure_ascii=False, indent=0)
with open("rytme_data.js", "w") as f:
    f.write("// Auto-generated timeline for Tosifret Rytme.\n")
    f.write("// Fact onsets from 'Nx' tokens; chorus beats from the word stream.\n")
    f.write("window.SONG_DATA = "); json.dump(data, f, ensure_ascii=False); f.write(";\n")

nf = sum(1 for e in timeline if e["type"] == "fact")
nc = sum(1 for e in timeline if e["type"] == "count")
print("events", len(timeline), "facts", nf, "counts", nc)
