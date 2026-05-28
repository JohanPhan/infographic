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
  const hues = { 1: 265, 2: 200, 3: 160, 4: 35, 5: 320, 6: 0, 7: 95 };

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
    document.querySelectorAll(".grid .g.active").forEach(g => g.classList.remove("active"));
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
