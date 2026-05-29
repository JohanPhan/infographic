(function () {
  "use strict";
  const DATA = window.SONG_DATA;
  const audio = document.getElementById("audio");
  const PALETTE = ["#ff5caa", "#ffa63d", "#ffe66d", "#33d6a6", "#4db8ff", "#b06bff"];
  const CONF = ["#ff5caa", "#ffa63d", "#ffe66d", "#33d6a6", "#4db8ff", "#b06bff", "#ffffff"];
  const MASCOTS = ["⭐", "🎈", "🦄", "🐸", "🚀", "🌟"];

  // refs
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
  const opEl = eqEl.querySelector(".op");
  const eqSign = eqEl.querySelector(".eq");
  const arrayEl = document.getElementById("array");
  const countRow = document.getElementById("countRow");
  const tableBadge = document.getElementById("tableBadge");
  const modeBadge = document.getElementById("modeBadge");
  const progressFill = document.getElementById("progressFill");
  const timeEl = document.getElementById("time");
  const mascotEl = document.getElementById("mascot");
  const bg = document.getElementById("bg"), bx = bg.getContext("2d");
  const fx = document.getElementById("fx"), fxc = fx.getContext("2d");

  // easing
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const ramp = (p, a, b) => clamp01((p - a) / (b - a));
  const eOutBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const eOutCubic = x => 1 - Math.pow(1 - x, 3);
  const eOutElastic = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  function resize() {
    [bg, fx].forEach(c => { c.width = window.innerWidth; c.height = window.innerHeight; });
  }
  window.addEventListener("resize", resize); resize();

  // ---------- deterministic PRNG (so bursts look the same every render) ----------
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- particle system ----------
  let parts = [];
  function burst(x, y, n, power, seed) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const ang = r() * Math.PI * 2;
      const spd = power * (0.4 + r() * 0.9);
      parts.push({
        x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - power * 0.5,
        g: 900 + r() * 500, life: 0, max: 0.9 + r() * 0.8,
        col: CONF[(i + (seed | 0)) % CONF.length], rot: r() * 6.28, vr: (r() - 0.5) * 14,
        sz: 7 + r() * 9, shape: r() < 0.5 ? 0 : 1
      });
    }
    if (parts.length > 1400) parts = parts.slice(-1400);
  }
  function updateDrawParts(dt) {
    fxc.clearRect(0, 0, fx.width, fx.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.life >= p.max) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const a = 1 - p.life / p.max;
      fxc.save(); fxc.globalAlpha = clamp01(a * 1.4); fxc.translate(p.x, p.y); fxc.rotate(p.rot);
      fxc.fillStyle = p.col;
      if (p.shape === 0) fxc.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz * 0.6);
      else { fxc.beginPath(); fxc.arc(0, 0, p.sz / 2, 0, 6.28); fxc.fill(); }
      fxc.restore();
    }
  }

  // ---------- animated background + sparkles ----------
  const SHAPES = ["⭐", "✖️", "🎵", "💛", "➕", "🎶", "🌈", "💫"];
  function paintBg(t, beat) {
    const W = bg.width, H = bg.height;
    const h = (t * 10) % 360;
    const pulse = 1 + beat * 0.04;
    const g = bx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${h},80%,${58 + beat * 6}%)`);
    g.addColorStop(0.5, `hsl(${(h + 45) % 360},78%,${52 + beat * 5}%)`);
    g.addColorStop(1, `hsl(${(h + 95) % 360},74%,${46 + beat * 5}%)`);
    bx.fillStyle = g; bx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.3 + 0.4 * Math.sin(t * 0.3 + i * 2));
      const cy = H * (0.4 + 0.3 * Math.cos(t * 0.25 + i * 1.7));
      const rad = bx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.55 * pulse);
      rad.addColorStop(0, `hsla(${(h + 180 + i * 40) % 360},90%,72%,.32)`);
      rad.addColorStop(1, "hsla(0,0%,100%,0)");
      bx.fillStyle = rad; bx.fillRect(0, 0, W, H);
    }
    // twinkling sparkles
    bx.fillStyle = "#fff";
    for (let i = 0; i < 60; i++) {
      const x = ((i * 211.3) % W), y = ((i * 137.9 + i * i * 7.1) % H);
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
      bx.globalAlpha = 0.10 + 0.35 * tw;
      const s = 1 + 2.5 * tw;
      bx.fillRect(x, y, s, s);
    }
    bx.globalAlpha = 1;
    // floating glyphs
    bx.textAlign = "center"; bx.textBaseline = "middle";
    for (let i = 0; i < SHAPES.length; i++) {
      const spd = 16 + (i % 4) * 8;
      const x = ((i * 197 + t * spd) % (W + 140)) - 70;
      const y = (H * ((i * 0.151) % 1)) + Math.sin(t * 0.8 + i) * 30;
      bx.globalAlpha = 0.26; bx.font = (28 + (i % 3) * 16) + "px serif";
      bx.fillText(SHAPES[i], x, y);
    }
    bx.globalAlpha = 1;
  }

  // ---------- equation fit ----------
  let EQ_SCALE = null;
  function fitEquation() {
    if (EQ_SCALE === null) {
      const a = faEl.textContent, b = fbEl.textContent, c = fcEl.textContent;
      eqEl.style.transform = "none";
      faEl.textContent = "4"; fbEl.textContent = "9"; fcEl.textContent = "36";
      const avail = Math.min(window.innerWidth * 0.86, factView.clientWidth || window.innerWidth);
      const w = eqEl.scrollWidth;
      EQ_SCALE = w > 0 ? Math.min(1, (avail - 12) / w) : 1;
      faEl.textContent = a; fbEl.textContent = b; fcEl.textContent = c;
    }
  }

  function buildBubbles(a, b) {
    arrayEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    let n = 0;
    for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) {
      const d = document.createElement("div");
      d.className = "b"; d.style.background = PALETTE[n % PALETTE.length];
      frag.appendChild(d); n++;
    }
    arrayEl.appendChild(frag);
    return Array.from(arrayEl.children);
  }
  function buildCountRow(seq) {
    countRow.innerHTML = "";
    const frag = document.createDocumentFragment();
    seq.forEach((v, i) => {
      const d = document.createElement("div");
      d.className = "num"; d.textContent = v;
      d.style.background = PALETTE[i % PALETTE.length] + "cc";
      frag.appendChild(d);
    });
    countRow.appendChild(frag);
    return Array.from(countRow.children);
  }

  function activeEventIndex(t) {
    let idx = -1; const tl = DATA.timeline;
    for (let i = 0; i < tl.length; i++) { if (tl[i].t <= t) idx = i; else break; }
    return idx;
  }
  function setView(which) {
    factView.classList.toggle("on", which === "fact");
    chorusView.classList.toggle("on", which === "chorus");
    mascotEl.classList.toggle("show", which === "chorus");
  }

  // ---------- main ----------
  let vLastIdx = -2, vBubbles = [], vNums = [], curTable = 2;
  function onEventStart(e, idx) {
    if (e.type === "fact") {
      setView("fact"); curTable = e.a;
      faEl.textContent = e.a; fbEl.textContent = e.b; fcEl.textContent = e.c;
      faEl.style.background = PALETTE[(e.a) % PALETTE.length];
      fbEl.style.background = PALETTE[(e.b + 2) % PALETTE.length];
      tableBadge.textContent = e.a + "-gangen"; modeBadge.textContent = "✖️ Gange";
      fitEquation();
      vBubbles = buildBubbles(e.a, e.b);
      // confetti from centre on each new fact
      burst(window.innerWidth * 0.5, window.innerHeight * 0.46, 26, 520, idx * 97 + 7);
    } else {
      setView("chorus"); curTable = e.table;
      tableBadge.textContent = e.table + "-gangen"; modeBadge.textContent = "🎵 Tell med meg";
      mascotEl.textContent = MASCOTS[e.table % MASCOTS.length];
      if (!vNums.length || vNums.length !== e.seq.length || countRow.firstChild.textContent != String(e.seq[0])) {
        vNums = buildCountRow(e.seq);
      }
      vNums.forEach((el, i) => { el.classList.toggle("done", i < e.idx); el.classList.toggle("active", i === e.idx); });
      // confetti burst over the active number
      const r = vNums[e.idx].getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 22, 560, idx * 131 + 3);
    }
  }

  let stagePunch = 0;
  function renderMain(t) {
    introEl.classList.remove("show"); outroEl.classList.remove("show");
    stage.classList.add("live"); stage.style.opacity = "1";
    const dur = DATA.duration;
    progressFill.style.width = (100 * Math.min(t, dur) / dur) + "%";
    timeEl.textContent = fmt(t);

    const idx = activeEventIndex(t);
    if (idx < 0) { setView("fact"); return; }
    const e = DATA.timeline[idx];
    if (idx !== vLastIdx) { vLastIdx = idx; onEventStart(e, idx); stagePunch = t; }

    const age = t - e.t;
    // beat-punch zoom on every event
    const punch = 1 + 0.05 * Math.exp(-(t - stagePunch) * 9);
    stage.style.transform = `scale(${punch})`;

    if (e.type === "fact") {
      // operands fly in from the sides, result drops + squashes
      const ai = eOutBack(clamp01(age / 0.34)), bi = eOutBack(clamp01((age - 0.05) / 0.34));
      faEl.style.transform = `translateX(${(1 - ai) * -180}px) rotate(${(1 - ai) * -40}deg)`;
      fbEl.style.transform = `translateX(${(1 - bi) * 180}px) rotate(${(1 - bi) * 40}deg)`;
      opEl.style.opacity = clamp01((age - 0.1) / 0.2);
      eqSign.style.opacity = clamp01((age - 0.28) / 0.2);
      const rp = clamp01((age - 0.34) / 0.5);
      const squash = age - 0.34 < 0 ? 0 : 1 + 0.25 * Math.exp(-(age - 0.34) * 9) * Math.cos((age - 0.34) * 22);
      fcEl.style.opacity = rp > 0 ? 1 : 0;
      fcEl.style.transform = `scale(${eOutElastic(rp) * squash})`;
      fcEl.classList.toggle("glow", age - 0.34 > 0 && age - 0.34 < 0.5);
      eqEl.style.transform = `scale(${EQ_SCALE})`;
      // bubbles burst in
      for (let i = 0; i < vBubbles.length; i++) {
        const da = clamp01((age - 0.4 - i * 0.018) / 0.16);
        const bob = 1 + 0.13 * Math.sin(age * 5 + i);
        vBubbles[i].style.transform = `scale(${eOutBack(da) * bob})`;
        vBubbles[i].style.opacity = da > 0 ? 1 : 0;
      }
    } else {
      vNums.forEach((el, i) => {
        if (i === e.idx) {
          const pop = eOutBack(clamp01(age / 0.18));
          const b = Math.abs(Math.sin(age * 8));
          el.style.transform = `scale(${(1.1 + 0.28 * pop) + 0.1 * b}) translateY(${-10 * b}px) rotate(${Math.sin(age * 9) * 4}deg)`;
        } else {
          const wv = 1 + 0.04 * Math.sin(t * 4 + i * 0.6);   // gentle row wave
          el.style.transform = `scale(${wv})`;
        }
      });
      // mascot hops onto the active number
      const r = vNums[e.idx].getBoundingClientRect();
      const hop = Math.abs(Math.sin(age * 8));
      mascotEl.style.transform = `translate(${r.left + r.width / 2 - 27}px, ${r.top - 64 - hop * 34}px) rotate(${Math.sin(age * 10) * 12}deg) scale(${1 + 0.15 * hop})`;
    }
  }

  // ---------- intro ----------
  let introBuilt = false;
  function buildIntro() {
    if (introBuilt) return; introBuilt = true;
    const t = document.getElementById("introTitle");
    "Tosifret Rytme".split("").forEach((c, i) => {
      const s = document.createElement("span");
      s.className = "ch"; s.textContent = c === " " ? " " : c;
      s.style.color = c === " " ? "transparent" : PALETTE[i % PALETTE.length];
      t.appendChild(s);
    });
  }
  function renderIntro(p) {
    buildIntro();
    introEl.classList.add("show"); outroEl.classList.remove("show"); stage.style.opacity = "0";
    mascotEl.classList.remove("show");
    introEl.style.opacity = 1 - ramp(p, 0.9, 1);
    introEl.querySelectorAll(".ch").forEach((s, i) => {
      const st = 0.05 + i * 0.04, a = ramp(p, st, st + 0.32);
      s.style.transform = `translateY(${(1 - eOutElastic(a)) * 80}px) scale(${0.3 + 0.7 * a}) rotate(${(1 - a) * (i % 2 ? 20 : -20)}deg)`;
      s.style.opacity = clamp01(a * 2);
    });
    const sub = document.getElementById("introSub");
    sub.style.opacity = ramp(p, 0.55, 0.8);
    sub.style.transform = `scale(${0.6 + 0.4 * eOutBack(ramp(p, 0.55, 0.85))})`;
  }

  // ---------- outro ----------
  function renderOutro(p, gt) {
    outroEl.classList.add("show"); introEl.classList.remove("show"); stage.style.opacity = "0";
    mascotEl.classList.remove("show");
    outroEl.style.opacity = ramp(p, 0, 0.12);
    const em = document.getElementById("outroEmoji"), ti = document.getElementById("outroTitle");
    const su = document.getElementById("outroSub"), cta = document.getElementById("outroCta");
    em.style.transform = `scale(${0.4 + 0.6 * eOutBack(ramp(p, 0.05, 0.45))}) rotate(${Math.sin(gt * 4) * 12}deg)`;
    ti.style.transform = `scale(${0.7 + 0.3 * eOutBack(ramp(p, 0.15, 0.55))})`;
    ti.style.opacity = ramp(p, 0.15, 0.45);
    su.style.opacity = ramp(p, 0.4, 0.65);
    cta.style.opacity = ramp(p, 0.6, 0.85);
    cta.style.transform = `translateY(${(1 - eOutCubic(ramp(p, 0.6, 0.9))) * 18}px)`;
    // celebratory confetti rain
    if (!renderOutro._last || gt - renderOutro._last > 0.18) {
      renderOutro._last = gt;
      burst(window.innerWidth * (0.2 + 0.6 * (p % 1)), -10, 16, 420, Math.floor(gt * 7));
      parts.forEach(pp => { if (pp.life === 0) pp.vy = Math.abs(pp.vy) * 0.3 + 120; });
    }
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
  let prevGt = null;
  window.renderVideo = function (gt) {
    ensureRender();
    let dt = prevGt == null ? 1 / 24 : gt - prevGt; prevGt = gt;
    if (dt < 0 || dt > 0.5) dt = 1 / 24;       // reset on seek
    const beat = beatPulse(gt);
    paintBg(gt, beat);
    if (gt < INTRO) renderIntro(gt / INTRO);
    else if (gt - INTRO < DATA.duration) renderMain(gt - INTRO);
    else renderOutro((gt - INTRO - DATA.duration) / OUTRO, gt);
    updateDrawParts(dt);
  };

  // beat pulse from nearest recent event onset (in main only)
  function beatPulse(gt) {
    const mt = gt - INTRO;
    if (mt < 0 || mt > DATA.duration) return 0.3 * Math.max(0, Math.sin(gt * 3));
    const idx = activeEventIndex(mt);
    if (idx < 0) return 0;
    return Math.exp(-(mt - DATA.timeline[idx].t) * 7);
  }

  // ---------- live ----------
  function frame() {
    const t = audio.currentTime;
    window.renderVideo(t + INTRO);   // reuse the same pipeline (minus the render-mode lock is fine)
    requestAnimationFrame(frame);
  }
  function begin() {
    startOverlay.classList.add("hide");
    stage.setAttribute("aria-hidden", "false"); stage.classList.add("live");
    prevGt = null; audio.currentTime = 0; audio.play().catch(() => {});
    requestAnimationFrame(frame);
  }
  startBtn.addEventListener("click", begin);
  document.addEventListener("keydown", e => {
    if (e.code === "Space") { e.preventDefault(); if (!startOverlay.classList.contains("hide")) begin(); else (audio.paused ? audio.play() : audio.pause()); }
  });
})();
