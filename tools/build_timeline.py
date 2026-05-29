#!/usr/bin/env python3
"""Build data.js / data.json for the 1-9 song using the EXACT lyrics
(provided by the channel owner). Fact onsets come from word-level Whisper
timing; cheer-line onsets are placed at the midpoint to the next fact.
Each event carries the exact sung text for karaoke display."""
import json

ons = json.load(open("/tmp/fact_onsets.json"))
assert len(ons) == 90

# The 12 lines of each verse, in sung order:
# f1 f2 f3 CHEER f4 f5 f6 CHEER f7 f8 f9 f10
LYRICS = [
 # Verse 1
 "Én ganger én er én", "Én ganger to er to", "Én ganger tre er tre",
 "Se så lett det går med deg!",
 "Én ganger fire er fire", "Én ganger fem er fem", "Én ganger seks er seks",
 "Nå går det virkelig heftig!",
 "Én ganger sju er sju", "Én ganger åtte er åtte", "Én ganger ni er ni",
 "Én ganger ti – så flott!",
 # Verse 2
 "To ganger én er to", "To ganger to er fire", "To ganger tre er seks",
 "Kom igjen, vi lærer mer!",
 "To ganger fire er åtte", "To ganger fem er ti", "To ganger seks er tolv",
 "La oss telle igjen!",
 "To ganger sju er fjorten", "To ganger åtte er seksten", "To ganger ni er atten",
 "To ganger ti er tjue – finfin!",
 # Verse 3
 "Tre ganger én er tre", "Tre ganger to er seks", "Tre ganger tre er ni",
 "Du lærer fort, så flink og kvikk!",
 "Tre ganger fire er tolv", "Tre ganger fem er femten", "Tre ganger seks er atten",
 "Du kan mer enn du tror, min venn!",
 "Tre ganger sju er tjueén", "Tre ganger åtte er tjuefire", "Tre ganger ni er tjuesju",
 "Tre ganger ti er tretti – hurra!",
 # Verse 4
 "Fire ganger én er fire", "Fire ganger to er åtte", "Fire ganger tre er tolv",
 "Nå går vi helt i takt!",
 "Fire ganger fire er seksten", "Fire ganger fem er tjue", "Fire ganger seks er tjuefire",
 "Se hvor flink du er – det er sant!",
 "Fire ganger sju er tjueåtte", "Fire ganger åtte er trettito", "Fire ganger ni er trettiseks",
 "Fire ganger ti er førti – juhu!",
 # Verse 5
 "Fem ganger én er fem", "Fem ganger to er ti", "Fem ganger tre er femten",
 "Vi tar en runde igjen!",
 "Fem ganger fire er tjue", "Fem ganger fem er tjuefem", "Fem ganger seks er tretti",
 "Du lærer og er kjapp!",
 "Fem ganger sju er trettifem", "Fem ganger åtte er førti", "Fem ganger ni er førtifem",
 "Fem ganger ti er femti – klart!",
 # Verse 6
 "Seks ganger én er seks", "Seks ganger to er tolv", "Seks ganger tre er atten",
 "Du er helt på stell!",
 "Seks ganger fire er tjuefire", "Seks ganger fem er tretti", "Seks ganger seks er trettiseks",
 "Dette går jo ganske sporty!",
 "Seks ganger sju er førtito", "Seks ganger åtte er førtiåtte", "Seks ganger ni er femtifire",
 "Seks ganger ti er seksti – flott!",
 # Verse 7
 "Sju ganger én er sju", "Sju ganger to er fjorten", "Sju ganger tre er tjueén",
 "Du er den flinkeste vi har sett!",
 "Sju ganger fire er tjueåtte", "Sju ganger fem er trettifem", "Sju ganger seks er førtito",
 "Du er virkelig på vei!",
 "Sju ganger sju er førtini", "Sju ganger åtte er femtiseks", "Sju ganger ni er sekstitre",
 "Sju ganger ti er sytti – yeah!",
 # Verse 8
 "Åtte ganger én er åtte", "Åtte ganger to er seksten", "Åtte ganger tre er tjuefire",
 "Du er rask og riktig fin!",
 "Åtte ganger fire er trettito", "Åtte ganger fem er førti", "Åtte ganger seks er førtiåtte",
 "Nå begynner det å bli sporty!",
 "Åtte ganger sju er femtiseks", "Åtte ganger åtte er sekstifire", "Åtte ganger ni er syttito",
 "Åtte ganger ti er åtti – hurra!",
 # Verse 9
 "Ni ganger én er ni", "Ni ganger to er atten", "Ni ganger tre er tjuesju",
 "Du lærer det så fint!",
 "Ni ganger fire er trettiseks", "Ni ganger fem er førtifem", "Ni ganger seks er femtifire",
 "Matte gjør deg skarp!",
 "Ni ganger sju er sekstitre", "Ni ganger åtte er syttito", "Ni ganger ni er åttien",
 "Ni ganger ti er nitti – flott igjen!",
]
assert len(LYRICS) == 108, len(LYRICS)

CHEER_POS = {3, 7}        # within each verse, lines 3 and 7 are cheer lines

timeline = []
li = 0
for t in range(1, 10):                       # tables 1..9
    verse_facts = ons[(t - 1) * 10:t * 10]
    b = 0
    for pos in range(12):
        text = LYRICS[li]; li += 1
        if pos in CHEER_POS:
            timeline.append({"_cheer": True, "text": text})
        else:
            on = verse_facts[b]
            timeline.append({"t": round(on, 2), "type": "fact", "a": t, "b": b + 1,
                             "c": t * (b + 1), "text": text})
            b += 1

# resolve cheer times = midpoint between the preceding and following fact
resolved = []
for i, e in enumerate(timeline):
    if e.get("_cheer"):
        prev_t = timeline[i - 1]["t"]
        nxt = next((x for x in timeline[i + 1:] if x.get("type") == "fact"), None)
        nt = nxt["t"] if nxt else prev_t + 2.5
        resolved.append({"t": round(prev_t + (nt - prev_t) * 0.5, 2), "type": "enc", "text": e["text"]})
    else:
        resolved.append(e)
resolved.sort(key=lambda x: x["t"])

data = {"duration": 295.92, "intro": 4.0, "outro": 6.0,
        "audio": "assets/gangertabell_1-9.m4a", "timeline": resolved}
json.dump(data, open("data.json", "w"), ensure_ascii=False, indent=0)
with open("data.js", "w") as f:
    f.write("// Auto-generated synced timeline for the 1-9 multiplication-table song.\n")
    f.write("// Exact lyrics supplied by the channel owner; fact onsets from Whisper word timing.\n")
    f.write("window.SONG_DATA = "); json.dump(data, f, ensure_ascii=False); f.write(";\n")

facts = [e for e in resolved if e["type"] == "fact"]
print("events", len(resolved), "facts", len(facts), "enc", len(resolved) - len(facts))
for e in resolved[:5]:
    print(e)
print("...")
for e in resolved[-3:]:
    print(e)
