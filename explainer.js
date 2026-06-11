(function () {
  "use strict";
  // ============================================================
  //  "Distance between two points in 3D space" — animated explainer.
  //  Everything is drawn on one canvas and driven deterministically
  //  from a global time, so it can be exported frame-by-frame.
  // ============================================================
  const S = window.SCENES;                       // {total, scenes:[{key,start,dur,...}]}
  const cv = document.getElementById("c");
  const ctx = cv.getContext("2d");
  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");

  // ---- palette (light "House of Math" look) ----
  const BG = "#faf7f2", INK = "#2b2350", MUT = "#9a93b8";
  const ORANGE = "#ff8a00", RED = "#e94f64", GREEN = "#1fa86b", BLUE = "#3b82f6", PURPLE = "#8b5cf6";
  const CARD = "#ffffff";

  let W = 1280, H = 720;
  function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  window.addEventListener("resize", resize); resize();

  // ---- easing ----
  const c01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const rmp = (t, a, b) => c01((t - a) / (b - a));
  const eo3 = x => 1 - Math.pow(1 - x, 3);
  const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const ebk = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  // ---- 3D camera ----
  function cam(yaw, pitch, dist, cx, cy, scale) {
    const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return function (x, y, z) {
      const x1 = x * cy_ - y * sy_, y1 = x * sy_ + y * cy_, z1 = z;
      const depth = y1 * cp - z1 * sp;
      const up = y1 * sp + z1 * cp;
      const f = dist / (dist + depth);
      return [cx + scale * f * x1, cy - scale * f * up, f];
    };
  }

  // ---- drawing helpers ----
  function line(p, q, col, w, dash, prog) {
    prog = prog == null ? 1 : prog;
    if (prog <= 0) return;
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + (q[0] - p[0]) * prog, p[1] + (q[1] - p[1]) * prog);
    ctx.stroke(); ctx.restore();
  }
  function dot(p, r, col, glow) {
    ctx.save();
    if (glow) { ctx.shadowColor = col; ctx.shadowBlur = glow; }
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p[0] - r * .3, p[1] - r * .3, r * .32, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  function txt(s, x, y, size, col, align, bold, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : c01(alpha);
    ctx.fillStyle = col || INK;
    ctx.font = (bold === false ? "" : "bold ") + size + "px 'Trebuchet MS','Segoe UI',sans-serif";
    ctx.textAlign = align || "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(s, x, y); ctx.restore();
  }
  function arrowHead(p, q, col, sz) {
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    ctx.save(); ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    ctx.lineTo(q[0] - sz * Math.cos(a - .4), q[1] - sz * Math.sin(a - .4));
    ctx.lineTo(q[0] - sz * Math.cos(a + .4), q[1] - sz * Math.sin(a + .4));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // measure-and-draw a token sequence with optional superscripts/colors.
  // tokens: {s:"Δx", c:RED, sup:"2"} — returns total width; draws if doDraw.
  function tokens(list, x, y, size, doDraw, alpha) {
    let w = 0;
    ctx.save();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = alpha == null ? 1 : c01(alpha);
    for (const tk of list) {
      ctx.font = "bold " + size + "px 'Trebuchet MS',sans-serif";
      const tw = ctx.measureText(tk.s).width;
      if (doDraw) { ctx.fillStyle = tk.c || INK; ctx.fillText(tk.s, x + w, y); }
      w += tw;
      if (tk.sup) {
        ctx.font = "bold " + (size * .6) + "px 'Trebuchet MS',sans-serif";
        const sw = ctx.measureText(tk.sup).width;
        if (doDraw) { ctx.fillStyle = tk.c || INK; ctx.fillText(tk.sup, x + w + 1, y - size * .42); }
        w += sw + 2;
      }
    }
    ctx.restore();
    return w;
  }
  // square root around a token list. (x,y) = baseline left of the radical.
  function sqrtExpr(list, x, y, size, col, alpha, prog) {
    alpha = alpha == null ? 1 : c01(alpha);
    if (alpha <= 0) return 0;
    const inner = size * 0.78;
    const contentW = tokens(list, 0, -9999, inner, false);
    const lw = Math.max(2.5, size * .07);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = col || INK; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round";
    const topY = y - size * 0.95, botY = y + size * 0.12;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.38);
    ctx.lineTo(x + size * 0.14, y - size * 0.44);
    ctx.lineTo(x + size * 0.30, botY);
    ctx.lineTo(x + size * 0.52, topY);
    const barEnd = x + size * 0.52 + contentW + size * 0.22;
    ctx.lineTo(x + size * 0.52 + (contentW + size * 0.22) * (prog == null ? 1 : c01(prog)), topY);
    ctx.stroke();
    ctx.restore();
    tokens(list, x + size * 0.62, y - size * 0.12, inner, true, alpha);
    return barEnd - x;
  }

  // deterministic PRNG + confetti
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function confetti(t0, t, cx, cy, n, seed) {
    const age = t - t0;
    if (age < 0 || age > 2.2) return;
    const r = rng(seed);
    const cols = [ORANGE, RED, GREEN, BLUE, PURPLE, "#ffd23f"];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, sp = 180 + r() * 340, g = 420 + r() * 280;
      const x = cx + Math.cos(a) * sp * age;
      const y = cy + Math.sin(a) * sp * age * .8 + .5 * g * age * age - 140 * age;
      const al = c01(1.6 - age * .9);
      ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = cols[i % cols.length];
      ctx.translate(x, y); ctx.rotate(a + age * (3 + r() * 4));
      const s2 = 5 + r() * 6;
      if (i % 2) ctx.fillRect(-s2 / 2, -s2 / 3, s2, s2 * .66);
      else { ctx.beginPath(); ctx.arc(0, 0, s2 / 2, 0, 6.283); ctx.fill(); }
      ctx.restore();
    }
  }

  // soft background with faint grid
  function bgPaint(gt) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W * .8, H * .15, 0, W * .8, H * .15, W * .7);
    g.addColorStop(0, "rgba(255,170,60,0.10)"); g.addColorStop(1, "rgba(255,170,60,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(W * .1, H * .9, 0, W * .1, H * .9, W * .6);
    g2.addColorStop(0, "rgba(139,92,246,0.08)"); g2.addColorStop(1, "rgba(139,92,246,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(43,35,80,0.045)"; ctx.lineWidth = 1;
    const sp = 46, off = (gt * 4) % sp;
    ctx.beginPath();
    for (let x = -sp + off; x < W; x += sp) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = -sp + off; y < H; y += sp) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  // draw a 3D axes set + optional floor grid
  function axes3d(P, len, alphaA, grid, gridAlpha) {
    if (grid) {
      ctx.save(); ctx.globalAlpha = c01(gridAlpha == null ? 1 : gridAlpha);
      ctx.strokeStyle = "rgba(43,35,80,0.13)"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= grid; i++) {
        let a = P(i, 0, 0), b = P(i, grid, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        a = P(0, i, 0); b = P(grid, i, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke(); ctx.restore();
    }
    const o = P(0, 0, 0);
    const ex = P(len, 0, 0), ey = P(0, len, 0), ez = P(0, 0, len);
    ctx.save(); ctx.globalAlpha = c01(alphaA == null ? 1 : alphaA);
    line(o, ex, RED, 3); arrowHead(o, ex, RED, 10);
    line(o, ey, GREEN, 3); arrowHead(o, ey, GREEN, 10);
    line(o, ez, BLUE, 3); arrowHead(o, ez, BLUE, 10);
    txt("x", ex[0] + 16, ex[1] + 6, 22, RED);
    txt("y", ey[0] + 14, ey[1] - 8, 22, GREEN);
    txt("z", ez[0] - 2, ez[1] - 12, 22, BLUE);
    ctx.restore();
  }

  // wireframe box between two corner points (axis-aligned), with edge progress
  function deltaBox(P, A, B, prog, hl) {
    const xs = [A[0], B[0]], ys = [A[1], B[1]], zs = [A[2], B[2]];
    const C = (i, j, k) => P(xs[i], ys[j], zs[k]);
    ctx.save();
    ctx.globalAlpha = c01(prog);
    ctx.strokeStyle = "rgba(43,35,80,0.30)"; ctx.lineWidth = 1.6; ctx.setLineDash([6, 6]);
    const E = [
      [[0,0,0],[1,0,0]], [[0,1,0],[1,1,0]], [[0,0,1],[1,0,1]], [[0,1,1],[1,1,1]],
      [[0,0,0],[0,1,0]], [[1,0,0],[1,1,0]], [[0,0,1],[0,1,1]], [[1,0,1],[1,1,1]],
      [[0,0,0],[0,0,1]], [[1,0,0],[1,0,1]], [[0,1,0],[0,1,1]], [[1,1,0],[1,1,1]],
    ];
    ctx.beginPath();
    for (const [a, b] of E) {
      const p = C(...a), q = C(...b);
      ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    return C;
  }

  // ============ SCENES ============
  const R = {};

  // ---------- 1. TITLE ----------
  R.title = function (t, p, gt) {
    const yaw = -0.7 + 0.12 * Math.sin(gt * 0.35);
    const P = cam(yaw, 0.42, 9, W * 0.68, H * 0.56, 64);
    axes3d(P, 3.4, rmp(t, .2, .9), 4, rmp(t, .2, .9) * .8);
    const A3 = [0.8, 1.2, 0.7], B3 = [3.0, 2.6, 2.6];
    const a = P(...A3), b = P(...B3);
    const lp = rmp(t, 1.2, 2.4);
    line(a, b, PURPLE, 4, [10, 9], eo3(lp));
    if (lp > 0) {
      const pulse = 1 + 0.15 * Math.sin(gt * 4);
      dot(a, 11 * pulse, ORANGE, 18); dot(b, 11 * pulse, BLUE, 18);
      txt("A", a[0] - 22, a[1] - 14, 26, ORANGE);
      txt("B", b[0] + 20, b[1] - 14, 26, BLUE);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const qa = rmp(t, 2.4, 3.0);
      txt("?", m[0] + 6, m[1] - 18 - 6 * Math.sin(gt * 3), 46 * ebk(qa), PURPLE, "center", true, qa);
    }
    // title text
    const ta = rmp(t, .5, 1.5);
    ctx.save();
    ctx.translate(0, (1 - eo3(ta)) * 40);
    txt("Distance in", W * 0.30, H * 0.34, 56, INK, "center", true, ta);
    txt("3D Space", W * 0.30, H * 0.45, 84, ORANGE, "center", true, rmp(t, .8, 1.8));
    txt("how far is it from A to B?", W * 0.30, H * 0.56, 26, MUT, "center", false, rmp(t, 1.6, 2.4));
    ctx.restore();
  };

  // ---------- 2. RECALL 2D ----------
  R.recall2d = function (t, p, gt) {
    // left: 2D diagram
    const ox = W * 0.115, oy = H * 0.80, u = 64;     // origin + unit
    const ga = rmp(t, 0.1, 0.9);
    ctx.save(); ctx.globalAlpha = ga;
    ctx.strokeStyle = "rgba(43,35,80,0.13)"; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 7; i++) { ctx.moveTo(ox + i * u, oy); ctx.lineTo(ox + i * u, oy - 5 * u); }
    for (let j = 0; j <= 5; j++) { ctx.moveTo(ox, oy - j * u); ctx.lineTo(ox + 7 * u, oy - j * u); }
    ctx.stroke();
    line([ox, oy], [ox + 7 * u + 14, oy], INK, 2.5); arrowHead([ox, oy], [ox + 7 * u + 14, oy], INK, 9);
    line([ox, oy], [ox, oy - 5 * u - 14], INK, 2.5); arrowHead([ox, oy], [ox, oy - 5 * u - 14], INK, 9);
    txt("x", ox + 7 * u + 28, oy + 6, 20, INK); txt("y", ox - 4, oy - 5 * u - 24, 20, INK);
    ctx.restore();
    const A = [ox + 1 * u, oy - 1 * u], B = [ox + 5 * u, oy - 4 * u];
    const pa = rmp(t, 1.0, 1.6);
    if (pa > 0) {
      dot(A, 9 * ebk(pa), ORANGE, 10); dot(B, 9 * ebk(rmp(t, 1.3, 1.9)), BLUE, 10);
      txt("A", A[0] - 18, A[1] + 22, 22, ORANGE, "center", true, pa);
      txt("B", B[0] + 18, B[1] - 12, 22, BLUE, "center", true, rmp(t, 1.3, 1.9));
    }
    const corner = [B[0], A[1]];
    line(A, corner, RED, 5, null, eo3(rmp(t, 3.0, 4.2)));
    line(corner, B, GREEN, 5, null, eo3(rmp(t, 4.4, 5.6)));
    if (t > 4.0) txt("Δx", (A[0] + corner[0]) / 2, A[1] + 30, 24, RED, "center", true, rmp(t, 4.0, 4.6));
    if (t > 5.4) txt("Δy", corner[0] + 32, (corner[1] + B[1]) / 2 + 8, 24, GREEN, "center", true, rmp(t, 5.4, 6.0));
    // right angle marker
    if (t > 5.6) {
      ctx.save(); ctx.globalAlpha = rmp(t, 5.6, 6.1); ctx.strokeStyle = MUT; ctx.lineWidth = 2;
      ctx.strokeRect(corner[0] - 16, corner[1] - 16, 16, 16); ctx.restore();
    }
    line(A, B, PURPLE, 5, null, eo3(rmp(t, 6.6, 8.0)));
    if (t > 7.2) {
      const m = [(A[0] + B[0]) / 2 - 26, (A[1] + B[1]) / 2 - 14];
      txt("d", m[0], m[1], 28, PURPLE, "center", true, rmp(t, 7.2, 7.8));
    }
    // right: card with Pythagoras
    const ca = rmp(t, 8.6, 9.6);
    if (ca > 0) {
      const cw = W * 0.355, ch = 240, cx0 = W * 0.61, cy0 = H * 0.30 + (1 - eo3(ca)) * 30;
      ctx.save(); ctx.globalAlpha = ca;
      ctx.fillStyle = CARD; ctx.shadowColor = "rgba(43,35,80,.14)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      ctx.beginPath(); ctx.roundRect(cx0, cy0, cw, ch, 22); ctx.fill(); ctx.restore();
      txt("In 2D — Pythagoras", cx0 + cw / 2, cy0 + 48, 26, MUT, "center", true, ca);
      const list1 = [{ s: "d", c: PURPLE, sup: "2" }, { s: " = " }, { s: "Δx", c: RED, sup: "2" }, { s: " + " }, { s: "Δy", c: GREEN, sup: "2" }];
      const w1 = tokens(list1, 0, -9999, 40, false);
      tokens(list1, cx0 + cw / 2 - w1 / 2, cy0 + 116, 40, true, rmp(t, 9.4, 10.2));
      const list2 = [{ s: "Δx", c: RED, sup: "2" }, { s: " + " }, { s: "Δy", c: GREEN, sup: "2" }];
      const sa = rmp(t, 11.0, 12.0);
      if (sa > 0) {
        const innerW = tokens(list2, 0, -9999, 40 * .78, false);
        const totW = 40 * 0.74 + innerW + tokens([{ s: "d = ", c: PURPLE }], 0, -9999, 40, false);
        let xx = cx0 + cw / 2 - totW / 2;
        xx += tokens([{ s: "d = ", c: PURPLE }], xx, cy0 + 188, 40, true, sa);
        sqrtExpr(list2, xx, cy0 + 188, 40, INK, sa, rmp(t, 11.2, 12.2));
      }
    }
  };

  // ---------- 3. TO 3D ----------
  R.to3d = function (t, p, gt) {
    // camera tilts from near top-down (2D look) into perspective
    const tilt = eio(rmp(t, 0.6, 3.6));
    const pitch = 1.25 - 0.83 * tilt;
    const yaw = -1.5708 + 0.88 * tilt + 0.05 * Math.sin(gt * 0.3) * tilt;
    const P = cam(yaw, pitch, 11, W * 0.46, H * 0.62, 78);
    axes3d(P, 4.6, 1, 4, 1);
    const A3 = [1, 1, 0], Bflat = [4, 3, 0], lift = eo3(rmp(t, 4.2, 6.2)) * 2.6;
    const B3 = [4, 3, lift];
    const a = P(...A3), b = P(...B3), bf = P(...Bflat);
    // base triangle remnants
    line(a, P(4, 1, 0), RED, 4);
    line(P(4, 1, 0), bf, GREEN, 4);
    txt("Δx", (a[0] + P(4, 1, 0)[0]) / 2, a[1] + 26, 21, RED);
    txt("Δy", (P(4, 1, 0)[0] + bf[0]) / 2 + 30, (P(4, 1, 0)[1] + bf[1]) / 2, 21, GREEN);
    // z-axis label callout
    if (t < 4.5) txt("a new axis: z", P(0, 0, 4.6)[0] + 96, P(0, 0, 4.6)[1] + 8, 24, BLUE, "center", true, rmp(t, 1.2, 2.0) * (1 - rmp(t, 3.6, 4.4)));
    // lift B with Δz edge
    if (lift > 0.01) {
      line(bf, b, BLUE, 4);
      txt("Δz", b[0] + 30, (bf[1] + b[1]) / 2, 21, BLUE, "center", true, rmp(t, 4.8, 5.6));
    }
    // box
    const boxA = rmp(t, 6.0, 7.6);
    if (boxA > 0) deltaBox(P, A3, B3, boxA);
    // diagonal
    const dg = rmp(t, 8.6, 10.2);
    line(a, b, PURPLE, 5.5, null, eo3(dg));
    if (dg > 0.9) {
      const m = [(a[0] + b[0]) / 2 - 30, (a[1] + b[1]) / 2 - 10];
      txt("d", m[0], m[1], 30, PURPLE, "center", true, rmp(t, 10.0, 10.6));
    }
    dot(a, 10, ORANGE, 12); dot(b, 10, BLUE, 12);
    txt("A", a[0] - 20, a[1] + 26, 24, ORANGE); txt("B", b[0] + 20, b[1] - 14, 24, BLUE);
    // caption
    txt("the distance is the box's space diagonal", W / 2, H * 0.94, 30, INK, "center", true, rmp(t, 9.0, 10.0));
  };

  // ---------- 4. FORMULA (double Pythagoras) ----------
  R.formula = function (t, p, gt) {
    const P = cam(-0.65 + 0.05 * Math.sin(gt * 0.3), 0.42, 10, W * 0.24, H * 0.55, 86);
    const A3 = [0, 0, 0], B3 = [2.4, 1.8, 2.0];
    const C = deltaBox(P, A3, B3, 1);
    const a = P(...A3), b = P(...B3), corner = P(2.4, 1.8, 0), cx2 = P(2.4, 0, 0);
    // base triangle (step 1)
    const s1 = rmp(t, 0.8, 1.8);
    line(a, cx2, RED, 4); line(cx2, corner, GREEN, 4);
    if (s1 > 0) {
      ctx.save(); ctx.globalAlpha = 0.16 * s1; ctx.fillStyle = ORANGE;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(cx2[0], cx2[1]); ctx.lineTo(corner[0], corner[1]); ctx.closePath(); ctx.fill(); ctx.restore();
      line(a, corner, ORANGE, 4.5, null, eo3(s1));
      txt("s", (a[0] + corner[0]) / 2 + 4, (a[1] + corner[1]) / 2 + 24, 24, ORANGE, "center", true, s1);
    }
    // vertical triangle (step 2)
    const s2 = rmp(t, 5.6, 6.6);
    if (s2 > 0) {
      ctx.save(); ctx.globalAlpha = 0.16 * s2; ctx.fillStyle = PURPLE;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(corner[0], corner[1]); ctx.lineTo(b[0], b[1]); ctx.closePath(); ctx.fill(); ctx.restore();
      line(corner, b, BLUE, 4);
      line(a, b, PURPLE, 5, null, eo3(s2));
      txt("d", (a[0] + b[0]) / 2 - 24, (a[1] + b[1]) / 2 - 8, 26, PURPLE, "center", true, s2);
    }
    dot(a, 9, ORANGE, 10); dot(b, 9, BLUE, 10);
    txt("A", a[0] - 18, a[1] + 24, 22, ORANGE); txt("B", b[0] + 18, b[1] - 12, 22, BLUE);
    // right column: derivation
    const X = W * 0.50, baseY = H * 0.24;
    txt("Pythagoras — twice!", X + W * 0.21, baseY - 60, 30, MUT, "center", true, rmp(t, .3, 1.0));
    const l1 = [{ s: "s", c: ORANGE, sup: "2" }, { s: " = " }, { s: "Δx", c: RED, sup: "2" }, { s: " + " }, { s: "Δy", c: GREEN, sup: "2" }];
    const a1 = rmp(t, 1.6, 2.6);
    if (a1 > 0) { const w1 = tokens(l1, 0, -9999, 38, false); tokens(l1, X + W * 0.21 - w1 / 2, baseY + 12, 38, true, a1); txt("① the floor diagonal", X + W * 0.21, baseY + 44, 19, MUT, "center", false, a1); }
    const l2 = [{ s: "d", c: PURPLE, sup: "2" }, { s: " = " }, { s: "s", c: ORANGE, sup: "2" }, { s: " + " }, { s: "Δz", c: BLUE, sup: "2" }];
    const a2 = rmp(t, 6.2, 7.2);
    if (a2 > 0) { const w2 = tokens(l2, 0, -9999, 38, false); tokens(l2, X + W * 0.21 - w2 / 2, baseY + 110, 38, true, a2); txt("② up to B", X + W * 0.21, baseY + 142, 19, MUT, "center", false, a2); }
    // final framed formula
    const fa = rmp(t, 9.4, 10.4);
    if (fa > 0) {
      const inner = [{ s: "Δx", c: RED, sup: "2" }, { s: " + " }, { s: "Δy", c: GREEN, sup: "2" }, { s: " + " }, { s: "Δz", c: BLUE, sup: "2" }];
      const fs = 46;
      const innerW = tokens(inner, 0, -9999, fs * .78, false);
      const lead = tokens([{ s: "d = ", c: PURPLE }], 0, -9999, fs, false);
      const totW = lead + fs * 0.74 + innerW;
      const bx = X + W * 0.21 - totW / 2, by = baseY + 250;
      ctx.save(); ctx.globalAlpha = fa;
      ctx.fillStyle = "#fff7ec"; ctx.strokeStyle = ORANGE; ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(255,138,0,.35)"; ctx.shadowBlur = 26 * (0.7 + 0.3 * Math.sin(gt * 3));
      ctx.beginPath(); ctx.roundRect(bx - 34, by - fs * 1.35, totW + 68, fs * 2.05, 18); ctx.fill(); ctx.stroke();
      ctx.restore();
      let xx = bx;
      xx += tokens([{ s: "d = ", c: PURPLE }], xx, by, fs, true, fa);
      sqrtExpr(inner, xx, by, fs, INK, fa, rmp(t, 9.6, 10.8));
    }
  };

  // ---------- 5. EXAMPLE ----------
  R.example = function (t, p, gt) {
    txt("Example", W / 2, H * 0.12, 44, INK, "center", true, rmp(t, .2, .9));
    const P = cam(-0.7 + 0.05 * Math.sin(gt * 0.3), 0.40, 12, W * 0.40, H * 0.72, 40);
    axes3d(P, 7, rmp(t, .3, 1.0), 7, 0.8);
    const A3 = [1, 2, 3], B3 = [4, 6, 15 * 0.34];   // z compressed for view; labels carry truth
    const aIn = ebk(rmp(t, 1.4, 2.1)), bIn = ebk(rmp(t, 3.2, 3.9));
    const a = P(...A3), b = P(...B3);
    if (aIn > 0) {
      dot(a, 11 * aIn, ORANGE, 14);
      // card label
      cardLabel("A (1, 2, 3)", a[0] - 60, a[1] + 62, ORANGE, rmp(t, 1.7, 2.4));
    }
    if (bIn > 0) {
      dot(b, 11 * bIn, BLUE, 14);
      cardLabel("B (4, 6, 15)", b[0] - 6, b[1] - 48, BLUE, rmp(t, 3.5, 4.2));
    }
    if (t > 4.6) line(a, b, PURPLE, 5, [10, 9], eo3(rmp(t, 4.6, 5.8)));
    txt("how far apart are they?", W * 0.76, H * 0.62, 27, MUT, "center", false, rmp(t, 5.2, 6.0));
  };
  function cardLabel(s, x, y, col, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = c01(a);
    ctx.font = "bold 24px 'Trebuchet MS',sans-serif";
    const w = ctx.measureText(s).width;
    ctx.fillStyle = CARD; ctx.shadowColor = "rgba(43,35,80,.18)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.beginPath(); ctx.roundRect(x - w / 2 - 14, y - 26, w + 28, 38, 12); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = col; ctx.textAlign = "center"; ctx.fillText(s, x, y + 2);
    ctx.restore();
  }

  // ---------- 6. COMPUTE ----------
  R.compute = function (t, p, gt) {
    // left: the 3-4-12 box
    const P = cam(-0.62 + 0.04 * Math.sin(gt * 0.3), 0.36, 13, W * 0.225, H * 0.66, 33);
    const A3 = [0, 0, 0], B3 = [3, 4, 12 * 0.55];
    const C = deltaBox(P, A3, B3, rmp(t, .2, 1.0));
    const a = P(...A3), b = P(...B3);
    const cx2 = P(3, 0, 0), corner = P(3, 4, 0);
    if (t > 1.5) { line(a, cx2, RED, 5, null, eo3(rmp(t, 1.5, 2.3))); txt("3", (a[0] + cx2[0]) / 2, a[1] + 28, 26, RED, "center", true, rmp(t, 1.9, 2.4)); }
    if (t > 4.2) { line(cx2, corner, GREEN, 5, null, eo3(rmp(t, 4.2, 5.0))); txt("4", (cx2[0] + corner[0]) / 2 + 26, (cx2[1] + corner[1]) / 2 + 10, 26, GREEN, "center", true, rmp(t, 4.6, 5.1)); }
    if (t > 6.5) { line(corner, b, BLUE, 5, null, eo3(rmp(t, 6.5, 7.3))); txt("12", corner[0] + 30, (corner[1] + b[1]) / 2, 26, BLUE, "center", true, rmp(t, 6.9, 7.4)); }
    const dg = rmp(t, 17.5, 18.6);
    if (dg > 0) {
      line(a, b, PURPLE, 6, null, eo3(dg));
      txt("13", (a[0] + b[0]) / 2 - 30, (a[1] + b[1]) / 2, 30, PURPLE, "center", true, rmp(t, 18.2, 18.8));
    }
    dot(a, 9, ORANGE, 10); dot(b, 9, BLUE, 10);
    txt("A", a[0] - 18, a[1] + 24, 22, ORANGE); txt("B", b[0] + 18, b[1] - 12, 22, BLUE);
    // right: calculation card
    const cw = W * 0.50, ch0 = H * 0.74, cx0 = W * 0.45, cy0 = H * 0.13;
    ctx.save(); ctx.globalAlpha = rmp(t, .2, .8);
    ctx.fillStyle = CARD; ctx.shadowColor = "rgba(43,35,80,.12)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.beginPath(); ctx.roundRect(cx0, cy0, cw, ch0, 24); ctx.fill(); ctx.restore();
    const lx = cx0 + 54; let ly = cy0 + 66; const fs = 31, lh = 56;
    const rows = [
      { at: 1.5, list: [{ s: "Δx", c: RED }, { s: " = 4 − 1 = " }, { s: "3", c: RED }] },
      { at: 4.2, list: [{ s: "Δy", c: GREEN }, { s: " = 6 − 2 = " }, { s: "4", c: GREEN }] },
      { at: 6.5, list: [{ s: "Δz", c: BLUE }, { s: " = 15 − 3 = " }, { s: "12", c: BLUE }] },
      { at: 8.8, sqrt: [{ s: "3", c: RED, sup: "2" }, { s: " + " }, { s: "4", c: GREEN, sup: "2" }, { s: " + " }, { s: "12", c: BLUE, sup: "2" }], lead: "d = " },
      { at: 10.6, sqrt: [{ s: "9", c: RED }, { s: " + " }, { s: "16", c: GREEN }, { s: " + " }, { s: "144", c: BLUE }], lead: "   = " },
      { at: 14.2, sqrt: [{ s: "169" }], lead: "   = " },
      { at: 17.0, list: [{ s: "   = " }, { s: "13", c: PURPLE }], big: true },
    ];
    for (const r of rows) {
      const al = rmp(t, r.at, r.at + 0.7);
      if (al > 0) {
        ctx.save(); ctx.translate((1 - eo3(al)) * 24, 0);
        if (r.sqrt) {
          let xx = lx;
          xx += tokens([{ s: r.lead, c: PURPLE }], xx, ly, fs, true, al);
          sqrtExpr(r.sqrt, xx, ly, fs, INK, al, rmp(t, r.at + .1, r.at + .9));
        } else {
          tokens(r.list, lx, ly, r.big ? fs * 1.35 : fs, true, al);
          if (r.big && al > 0.8) {
            // highlight ring around the 13
            const wlead = tokens([{ s: "   = " }], 0, -9999, fs * 1.35, false);
            const w13 = tokens([{ s: "13" }], 0, -9999, fs * 1.35, false);
            ctx.save(); ctx.globalAlpha = rmp(t, r.at + .8, r.at + 1.3);
            ctx.strokeStyle = PURPLE; ctx.lineWidth = 3;
            ctx.shadowColor = "rgba(139,92,246,.5)"; ctx.shadowBlur = 16;
            ctx.beginPath(); ctx.roundRect(lx + wlead - 12, ly - fs * 1.35, w13 + 24, fs * 1.8, 14); ctx.stroke();
            ctx.restore();
          }
        }
        ctx.restore();
      }
      ly += r.sqrt ? lh + 12 : lh;
    }
  };

  // ---------- 7. RECAP ----------
  R.recap = function (t, p, gt) {
    const a0 = rmp(t, 0.2, 1.0);
    // big result
    ctx.save();
    ctx.translate(W / 2, H * 0.30 + (1 - eo3(a0)) * 30);
    const sc = 1 + 0.03 * Math.sin(gt * 2.4);
    ctx.scale(sc, sc);
    txt("d(A, B) = 13", 0, 0, 88, PURPLE, "center", true, a0);
    ctx.restore();
    confetti(1.0, t, W / 2, H * 0.28, 64, 777);
    // general formula card
    const fa = rmp(t, 3.2, 4.2);
    if (fa > 0) {
      const inner = [{ s: "Δx", c: RED, sup: "2" }, { s: " + " }, { s: "Δy", c: GREEN, sup: "2" }, { s: " + " }, { s: "Δz", c: BLUE, sup: "2" }];
      const fs = 52;
      const innerW = tokens(inner, 0, -9999, fs * .78, false);
      const lead = tokens([{ s: "d = ", c: PURPLE }], 0, -9999, fs, false);
      const totW = lead + fs * 0.74 + innerW;
      const bx = W / 2 - totW / 2, by = H * 0.55;
      ctx.save(); ctx.globalAlpha = fa;
      ctx.fillStyle = "#fff7ec"; ctx.strokeStyle = ORANGE; ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(255,138,0,.30)"; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.roundRect(bx - 40, by - fs * 1.4, totW + 80, fs * 2.15, 20); ctx.fill(); ctx.stroke();
      ctx.restore();
      let xx = bx;
      xx += tokens([{ s: "d = ", c: PURPLE }], xx, by, fs, true, fa);
      sqrtExpr(inner, xx, by, fs, INK, fa, rmp(t, 3.4, 4.4));
      txt("works for any two points in space", W / 2, by + 84, 24, MUT, "center", false, rmp(t, 4.6, 5.4));
    }
    const ta = rmp(t, 7.2, 8.0);
    txt("That's it! 🎉", W / 2, H * 0.84, 40, INK, "center", true, ta);
  };

  // ============ MASTER ============
  window.VIDEO_TOTAL = S.total;
  function sceneAt(gt) {
    let cur = S.scenes[0];
    for (const sc of S.scenes) if (gt >= sc.start) cur = sc;
    return cur;
  }
  window.renderVideo = function (gt) {
    playBtn.classList.add("hide");
    bgPaint(gt);
    const sc = sceneAt(gt);
    const t = gt - sc.start, p = c01(t / sc.dur);
    // scene fade-in
    ctx.save();
    ctx.globalAlpha = 1;
    R[sc.key](t, p, gt);
    ctx.restore();
    // crossfade veil at boundaries
    const fadeIn = rmp(t, 0, 0.35);
    if (fadeIn < 1) { ctx.save(); ctx.globalAlpha = 1 - fadeIn; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    // start & end fades
    if (gt < 0.5) { ctx.save(); ctx.globalAlpha = 1 - gt / 0.5; ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    if (gt > S.total - 0.8) { ctx.save(); ctx.globalAlpha = rmp(gt, S.total - 0.8, S.total); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  };

  // live playback
  function frame() { window.renderVideo(audio.currentTime); requestAnimationFrame(frame); }
  playBtn.addEventListener("click", () => {
    playBtn.classList.add("hide");
    audio.currentTime = 0; audio.play().catch(() => {});
    requestAnimationFrame(frame);
  });
})();
