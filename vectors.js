(function () {
  "use strict";
  // =====================================================================
  //  "Distance between two VECTORS in 3D space" — playful, kid-friendly,
  //  space-themed explainer. Deterministic render(t) for frame export.
  // =====================================================================
  const S = window.SCENES;
  const cv = document.getElementById("c");
  const ctx = cv.getContext("2d");
  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");

  // neon-on-space palette
  const INK = "#eaf2ff", MUT = "#9fb0e0";
  const VA = "#22d3ee";      // vector a  (cyan)
  const VB = "#ff5caa";      // vector b  (pink)
  const DIFF = "#ffd23f";    // b - a     (yellow)
  const RES = "#34d399";     // result    (green)
  const AX = "#ff7a7a", AY = "#7af0a8", AZ = "#7aa8ff";

  let W = 1280, H = 720;
  function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  window.addEventListener("resize", resize); resize();

  const c01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const rmp = (t, a, b) => c01((t - a) / (b - a));
  const eo3 = x => 1 - Math.pow(1 - x, 3);
  const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const ebk = x => { const c1 = 2.0, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const eel = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (2.0944)) + 1;

  function cam(yaw, pitch, dist, cx, cy, scale) {
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return function (x, y, z) {
      const x1 = x * cyw - y * syw, y1 = x * syw + y * cyw;
      const depth = y1 * cp - z * sp, up = y1 * sp + z * cp;
      const f = dist / (dist + depth);
      return [cx + scale * f * x1, cy - scale * f * up, f];
    };
  }

  function line(p, q, col, w, dash, prog) {
    prog = prog == null ? 1 : prog; if (prog <= 0) return;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + (q[0] - p[0]) * prog, p[1] + (q[1] - p[1]) * prog);
    ctx.stroke(); ctx.restore();
  }
  function arrowHead(p, q, col, sz) {
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    ctx.save(); ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    ctx.lineTo(q[0] - sz * Math.cos(a - .42), q[1] - sz * Math.sin(a - .42));
    ctx.lineTo(q[0] - sz * Math.cos(a + .42), q[1] - sz * Math.sin(a + .42));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // a 3D vector arrow from p to q with glow + grow progress
  function vecArrow(p, q, col, w, prog, glow) {
    prog = prog == null ? 1 : c01(prog); if (prog <= 0) return;
    const tip = [p[0] + (q[0] - p[0]) * prog, p[1] + (q[1] - p[1]) * prog];
    ctx.save();
    if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    arrowHead(p, tip, col, w * 4.2);
    ctx.restore();
  }
  function dot(p, r, col, glow) {
    ctx.save(); if (glow) { ctx.shadowColor = col; ctx.shadowBlur = glow; }
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.283); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(p[0] - r * .3, p[1] - r * .3, r * .32, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function txt(s, x, y, size, col, align, bold, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : c01(alpha);
    ctx.fillStyle = col || INK;
    ctx.font = (bold === false ? "" : "900 ") + size + "px 'Trebuchet MS','Segoe UI',sans-serif";
    ctx.textAlign = align || "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y); ctx.restore();
  }
  function emoji(s, x, y, size, alpha, rot) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : c01(alpha);
    ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.font = size + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s, 0, 0); ctx.restore();
  }
  function tokens(list, x, y, size, doDraw, alpha) {
    let w = 0; ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = alpha == null ? 1 : c01(alpha);
    for (const tk of list) {
      ctx.font = "900 " + size + "px 'Trebuchet MS',sans-serif";
      const tw = ctx.measureText(tk.s).width;
      if (doDraw) { ctx.fillStyle = tk.c || INK; ctx.fillText(tk.s, x + w, y); }
      w += tw;
      if (tk.sup) {
        ctx.font = "900 " + (size * .6) + "px 'Trebuchet MS',sans-serif";
        const sw = ctx.measureText(tk.sup).width;
        if (doDraw) { ctx.fillStyle = tk.c || INK; ctx.fillText(tk.sup, x + w + 1, y - size * .42); }
        w += sw + 2;
      }
    }
    ctx.restore(); return w;
  }
  function sqrtExpr(list, x, y, size, col, alpha, prog) {
    alpha = alpha == null ? 1 : c01(alpha); if (alpha <= 0) return 0;
    const inner = size * 0.78, contentW = tokens(list, 0, -9999, inner, false), lw = Math.max(3, size * .08);
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col || INK; ctx.lineWidth = lw;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const topY = y - size * 0.95;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.38); ctx.lineTo(x + size * 0.14, y - size * 0.44);
    ctx.lineTo(x + size * 0.30, y + size * 0.12); ctx.lineTo(x + size * 0.52, topY);
    ctx.lineTo(x + size * 0.52 + (contentW + size * 0.22) * (prog == null ? 1 : c01(prog)), topY);
    ctx.stroke(); ctx.restore();
    tokens(list, x + size * 0.62, y - size * 0.12, inner, true, alpha);
    return size * 0.52 + contentW + size * 0.22;
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function confetti(t0, t, cx, cy, n, seed) {
    const age = t - t0; if (age < 0 || age > 2.4) return;
    const r = rng(seed), cols = [VA, VB, DIFF, RES, "#a78bfa", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, sp = 200 + r() * 380, g = 480 + r() * 300;
      const x = cx + Math.cos(a) * sp * age, y = cy + Math.sin(a) * sp * age * .8 + .5 * g * age * age - 170 * age;
      const al = c01(1.7 - age * .85);
      ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = cols[i % cols.length];
      ctx.translate(x, y); ctx.rotate(a + age * (3 + r() * 5)); const s2 = 6 + r() * 8;
      if (i % 2) ctx.fillRect(-s2 / 2, -s2 / 3, s2, s2 * .66); else { ctx.beginPath(); ctx.arc(0, 0, s2 / 2, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
  }

  // ---------- space background (starfield + nebula + planets) ----------
  const STAR = []; (function () { const r = rng(99); for (let i = 0; i < 150; i++) STAR.push([r(), r(), r()]); })();
  function bgPaint(gt) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1140"); g.addColorStop(.55, "#0a0c33"); g.addColorStop(1, "#140a30");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // nebula blobs
    for (let i = 0; i < 2; i++) {
      const cx = W * (.25 + .5 * i + .08 * Math.sin(gt * .2 + i)), cy = H * (.3 + .4 * i);
      const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * .42);
      rad.addColorStop(0, i ? "rgba(255,92,170,0.10)" : "rgba(34,211,238,0.10)");
      rad.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rad; ctx.fillRect(0, 0, W, H);
    }
    // stars
    for (let i = 0; i < STAR.length; i++) {
      const s = STAR[i], x = s[0] * W, y = s[1] * H, tw = .5 + .5 * Math.sin(gt * 2 + s[2] * 30);
      ctx.globalAlpha = .25 + .6 * tw * s[2]; ctx.fillStyle = "#fff";
      const r = .6 + 2.0 * s[2] * tw; ctx.fillRect(x, y, r, r);
    }
    ctx.globalAlpha = 1;
    // a friendly planet bottom-left
    const px = W * .12, py = H * .9, pr = 90;
    const pg = ctx.createRadialGradient(px - 25, py - 25, 10, px, py, pr);
    pg.addColorStop(0, "#ffb86b"); pg.addColorStop(1, "#c05621");
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "rgba(255,210,120,.5)"; ctx.lineWidth = 6;
    ctx.save(); ctx.translate(px, py); ctx.rotate(-.4); ctx.scale(1, .32);
    ctx.beginPath(); ctx.arc(0, 0, pr + 26, 0, 6.283); ctx.stroke(); ctx.restore();
  }

  function axes3d(P, len, alphaA, grid, gAlpha) {
    if (grid) {
      ctx.save(); ctx.globalAlpha = c01(gAlpha == null ? 1 : gAlpha);
      ctx.strokeStyle = "rgba(160,176,224,0.18)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= grid; i++) { let a = P(i, 0, 0), b = P(i, grid, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); a = P(0, i, 0); b = P(grid, i, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke(); ctx.restore();
    }
    const o = P(0, 0, 0), ex = P(len, 0, 0), ey = P(0, len, 0), ez = P(0, 0, len);
    ctx.save(); ctx.globalAlpha = c01(alphaA == null ? 1 : alphaA);
    line(o, ex, AX, 2.5); arrowHead(o, ex, AX, 9); line(o, ey, AY, 2.5); arrowHead(o, ey, AY, 9);
    line(o, ez, AZ, 2.5); arrowHead(o, ez, AZ, 9);
    txt("x", ex[0] + 15, ex[1] + 6, 20, AX); txt("y", ey[0] + 13, ey[1] - 7, 20, AY); txt("z", ez[0] - 2, ez[1] - 12, 20, AZ);
    ctx.restore();
  }
  function deltaBox(P, A, B, prog) {
    const xs = [A[0], B[0]], ys = [A[1], B[1]], zs = [A[2], B[2]], C = (i, j, k) => P(xs[i], ys[j], zs[k]);
    ctx.save(); ctx.globalAlpha = c01(prog); ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
    const E = [[[0,0,0],[1,0,0]],[[0,1,0],[1,1,0]],[[0,0,1],[1,0,1]],[[0,1,1],[1,1,1]],[[0,0,0],[0,1,0]],[[1,0,0],[1,1,0]],[[0,0,1],[0,1,1]],[[1,0,1],[1,1,1]],[[0,0,0],[0,0,1]],[[1,0,0],[1,0,1]],[[0,1,0],[0,1,1]],[[1,1,0],[1,1,1]]];
    ctx.beginPath(); for (const [a, b] of E) { const p = C(...a), q = C(...b); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); } ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    return C;
  }

  const R = {};

  // 1. TITLE
  R.title = function (t, p, gt) {
    const yaw = -0.75 + 0.12 * Math.sin(gt * .4), P = cam(yaw, .42, 9, W * .68, H * .58, 62);
    axes3d(P, 3.2, rmp(t, .2, .9), 4, rmp(t, .2, .9) * .7);
    const O = P(0, 0, 0), A3 = [2.4, 0.7, 0.5], B3 = [1.0, 2.4, 2.6];
    const ta = P(...A3), tb = P(...B3);
    vecArrow(O, ta, VA, 5, eo3(rmp(t, 1.0, 1.9)), true);
    vecArrow(O, tb, VB, 5, eo3(rmp(t, 1.5, 2.4)), true);
    if (t > 1.9) { dot(ta, 9, VA, 14); txt("a", ta[0] + 16, ta[1] + 6, 26, VA, "center", true, rmp(t, 1.9, 2.4)); }
    if (t > 2.4) { dot(tb, 9, VB, 14); txt("b", tb[0] + 14, tb[1] - 12, 26, VB, "center", true, rmp(t, 2.4, 2.9)); }
    const qa = rmp(t, 3.0, 3.6);
    if (qa > 0) { line(ta, tb, DIFF, 3, [9, 8], 1); const m = [(ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2]; txt("?", m[0] + 6, m[1] - 14 - 6 * Math.sin(gt * 4), 44 * ebk(qa), DIFF, "center", true, qa); }
    // rocket zips across on entry
    const rk = rmp(t, .1, 1.4); if (rk < 1) emoji("🚀", -80 + (W + 200) * eio(rk), H * .2, 60, 1, .5);
    // title text
    const a1 = rmp(t, .5, 1.4);
    ctx.save(); ctx.translate(0, (1 - eo3(a1)) * 40);
    txt("DISTANCE BETWEEN", W * .31, H * .30, 40, DIFF, "center", true, a1);
    txt("TWO VECTORS", W * .31, H * .43, 72 * (0.9 + 0.1 * eel(rmp(t, .9, 1.9))), INK, "center", true, rmp(t, .8, 1.6));
    txt("in 3D space 🌌", W * .31, H * .54, 30, MUT, "center", true, rmp(t, 1.6, 2.4));
    ctx.restore();
  };

  // 2. VECTORS as arrows from origin
  R.vectors = function (t, p, gt) {
    const P = cam(-0.7 + .05 * Math.sin(gt * .3), .42, 10, W * .42, H * .60, 74);
    axes3d(P, 4.4, 1, 4, 1);
    const O = P(0, 0, 0), A3 = [3, 1, 0.6], B3 = [1.2, 3, 2.6];
    const ta = P(...A3), tb = P(...B3);
    txt("a vector = an arrow from the origin", W / 2, H * .12, 30, INK, "center", true, rmp(t, .3, 1.1));
    txt("O", O[0] - 16, O[1] + 20, 22, MUT, "center", true, rmp(t, .3, 1.0));
    vecArrow(O, ta, VA, 6, eo3(rmp(t, 1.4, 2.6)), true);
    if (t > 2.4) { dot(ta, 10, VA, 14); txt("a", (O[0] + ta[0]) / 2 - 14, (O[1] + ta[1]) / 2 - 12, 30, VA, "center", true, rmp(t, 2.4, 3.0)); }
    vecArrow(O, tb, VB, 6, eo3(rmp(t, 3.6, 4.8)), true);
    if (t > 4.6) { dot(tb, 10, VB, 14); txt("b", (O[0] + tb[0]) / 2 + 16, (O[1] + tb[1]) / 2 - 10, 30, VB, "center", true, rmp(t, 4.6, 5.2)); }
    // little whoosh streaks
    if (t > 1.4 && t < 2.6) emoji("✨", ta[0], ta[1], 30 + 20 * Math.sin(t * 10), rmp(t, 2.0, 2.6) * (1 - rmp(t, 2.4, 2.7)));
  };

  // 3. DIFFERENCE vector b - a
  R.diff = function (t, p, gt) {
    const P = cam(-0.7 + .05 * Math.sin(gt * .3), .42, 10, W * .42, H * .60, 74);
    axes3d(P, 4.4, .8, 4, .7);
    const O = P(0, 0, 0), A3 = [3, 1, 0.6], B3 = [1.2, 3, 2.6];
    const ta = P(...A3), tb = P(...B3);
    vecArrow(O, ta, VA, 5, 1, true); vecArrow(O, tb, VB, 5, 1, true);
    dot(ta, 9, VA, 10); dot(tb, 9, VB, 10);
    txt("a", (O[0] + ta[0]) / 2 - 12, (O[1] + ta[1]) / 2 + 22, 26, VA); txt("b", (O[0] + tb[0]) / 2 + 16, (O[1] + tb[1]) / 2 - 10, 26, VB);
    // difference vector from tip of a to tip of b
    const dp = eo3(rmp(t, 1.2, 3.0));
    vecArrow(ta, tb, DIFF, 7, dp, true);
    if (dp > 0.4) {
      const m = [(ta[0] + tb[0]) / 2, (ta[1] + tb[1]) / 2];
      // label chip
      const a2 = rmp(t, 2.2, 3.0);
      ctx.save(); ctx.globalAlpha = a2; ctx.font = "900 30px 'Trebuchet MS'";
      const lbl = "b − a"; const w = ctx.measureText(lbl).width;
      ctx.fillStyle = "rgba(255,210,63,.16)"; ctx.strokeStyle = DIFF; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(m[0] - w / 2 - 14, m[1] - 46, w + 28, 40, 12); ctx.fill(); ctx.stroke();
      txt(lbl, m[0], m[1] - 18, 30, DIFF, "center", true, a2); ctx.restore();
    }
    // rocket flies along the difference vector
    const rk = rmp(t, 3.2, 5.2);
    if (rk > 0 && rk < 1.01) {
      const rx = ta[0] + (tb[0] - ta[0]) * eio(rk), ry = ta[1] + (tb[1] - ta[1]) * eio(rk);
      const ang = Math.atan2(tb[1] - ta[1], tb[0] - ta[0]);
      emoji("🚀", rx, ry, 52, 1, ang + Math.PI * .25);
    }
    txt("the gap between them!", W / 2, H * .92, 30, DIFF, "center", true, rmp(t, 3.4, 4.2));
    txt("its length is the distance", W / 2, H * .12, 30, INK, "center", true, rmp(t, 4.4, 5.4));
  };

  // 4. FORMULA
  R.formula = function (t, p, gt) {
    txt("The 3D Pythagoras!", W / 2, H * .20, 46, DIFF, "center", true, rmp(t, .2, 1.0));
    // |b - a| = sqrt( ... )
    const fa = rmp(t, 1.2, 2.2);
    if (fa > 0) {
      const inner = [{ s: "Δx", c: AX, sup: "2" }, { s: " + " }, { s: "Δy", c: AY, sup: "2" }, { s: " + " }, { s: "Δz", c: AZ, sup: "2" }];
      const fs = 60, innerW = tokens(inner, 0, -9999, fs * .78, false);
      const lead = [{ s: "| b − a | = ", c: DIFF }];
      const leadW = tokens(lead, 0, -9999, fs, false);
      const totW = leadW + fs * 0.74 + innerW, bx = W / 2 - totW / 2, by = H * .5;
      const pop = eel(rmp(t, 1.2, 2.4));
      ctx.save(); ctx.translate(W / 2, by); ctx.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop); ctx.translate(-W / 2, -by);
      ctx.globalAlpha = fa;
      ctx.fillStyle = "rgba(255,210,63,0.10)"; ctx.strokeStyle = DIFF; ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(255,210,63,.4)"; ctx.shadowBlur = 30 * (.7 + .3 * Math.sin(gt * 3));
      ctx.beginPath(); ctx.roundRect(bx - 38, by - fs * 1.4, totW + 76, fs * 2.1, 20); ctx.fill(); ctx.stroke();
      ctx.shadowColor = "transparent";
      let xx = bx; xx += tokens(lead, xx, by, fs, true, fa);
      sqrtExpr(inner, xx, by, fs, INK, fa, rmp(t, 1.6, 2.8));
      ctx.restore();
    }
    // helper line
    txt("Δx, Δy, Δz are the differences in each direction", W / 2, H * .74, 26, MUT, "center", false, rmp(t, 3.2, 4.2));
    txt("square them  ▸  add them  ▸  square root!", W / 2, H * .82, 28, INK, "center", true, rmp(t, 5.0, 6.0));
  };

  // 5. EXAMPLE
  R.example = function (t, p, gt) {
    txt("Let's try it! 🚀", W / 2, H * .12, 44, DIFF, "center", true, rmp(t, .2, .9));
    const P = cam(-0.72 + .05 * Math.sin(gt * .3), .40, 12, W * .40, H * .70, 38);
    axes3d(P, 7, rmp(t, .3, 1.0), 7, .7);
    const O = P(0, 0, 0), A3 = [1, 2, 3], B3 = [4, 6, 15 * 0.34];
    const ta = P(...A3), tb = P(...B3);
    vecArrow(O, ta, VA, 5, eo3(rmp(t, 1.2, 2.2)), true);
    vecArrow(O, tb, VB, 5, eo3(rmp(t, 2.4, 3.4)), true);
    if (t > 2.0) { dot(ta, 10, VA, 12); chip("a = (1, 2, 3)", ta[0] - 70, ta[1] + 52, VA, rmp(t, 2.0, 2.6)); }
    if (t > 3.2) { dot(tb, 10, VB, 12); chip("b = (4, 6, 15)", tb[0] - 4, tb[1] - 46, VB, rmp(t, 3.2, 3.8)); }
    // countdown 3-2-1 near the end of the scene
    const cd = t - (p ? 0 : 0);
    const counts = [["3", 4.9], ["2", 5.6], ["1", 6.3]];
    for (const [n, at] of counts) {
      const a = rmp(t, at, at + .6) * (1 - rmp(t, at + .55, at + .9));
      if (a > 0) txt(n, W * .74, H * .42, 120 * ebk(rmp(t, at, at + .35)), DIFF, "center", true, a);
    }
  };
  function chip(s, x, y, col, a) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = c01(a); ctx.font = "900 24px 'Trebuchet MS'";
    const w = ctx.measureText(s).width;
    ctx.fillStyle = "rgba(10,16,50,.85)"; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - w / 2 - 14, y - 26, w + 28, 38, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = "center"; ctx.fillText(s, x, y + 1); ctx.restore();
  }

  // 6. COMPUTE  (timings matched to narration)
  R.compute = function (t, p, gt) {
    const P = cam(-0.62 + .04 * Math.sin(gt * .3), .36, 13, W * .225, H * .64, 33);
    const A3 = [0, 0, 0], B3 = [3, 4, 12 * 0.55];
    deltaBox(P, A3, B3, rmp(t, .2, 1.0));
    const a = P(...A3), b = P(...B3), cx2 = P(3, 0, 0), corner = P(3, 4, 0);
    if (t > 1.4) { line(a, cx2, AX, 5, null, eo3(rmp(t, 1.4, 2.0))); txt("3", (a[0] + cx2[0]) / 2, a[1] + 26, 26, AX, "center", true, rmp(t, 1.7, 2.2)); }
    if (t > 3.0) { line(cx2, corner, AY, 5, null, eo3(rmp(t, 3.0, 3.6))); txt("4", (cx2[0] + corner[0]) / 2 + 24, (cx2[1] + corner[1]) / 2 + 8, 26, AY, "center", true, rmp(t, 3.3, 3.8)); }
    if (t > 4.6) { line(corner, b, AZ, 5, null, eo3(rmp(t, 4.6, 5.4))); txt("12", corner[0] + 28, (corner[1] + b[1]) / 2, 26, AZ, "center", true, rmp(t, 4.9, 5.4)); }
    const dg = rmp(t, 13.4, 14.4);
    if (dg > 0) { line(a, b, RES, 6, null, eo3(dg)); txt("13", (a[0] + b[0]) / 2 - 28, (a[1] + b[1]) / 2, 32, RES, "center", true, rmp(t, 13.9, 14.4)); }
    dot(a, 9, VA, 10); dot(b, 9, VB, 10);
    txt("a", a[0] - 16, a[1] + 22, 22, VA); txt("b", b[0] + 16, b[1] - 12, 22, VB);
    // rocket climbs toward B as we compute
    const rk = rmp(t, 6.0, 14.0);
    if (rk > 0 && rk < 1.01) { const rx = a[0] + (b[0] - a[0]) * eio(rk), ry = a[1] + (b[1] - a[1]) * eio(rk); emoji("🚀", rx - 26, ry, 46, 1, Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI * .25); }
    // calc card
    const cw = W * .50, cx0 = W * .45, cy0 = H * .12, ch0 = H * .76;
    ctx.save(); ctx.globalAlpha = rmp(t, .2, .8);
    ctx.fillStyle = "rgba(10,16,50,.82)"; ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 30; ctx.beginPath(); ctx.roundRect(cx0, cy0, cw, ch0, 22); ctx.fill(); ctx.stroke(); ctx.restore();
    const lx = cx0 + 50; let ly = cy0 + 62; const fs = 30, lh = 54;
    const rows = [
      { at: 1.4, list: [{ s: "Δx", c: AX }, { s: " = 4 − 1 = " }, { s: "3", c: AX }] },
      { at: 3.0, list: [{ s: "Δy", c: AY }, { s: " = 6 − 2 = " }, { s: "4", c: AY }] },
      { at: 4.6, list: [{ s: "Δz", c: AZ }, { s: " = 15 − 3 = " }, { s: "12", c: AZ }] },
      { at: 6.4, sqrt: [{ s: "3", c: AX, sup: "2" }, { s: " + " }, { s: "4", c: AY, sup: "2" }, { s: " + " }, { s: "12", c: AZ, sup: "2" }], lead: "d = " },
      { at: 8.2, sqrt: [{ s: "9", c: AX }, { s: " + " }, { s: "16", c: AY }, { s: " + " }, { s: "144", c: AZ }], lead: "  = " },
      { at: 10.4, sqrt: [{ s: "169" }], lead: "  = " },
      { at: 13.2, list: [{ s: "  = " }, { s: "13", c: RES }], big: true },
    ];
    for (const r of rows) {
      const al = rmp(t, r.at, r.at + .6);
      if (al > 0) {
        ctx.save(); ctx.translate((1 - eo3(al)) * 22, 0);
        if (r.sqrt) { let xx = lx; xx += tokens([{ s: r.lead, c: RES }], xx, ly, fs, true, al); sqrtExpr(r.sqrt, xx, ly, fs, INK, al, rmp(t, r.at + .1, r.at + .9)); }
        else {
          tokens(r.list, lx, ly, r.big ? fs * 1.4 : fs, true, al);
          if (r.big && al > .8) {
            const wlead = tokens([{ s: "  = " }], 0, -9999, fs * 1.4, false), w13 = tokens([{ s: "13" }], 0, -9999, fs * 1.4, false);
            ctx.save(); ctx.globalAlpha = rmp(t, r.at + .8, r.at + 1.2); ctx.strokeStyle = RES; ctx.lineWidth = 3;
            ctx.shadowColor = RES; ctx.shadowBlur = 18; ctx.beginPath(); ctx.roundRect(lx + wlead - 12, ly - fs * 1.4, w13 + 24, fs * 1.85, 14); ctx.stroke(); ctx.restore();
          }
        }
        ctx.restore();
      }
      ly += r.sqrt ? lh + 10 : lh;
    }
    confetti(13.6, t, W * .72, H * .5, 40, 321);
  };

  // 7. RECAP
  R.recap = function (t, p, gt) {
    const a0 = rmp(t, .2, 1.0);
    ctx.save(); ctx.translate(W / 2, H * .34 + (1 - eo3(a0)) * 30); const sc = 1 + .04 * Math.sin(gt * 3); ctx.scale(sc, sc);
    txt("distance = 13", 0, 0, 92, RES, "center", true, a0); ctx.restore();
    confetti(.6, t, W / 2, H * .3, 80, 555);
    confetti(1.6, t, W * .3, H * .35, 50, 99);
    confetti(2.2, t, W * .7, H * .35, 50, 220);
    const fa = rmp(t, 2.6, 3.6);
    if (fa > 0) {
      const inner = [{ s: "Δx", c: AX, sup: "2" }, { s: " + " }, { s: "Δy", c: AY, sup: "2" }, { s: " + " }, { s: "Δz", c: AZ, sup: "2" }];
      const fs = 50, innerW = tokens(inner, 0, -9999, fs * .78, false), lead = [{ s: "| b − a | = ", c: DIFF }], leadW = tokens(lead, 0, -9999, fs, false);
      const totW = leadW + fs * .74 + innerW, bx = W / 2 - totW / 2, by = H * .58;
      ctx.save(); ctx.globalAlpha = fa; ctx.fillStyle = "rgba(255,210,63,.10)"; ctx.strokeStyle = DIFF; ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(255,210,63,.35)"; ctx.shadowBlur = 28; ctx.beginPath(); ctx.roundRect(bx - 40, by - fs * 1.4, totW + 80, fs * 2.1, 20); ctx.fill(); ctx.stroke(); ctx.shadowColor = "transparent";
      let xx = bx; xx += tokens(lead, xx, by, fs, true, fa); sqrtExpr(inner, xx, by, fs, INK, fa, rmp(t, 2.8, 3.8));
    }
    emoji("🚀", W * .5 + 230 * Math.cos(gt * 1.5), H * .34 + 60 * Math.sin(gt * 1.5), 50, rmp(t, .4, 1.0), gt * 1.5 + 1.2);
    txt("You're a space math hero! 🌟", W / 2, H * .84, 40, INK, "center", true, rmp(t, 4.4, 5.2));
  };

  // ---------- master ----------
  window.VIDEO_TOTAL = S.total;
  function sceneAt(gt) { let cur = S.scenes[0]; for (const sc of S.scenes) if (gt >= sc.start) cur = sc; return cur; }
  window.renderVideo = function (gt) {
    playBtn.classList.add("hide");
    bgPaint(gt);
    const sc = sceneAt(gt), t = gt - sc.start, p = c01(t / sc.dur);
    R[sc.key](t, p, gt);
    const fadeIn = rmp(t, 0, .3);
    if (fadeIn < 1) { ctx.save(); ctx.globalAlpha = (1 - fadeIn) * 0.9; ctx.fillStyle = "#0a0c33"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (gt < .4) { ctx.save(); ctx.globalAlpha = 1 - gt / .4; ctx.fillStyle = "#070b2a"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (gt > S.total - .7) { ctx.save(); ctx.globalAlpha = rmp(gt, S.total - .7, S.total); ctx.fillStyle = "#070b2a"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  };

  function frame() { window.renderVideo(audio.currentTime); requestAnimationFrame(frame); }
  playBtn.addEventListener("click", () => { playBtn.classList.add("hide"); audio.currentTime = 0; audio.play().catch(() => {}); requestAnimationFrame(frame); });
})();
