(function () {
  "use strict";
  const DATA = window.SONG_DATA;
  const audio = document.getElementById("audio");
  const PALETTE = ["#ff5caa", "#ffa63d", "#ffe66d", "#33d6a6", "#4db8ff", "#b06bff"];

  // element refs
  const startOverlay = document.getElementById("start");
  const startBtn = document.getElementById("startBtn");
  const stage = document.getElementById("stage");
  const introEl = document.getElementById("intro");
  const outroEl = document.getElementById("outro");
  const factView = document.getElementById("factView");
  const chorusView = document.getElementById("chorusView");
  const eqEl = document.getElementById("factEq");
  const faEl = eqEl.querySelector(".fa");
  const fbEl = eqEl.querySelector(".fb");
  const fcEl = eqEl.querySelector(".fc");
  const arrayEl = document.getElementById("array");
  const countRow = document.getElementById("countRow");
  const tableBadge = document.getElementById("tableBadge");
  const modeBadge = document.getElementById("modeBadge");
  const progressFill = document.getElementById("progressFill");
  const timeEl = document.getElementById("time");
  const canvas = document.getElementById("bg");
  const ctx = canvas.getContext("2d");

  // easing helpers
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const ramp = (p, a, b) => clamp01((p - a) / (b - a));
  const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const easeOutCubic = x => 1 - Math.pow(1 - x, 3);
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  // ---------- canvas sizing ----------
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  // ---------- animated playful background ----------
  const SHAPES = ["⭐", "✖️", "🎵", "💛", "➕", "🎶", "🌈", "💫", "🔵", "🟣"];
  function paintBg(t) {
    const W = canvas.width, H = canvas.height;
    const h = (t * 8) % 360;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${h},78%,58%)`);
    g.addColorStop(0.5, `hsl(${(h + 40) % 360},75%,52%)`);
    g.addColorStop(1, `hsl(${(h + 90) % 360},72%,46%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // soft moving blobs
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.3 + 0.4 * Math.sin(t * 0.3 + i * 2));
      const cy = H * (0.4 + 0.3 * Math.cos(t * 0.25 + i * 1.7));
      const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.5);
      rad.addColorStop(0, `hsla(${(h + 180 + i * 40) % 360},90%,70%,.30)`);
      rad.addColorStop(1, "hsla(0,0%,100%,0)");
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, W, H);
    }
    // floating shapes
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 0; i < SHAPES.length; i++) {
      const spd = 14 + (i % 4) * 7;
      const x = ((i * 173 + t * spd) % (W + 120)) - 60;
      const y = (H * ((i * 0.131) % 1)) + Math.sin(t * 0.8 + i) * 26;
      const sz = 26 + (i % 3) * 16;
      ctx.globalAlpha = 0.30;
      ctx.font = sz + "px serif";
      ctx.fillText(SHAPES[i], x, y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- equation fit (single line) ----------
  let EQ_SCALE = null;
  function fitEquation() {
    if (EQ_SCALE === null) {
      const a = faEl.textContent, b = fbEl.textContent, c = fcEl.textContent;
      eqEl.style.transform = "none";
      faEl.textContent = "4"; fbEl.textContent = "9"; fcEl.textContent = "36";
      const avail = Math.min(window.innerWidth * 0.9, factView.clientWidth || window.innerWidth);
      const w = eqEl.scrollWidth;
      EQ_SCALE = w > 0 ? Math.min(1, (avail - 12) / w) : 1;
      faEl.textContent = a; fbEl.textContent = b; fcEl.textContent = c;
    }
  }

  // ---------- bubbles for a fact ----------
  function buildBubbles(a, b) {
    arrayEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    let n = 0;
    for (let i = 0; i < a; i++) {
      for (let j = 0; j < b; j++) {
        const d = document.createElement("div");
        d.className = "b";
        d.style.background = PALETTE[n % PALETTE.length];
        d.dataset.k = n;
        frag.appendChild(d);
        n++;
      }
    }
    arrayEl.appendChild(frag);
    return Array.from(arrayEl.children);
  }

  // ---------- count row ----------
  function buildCountRow(seq) {
    countRow.innerHTML = "";
    const frag = document.createDocumentFragment();
    seq.forEach((v, i) => {
      const d = document.createElement("div");
      d.className = "num";
      d.textContent = v;
      d.style.background = PALETTE[i % PALETTE.length] + "cc";
      frag.appendChild(d);
    });
    countRow.appendChild(frag);
    return Array.from(countRow.children);
  }

  // ---------- timeline lookup ----------
  function activeEventIndex(t) {
    let idx = -1;
    const tl = DATA.timeline;
    for (let i = 0; i < tl.length; i++) { if (tl[i].t <= t) idx = i; else break; }
    return idx;
  }

  function setView(which) {
    factView.classList.toggle("on", which === "fact");
    chorusView.classList.toggle("on", which === "chorus");
  }

  // ---------- main render ----------
  let vLastIdx = -2, vBubbles = [], vNums = [];
  function renderMain(t) {
    introEl.classList.remove("show");
    outroEl.classList.remove("show");
    stage.classList.add("live");
    stage.style.opacity = "1";
    const dur = DATA.duration;
    progressFill.style.width = (100 * Math.min(t, dur) / dur) + "%";
    timeEl.textContent = fmt(t);

    const idx = activeEventIndex(t);
    if (idx < 0) { setView("fact"); return; }
    const e = DATA.timeline[idx];

    if (idx !== vLastIdx) {
      vLastIdx = idx;
      if (e.type === "fact") {
        setView("fact");
        faEl.textContent = e.a; fbEl.textContent = e.b; fcEl.textContent = e.c;
        const col = PALETTE[(e.a - 2 + 6) % PALETTE.length];
        faEl.style.background = col;
        tableBadge.textContent = e.a + "-gangen";
        modeBadge.textContent = "✖️ Gange";
        fitEquation();
        vBubbles = buildBubbles(e.a, e.b);
      } else { // count
        setView("chorus");
        tableBadge.textContent = e.table + "-gangen";
        modeBadge.textContent = "🎵 Tell med meg";
        if (!vNums.length || vNums.length !== e.seq.length || countRow.firstChild.textContent != e.seq[0]) {
          vNums = buildCountRow(e.seq);
        }
        vNums.forEach((el, i) => {
          el.classList.toggle("done", i < e.idx);
          el.classList.toggle("active", i === e.idx);
        });
      }
    }

    const age = t - e.t;
    if (e.type === "fact") {
      eqEl.style.transform = `scale(${EQ_SCALE * (1 + 0.05 * Math.exp(-age * 4) * Math.cos(age * 18))})`;
      const rp = easeOutBack(clamp01(age / 0.4));
      fcEl.style.transform = `scale(${0.2 + 0.8 * rp})`;
      fcEl.style.opacity = clamp01(age / 0.16);
      for (let i = 0; i < vBubbles.length; i++) {
        const da = clamp01((age - i * 0.02) / 0.18);
        const bob = 1 + 0.12 * Math.sin(age * 5 + i);
        vBubbles[i].style.transform = `scale(${easeOutBack(da) * bob})`;
        vBubbles[i].style.opacity = da > 0 ? 1 : 0;
      }
    } else {
      // active number bounces; whole row keeps a gentle wiggle
      vNums.forEach((el, i) => {
        if (i === e.idx) el.style.transform = `scale(${1.15 + 0.18 * Math.abs(Math.sin(age * 7))}) translateY(${-8 * Math.abs(Math.sin(age * 7))}px)`;
        else el.style.transform = "scale(1)";
      });
    }
  }

  // ---------- intro ----------
  let introBuilt = false;
  function buildIntro() {
    if (introBuilt) return; introBuilt = true;
    const t = document.getElementById("introTitle");
    "Tosifret Rytme".split("").forEach((c, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c === " " ? " " : c;
      s.style.color = c === " " ? "transparent" : PALETTE[i % PALETTE.length];
      t.appendChild(s);
    });
  }
  function renderIntro(p) {
    buildIntro();
    introEl.classList.add("show"); outroEl.classList.remove("show"); stage.style.opacity = "0";
    introEl.style.opacity = 1 - ramp(p, 0.9, 1);
    const chs = introEl.querySelectorAll(".ch");
    chs.forEach((s, i) => {
      const st = 0.05 + i * 0.035;
      const a = ramp(p, st, st + 0.3);
      s.style.transform = `translateY(${(1 - easeOutBack(a)) * 60}px) scale(${0.4 + 0.6 * a})`;
      s.style.opacity = a;
    });
    const sub = document.getElementById("introSub");
    sub.style.opacity = ramp(p, 0.55, 0.8);
    sub.style.transform = `scale(${0.6 + 0.4 * easeOutBack(ramp(p, 0.55, 0.85))})`;
  }

  // ---------- outro ----------
  function renderOutro(p) {
    outroEl.classList.add("show"); introEl.classList.remove("show"); stage.style.opacity = "0";
    outroEl.style.opacity = ramp(p, 0, 0.12);
    const em = document.getElementById("outroEmoji");
    const ti = document.getElementById("outroTitle");
    const su = document.getElementById("outroSub");
    const cta = document.getElementById("outroCta");
    em.style.transform = `scale(${0.4 + 0.6 * easeOutBack(ramp(p, 0.05, 0.45))}) rotate(${(1 - ramp(p, 0.05, 0.6)) * -25}deg)`;
    ti.style.transform = `scale(${0.7 + 0.3 * easeOutBack(ramp(p, 0.15, 0.55))})`;
    ti.style.opacity = ramp(p, 0.15, 0.45);
    su.style.opacity = ramp(p, 0.4, 0.65);
    cta.style.opacity = ramp(p, 0.6, 0.85);
    cta.style.transform = `translateY(${(1 - easeOutCubic(ramp(p, 0.6, 0.9))) * 18}px)`;
  }

  // ---------- master ----------
  const INTRO = DATA.intro != null ? DATA.intro : 3.5;
  const OUTRO = DATA.outro != null ? DATA.outro : 5.0;
  window.VIDEO_TOTAL = INTRO + DATA.duration + OUTRO;
  function ensureRender() {
    document.body.classList.add("render");
    startOverlay.classList.add("hide");
    stage.setAttribute("aria-hidden", "false");
  }
  window.renderVideo = function (gt) {
    ensureRender();
    paintBg(gt);
    if (gt < INTRO) { renderIntro(gt / INTRO); return; }
    const mt = gt - INTRO;
    if (mt < DATA.duration) { renderMain(mt); return; }
    renderOutro((mt - DATA.duration) / OUTRO);
  };

  // ---------- live playback ----------
  function frame() {
    const t = audio.currentTime;
    paintBg(t + INTRO);
    renderMain(t);
    requestAnimationFrame(frame);
  }
  function begin() {
    startOverlay.classList.add("hide");
    stage.setAttribute("aria-hidden", "false");
    stage.classList.add("live");
    audio.currentTime = 0; audio.play().catch(() => {});
    requestAnimationFrame(frame);
  }
  startBtn.addEventListener("click", begin);
  document.addEventListener("keydown", e => { if (e.code === "Space") { e.preventDefault(); if (!startOverlay.classList.contains("hide")) begin(); else (audio.paused ? audio.play() : audio.pause()); } });
})();
