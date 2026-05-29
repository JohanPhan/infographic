(function () {
  "use strict";

  const DATA = window.SONG_DATA;
  const audio = document.getElementById("audio");

  // ----- element refs -----
  const startOverlay = document.getElementById("start");
  const startBtn = document.getElementById("startBtn");
  const stage = document.getElementById("stage");
  const toggleBtn = document.getElementById("toggle");
  const eqEl = document.getElementById("factEq");
  const faEl = eqEl.querySelector(".fa");
  const fbEl = eqEl.querySelector(".fb");
  const fcEl = eqEl.querySelector(".fc");
  const lyricEl = document.getElementById("lyric");
  const arrayEl = document.getElementById("array");
  const gridEl = document.getElementById("grid");
  const chipsEl = document.getElementById("tableChips");
  const progress = document.getElementById("progress");
  const progressFill = document.getElementById("progressFill");
  const timeEl = document.getElementById("time");

  // ----- build the 10x10 multiplication grid -----
  const gridCells = {}; // key "a-b" -> element
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      const c = document.createElement("div");
      c.className = "g";
      c.textContent = a * b;
      c.dataset.key = a + "-" + b;
      gridCells[a + "-" + b] = c;
      gridEl.appendChild(c);
    }
  }

  // ----- build table chips (tables present in the song) -----
  const tables = [...new Set(DATA.timeline.filter(e => e.type === "fact").map(e => e.a))].sort((x, y) => x - y);
  const chipEls = {};
  tables.forEach(t => {
    const c = document.createElement("div");
    c.className = "chip";
    c.textContent = t;
    chipEls[t] = c;
    chipsEl.appendChild(c);
  });

  // hue per table for the slow background colour journey
  const hues = { 1: 265, 2: 215, 3: 165, 4: 110, 5: 55, 6: 25, 7: 0, 8: 320, 9: 285 };

  // ----- render a fact (equation + dot array) -----
  function renderArray(a, b) {
    arrayEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    let n = 0;
    for (let i = 0; i < a; i++) {
      const row = document.createElement("div");
      row.className = "row";
      for (let j = 0; j < b; j++) {
        const d = document.createElement("div");
        d.className = "dot";
        d.style.animationDelay = (n * 0.012) + "s";
        row.appendChild(d);
        n++;
      }
      frag.appendChild(row);
    }
    arrayEl.appendChild(frag);
  }

  function showFact(e) {
    faEl.textContent = e.a;
    fbEl.textContent = e.b;
    fcEl.textContent = e.c;
    // retrigger pop animation
    eqEl.classList.remove("pop");
    void eqEl.offsetWidth;
    eqEl.classList.add("pop");

    lyricEl.classList.remove("enc");
    lyricEl.textContent = `${e.a} ganger ${e.b} er ${e.c}`;

    renderArray(e.a, e.b);

    // background hue follows the current table
    if (hues[e.a] != null) document.body.style.setProperty("--tableHue", hues[e.a]);

    // grid: highlight active, mark solved
    document.querySelectorAll(".grid .g.active").forEach(g => { g.classList.remove("active"); g.style.transform = ""; });
    const cell = gridCells[e.a + "-" + e.b];
    if (cell) { cell.classList.add("solved", "active"); }
    // also reflect the commutative twin softly as solved
    const twin = gridCells[e.b + "-" + e.a];
    if (twin) twin.classList.add("solved");

    // chips
    Object.values(chipEls).forEach(c => c.classList.remove("active"));
    if (chipEls[e.a]) {
      chipEls[e.a].classList.add("active", "done");
      // mark earlier tables done
      tables.forEach(t => { if (t < e.a && chipEls[t]) chipEls[t].classList.add("done"); });
    }
  }

  function showEnc(e) {
    lyricEl.classList.add("enc");
    lyricEl.textContent = e.text;
    // keep last equation & array on screen during the cheer line
    document.querySelectorAll(".grid .g.active").forEach(g => g.classList.remove("active"));
  }

  // ----- timeline driving (audio.currentTime is the source of truth) -----
  let activeIdx = -1;

  function activeEventIndex(t) {
    // last event whose start <= t
    let idx = -1;
    const tl = DATA.timeline;
    for (let i = 0; i < tl.length; i++) {
      if (tl[i].t <= t) idx = i; else break;
    }
    return idx;
  }

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function frame() {
    const t = audio.currentTime;
    const dur = audio.duration || DATA.duration;

    progressFill.style.width = (100 * t / dur) + "%";
    timeEl.textContent = fmt(t) + " / " + fmt(dur);

    const idx = activeEventIndex(t);
    if (idx !== activeIdx && idx >= 0) {
      activeIdx = idx;
      const e = DATA.timeline[idx];
      if (e.type === "fact") showFact(e); else showEnc(e);
    } else if (idx < 0 && activeIdx !== -1) {
      // before first lyric (intro) — reset
      activeIdx = -1;
    }
    requestAnimationFrame(frame);
  }

  // =====================================================================
  //  OFFLINE VIDEO EXPORTER
  //  Everything below renders a deterministic visual state for a given
  //  *global* video time, so frames can be captured one-by-one for an MP4.
  //  Unlike the live page (which uses CSS animations), the video path
  //  drives every animation from time, so it is reproducible per frame.
  // =====================================================================
  const INTRO = (DATA.intro != null ? DATA.intro : 4.0);   // seconds
  const OUTRO = (DATA.outro != null ? DATA.outro : 6.0);    // seconds
  window.VIDEO_TOTAL = INTRO + DATA.duration + OUTRO;

  const introEl = document.getElementById("intro");
  const outroEl = document.getElementById("outro");

  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const ramp = (p, a, b) => clamp01((p - a) / (b - a));
  const easeOutCubic = x => 1 - Math.pow(1 - x, 3);
  const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  // build floating notes once (deterministic positions)
  (function buildNotes() {
    const host = document.getElementById("introNotes");
    if (!host) return;
    const glyphs = ["✕", "➕", "🎵", "7", "8", "9", "🎶", "3", "6"];
    const pos = [[6, 70], [16, 22], [30, 80], [42, 14], [58, 78], [70, 20], [82, 68], [90, 30], [50, 90]];
    glyphs.forEach((g, i) => {
      const n = document.createElement("div");
      n.className = "n";
      n.textContent = g;
      n.style.left = pos[i][0] + "%";
      n.style.top = pos[i][1] + "%";
      host.appendChild(n);
    });
  })();

  function ensureRenderMode() {
    document.body.classList.add("render");
    if (!startOverlay.classList.contains("hide")) {
      startOverlay.classList.add("hide");
      stage.setAttribute("aria-hidden", "false");
      stage.classList.add("live");
    }
  }
  function showScene(which) {
    introEl.classList.toggle("show", which === "intro");
    outroEl.classList.toggle("show", which === "outro");
    stage.style.opacity = which === "main" ? "1" : "0";
  }

  // ---- intro ----
  function renderIntro(p) {
    showScene("intro");
    document.body.style.setProperty("--tableHue", 265);
    const fade = 1 - ramp(p, 0.9, 1.0);                 // fade scene out at the end
    introEl.style.opacity = fade;
    const k = document.getElementById("introKicker");
    const ti = document.getElementById("introTitle");
    const su = document.getElementById("introSub");
    k.style.opacity = ramp(p, 0.05, 0.25);
    k.style.transform = `translateY(${(1 - easeOutCubic(ramp(p, 0.05, 0.3))) * 18}px)`;
    const ts = 0.8 + 0.2 * easeOutBack(ramp(p, 0.1, 0.5));
    ti.style.opacity = ramp(p, 0.1, 0.4);
    ti.style.transform = `scale(${ts})`;
    su.style.opacity = ramp(p, 0.42, 0.72);
    su.style.transform = `translateY(${(1 - easeOutCubic(ramp(p, 0.42, 0.75))) * 14}px)`;
    document.querySelectorAll("#introNotes .n").forEach((n, i) => {
      const start = 0.15 + (i % 5) * 0.06;
      const a = ramp(p, start, start + 0.4);
      n.style.opacity = (0.5 * a * (1 - ramp(p, 0.85, 1))).toFixed(3);
      n.style.transform = `translateY(${(1 - easeOutCubic(a)) * 40 - p * 18}px)`;
    });
  }

  // ---- outro ----
  function renderOutro(p) {
    showScene("outro");
    document.body.style.setProperty("--tableHue", 150);
    outroEl.style.opacity = ramp(p, 0.0, 0.15);
    const em = document.getElementById("outroEmoji");
    const ti = document.getElementById("outroTitle");
    const su = document.getElementById("outroSub");
    const cta = document.getElementById("outroCta");
    em.style.transform = `scale(${0.5 + 0.5 * easeOutBack(ramp(p, 0.05, 0.45))})`;
    em.style.opacity = ramp(p, 0.05, 0.3);
    ti.style.opacity = ramp(p, 0.15, 0.45);
    ti.style.transform = `scale(${0.85 + 0.15 * easeOutBack(ramp(p, 0.15, 0.55))})`;
    su.style.opacity = ramp(p, 0.4, 0.65);
    cta.style.opacity = ramp(p, 0.6, 0.85);
    cta.style.transform = `translateY(${(1 - easeOutCubic(ramp(p, 0.6, 0.9))) * 16}px)`;
  }

  // ---- main (time within the song) with per-frame animation ----
  let vLastIdx = -2;
  let vDots = [];
  function renderMain(t) {
    showScene("main");
    const dur = DATA.duration;
    progressFill.style.width = (100 * Math.min(t, dur) / dur) + "%";
    timeEl.textContent = fmt(t) + " / " + fmt(dur);

    const idx = activeEventIndex(t);
    if (idx < 0) { return; }
    const e = DATA.timeline[idx];

    if (idx !== vLastIdx) {            // event changed → set up content
      vLastIdx = idx;
      if (e.type === "fact") {
        showFact(e);
        vDots = Array.from(arrayEl.querySelectorAll(".dot"));
      } else {
        showEnc(e);
        vDots = [];
      }
    }

    const age = t - e.t;
    if (e.type === "fact") {
      // result number pops in
      const rp = easeOutBack(clamp01(age / 0.42));
      fcEl.style.transform = `scale(${0.3 + 0.7 * rp})`;
      fcEl.style.opacity = clamp01(age / 0.18).toFixed(3);
      // factors settle
      const fp = easeOutCubic(clamp01(age / 0.3));
      faEl.style.transform = fbEl.style.transform = `translateY(${(1 - fp) * 8}px)`;
      // dots reveal in a stagger
      const per = 0.02, grow = 0.16;
      for (let i = 0; i < vDots.length; i++) {
        const da = clamp01((age - i * per) / grow);
        vDots[i].style.transform = `scale(${easeOutBack(da)})`;
      }
      // active grid cell gentle pulse
      const cell = gridEl.querySelector(".g.active");
      if (cell) cell.style.transform = `scale(${1.18 + 0.06 * Math.sin(age * 6)})`;
    } else {
      // cheer line: keep equation, give the lyric a soft pulse
      lyricEl.style.transform = `scale(${1 + 0.04 * Math.sin(age * 5)})`;
    }
  }

  // ---- master entry point: global video time → frame ----
  window.renderVideo = function (gt) {
    ensureRenderMode();
    if (gt < INTRO) { renderIntro(gt / INTRO); return; }
    const mt = gt - INTRO;
    if (mt < DATA.duration) { renderMain(mt); return; }
    renderOutro((mt - DATA.duration) / OUTRO);
  };

  // back-compat: render a single main-timeline moment (frozen style)
  window.renderAt = function (t) { ensureRenderMode(); renderMain(t); };

  // ----- controls -----
  function begin() {
    startOverlay.classList.add("hide");
    stage.setAttribute("aria-hidden", "false");
    stage.classList.add("live");
    audio.currentTime = 0;
    audio.play().catch(() => {});
    requestAnimationFrame(frame);
  }
  startBtn.addEventListener("click", begin);

  toggleBtn.addEventListener("click", () => {
    if (audio.paused) { audio.play(); toggleBtn.textContent = "❚❚"; }
    else { audio.pause(); toggleBtn.textContent = "▶"; }
  });
  audio.addEventListener("play", () => toggleBtn.textContent = "❚❚");
  audio.addEventListener("pause", () => toggleBtn.textContent = "▶");

  // seek by clicking the progress bar
  progress.addEventListener("click", (ev) => {
    const r = progress.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    audio.currentTime = frac * (audio.duration || DATA.duration);
    activeIdx = -1; // force re-resolve
  });

  // allow Space to start/toggle
  document.addEventListener("keydown", (ev) => {
    if (ev.code === "Space") {
      ev.preventDefault();
      if (!startOverlay.classList.contains("hide")) begin();
      else toggleBtn.click();
    }
  });
})();
