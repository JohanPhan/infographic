# Gangetabell-sangen — animert infografikk

An animated, sing-along multiplication-table infographic synced to the
song **Gangertabell** (Norwegian: *the multiplication table*).

As the song plays, the page walks through the times tables **1× to 6×**
(plus the first line of 7×) exactly in step with the vocals:

- the current fact appears big — `a × b = c` — with a pop animation
- a **dot-array** visualises the product (`a` rows of `b` dots)
- a **10×10 grid** fills in as facts are sung (and lights up the
  commutative twin too), so the learner watches their table grow
- **table chips** track progress, the background colour shifts per table
- short Norwegian **encouragement lines** appear between groups of facts

## Run it

It's a static site — just serve the folder and open `index.html`:

```bash
npx http-server -p 8080 -c-1
# then open http://localhost:8080
```

Click **▶ Start sangen** (a user gesture is required before browsers
allow audio to play). Space toggles play/pause; click the progress bar
to seek.

## How the sync works

The animation is driven entirely from `audio.currentTime` in a
`requestAnimationFrame` loop, so the visuals can never drift out of
step with the music, even if a frame is dropped or the user seeks.

The timeline in `data.js` was built by:

1. transcribing the vocals with Whisper to get the onset time of each
   sung line (`tools/transcribe.py`),
2. mapping those 73 onsets onto the song's rigid structure —
   `[fact, fact, fact, cheer] × 3` per table — and generating the
   **correct** multiplication facts programmatically (the lyrics are
   just the times tables, so the math is deterministic rather than
   trusting the noisy transcription).

## Files

| File            | Purpose                                            |
|-----------------|----------------------------------------------------|
| `index.html`    | markup / layout                                    |
| `style.css`     | styling and animations                             |
| `app.js`        | timeline engine, rendering, controls               |
| `data.js`       | generated synced timeline (73 events)              |
| `data.json`     | same data, plain JSON                              |
| `assets/`       | the song (`gangertabell.m4a`)                      |
| `tools/`        | the transcription/timeline generation scripts      |
