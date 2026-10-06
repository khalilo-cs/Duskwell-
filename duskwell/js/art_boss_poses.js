'use strict';
// Bosses drawn from their finished poses (art/bosses/poses.webp). The pictures are used as they are;
// the motion comes from springs driven by what the boss does: telegraph squash, strike lunge, walk bob,
// hover, hit shove and death sink. The Stone Guardian has its own jointed rig (art_boss_guardian.js).
const BossPoses = (() => {
  const img = new Image(); img.src = 'art/bosses/poses.webp';
  const ready = () => img.complete && img.naturalWidth > 0;
  const { Spr, ease, easeOut, lerp, clamp01, noise } = Anim;
  // idle / atk (list: used in turn) / hurt: indices into the boss's poses; face: which way the drawing looks (1 = right);
  // hm / wm: how big it is drawn compared with the hitbox (height / width); w: spring stiffness (heavy = low); glow: telegraph colour
  const CFG = {
    spore:       { idle: 0, atk: [1], hurt: 2, face: 1, hm: 2.15, wm: 2.9, heavy: 0.8, glow: '#d8a0ff' },
    weaver:      { idle: 0, atk: [1, 2], hurt: 1, face: -1, hm: 2.6, wm: 9, heavy: 1.5, glow: '#ff6a5a', dash: true },
    drowned:     { idle: 0, atk: [0], hurt: 1, face: 1, hm: 1.95, wm: 3.1, heavy: 0.75, glow: '#7fe8ff' },
    brood:       { idle: 0, atk: [0], hurt: 1, face: 1, hm: 2.5, wm: 2.7, heavy: 0.9, glow: '#ff6a6a' },
    queen:       { idle: 0, atk: [1, 2], hurt: 0, face: 1, hm: 1.9, wm: 3.4, heavy: 1.2, glow: '#bfe8ff', fly: true },
    colossus:    { idle: 0, atk: [0], hurt: 1, face: 1, hm: 1.6, wm: 2.6, heavy: 0.7, glow: '#ff9a40' },
    thunderhoof: { idle: 0, atk: [1], hurt: 0, face: -1, hm: 2.3, wm: 2.0, heavy: 0.85, glow: '#a8c0ff' },
    roc:         { idle: 0, atk: [0], hurt: 0, face: 1, hm: 2.4, wm: 2.7, heavy: 1.1, glow: '#a8c0ff', fly: true },
    regent:      { idle: 0, atk: [1, 2], hurt: 0, face: 1, hm: 1.55, wm: 2.8, heavy: 1.0, glow: '#c8a0ff', fly: true },
    wraith:      { idle: 0, atk: [1], hurt: 0, face: 1, hm: 2.4, wm: 3.0, heavy: 1.2, glow: '#9fd0ff', fly: true },
    duelist:     { idle: 0, atk: [1], hurt: 0, face: -1, hm: 2.1, wm: 6, heavy: 1.4, glow: '#d4ccff', dash: true },
    twin:        { idle: 0, atk: [0], hurt: 0, face: -1, hm: 2.4, wm: 6, heavy: 1.4, glow: '#ff6a8a', dash: true },
    bonewright:  { idle: 0, atk: [0], hurt: 0, face: 1, hm: 1.85, wm: 4.2, heavy: 0.9, glow: '#ffe0a0' },
    marrow:      { idle: 0, atk: [0], hurt: 0, face: 1, hm: 1.65, wm: 2.4, heavy: 0.75, glow: '#ff5a5a' },
    stargazer:   { idle: 0, atk: [1], hurt: 0, face: 1, hm: 1.95, wm: 5, heavy: 1.2, glow: '#9fb8ff', fly: true },
    king:        { idle: 0, atk: [0, 1], hurt: 0, face: 1, hm: 1.75, wm: 3.2, heavy: 0.9, glow: '#ffffff', intro: 1 },
  };

  // how each body gives: sway (the upper body swaying, a share of the width), cloth (how much the hem trails behind a move, 0 to 1), flap (the wing tips
  // rise and fall, a share of the height) at fq beats a second. A body of stone does not sway much; a veil and a cloak trail; the winged beat.
  const MOTION = {
    spore: { sway: 0.016, cloth: 0.25 }, weaver: { sway: 0.012, cloth: 0.4 }, drowned: { sway: 0.02, cloth: 0.5 }, brood: { sway: 0.015, cloth: 0.2 },
    colossus: { sway: 0.008, cloth: 0.1 }, thunderhoof: { sway: 0.012, cloth: 0.4 }, duelist: { sway: 0.012, cloth: 0.7 }, twin: { sway: 0.012, cloth: 0.8 },
    bonewright: { sway: 0.01, cloth: 0.3 }, marrow: { sway: 0.01, cloth: 0.1 }, king: { sway: 0.012, cloth: 0.6 },
    queen: { flap: 0.07, fq: 1.5, sway: 0.01, cloth: 0.5 }, roc: { flap: 0.12, fq: 2.4, sway: 0.008, cloth: 0 }, regent: { flap: 0.03, fq: 0.9, sway: 0.012, cloth: 0.8 },
    wraith: { flap: 0.04, fq: 1.2, sway: 0.016, cloth: 0.9 }, stargazer: { flap: 0.03, fq: 0.8, sway: 0.014, cloth: 0.8 },
  };

  // state of one boss: its springs and which drawing is showing
  class Rig {
    constructor(c) {
      const k = c.heavy || 1, sp = (w, z) => new Spr(0, w * k, z);
      this.s = { lean: sp(8, 0.5), sx: sp(14, 0.45), sy: sp(14, 0.4), dx: sp(10, 0.55), dy: sp(10, 0.5), tilt: sp(7, 0.6) };
      this.s.sx.snap(1); this.s.sy.snap(1);
      this.t = null; this.x = null; this.y = null; this.speed = 0; this.vy = 0; this.pose = c.idle; this.prev = c.idle; this.fade = 1; this.strike = 0; this.wasTele = false; this.flip = 0;
      this.hurtK = 0; this.atkI = 0; this.fresh = true; this.face = 1; this.dying = 0;
    }
  }

  // move the springs from what the boss is doing (telegraph, strike, walk, hover, hit, death)
  function update(b, c, r, t) {
    let dt = r.t == null ? 0 : t - r.t;
    if (dt < 0 || dt > 0.12) { dt = 0; r.fresh = true; }
    r.t = t;
    if (dt === 0 && !r.fresh) return dt;
    const s = r.s, fly = !!c.fly, face = b.face || 1;
    if (r.fresh) r.face = face;
    const cx = b.cx, cy = b.cy;
    if (dt > 0 && r.x != null) { r.speed = lerp(r.speed, Math.abs(cx - r.x) / dt, clamp01(dt * 14)); r.vy = lerp(r.vy, (cy - r.y) / dt, clamp01(dt * 14)); r.vxs = lerp(r.vxs || 0, (cx - r.x) / dt, clamp01(dt * 14)); }
    r.x = cx; r.y = cy;
    const tele = b.tele > 0, moving = r.speed > 40, air = !b.onGround && !fly && !b.isDummy;
    // weight: a landing squashes the body and raises dust, and a heavy one shakes the floor; each step of a walk kicks a little dust
    if (!fly && dt > 0 && b.state === 'fight') {
      const gr = !!b.onGround;
      if (gr && r.wasGround === false && (r.airT || 0) > 0.2) { s.sy.v -= 4.5 * (c.heavy || 1); s.sx.v += 3; G.burst(cx, b.y + b.h, 9, { color: '#b9ad98', speed: 170, life: 0.5, size: 3, grav: 160, vy: -70 }); if ((c.heavy || 1) >= 1.1) G.shake(2.5, 0.12); }
      r.airT = gr ? 0 : (r.airT || 0) + dt; r.wasGround = gr;
      if (gr && r.speed > 90) { const st = Math.floor(t * (7 + Math.min(r.speed, 520) / 90) / Math.PI); if (r.step !== undefined && st !== r.step) { G.burst(cx + rand(-14, 14), b.y + b.h, 3, { color: '#a89c88', speed: 80, life: 0.35, size: 2, grav: 120, vy: -40 }); if ((c.heavy || 1) >= 1.2) G.shake(1.2, 0.08); } r.step = st; }
    }
    // a fast move leaves the last positions behind it
    if (dt > 0 && r.speed > 260 && b.state === 'fight') { r.trail = r.trail || []; if (!r.trailT || t - r.trailT > 0.04) { r.trail.push({ x: cx, y: cy }); if (r.trail.length > 4) r.trail.shift(); r.trailT = t; } }
    else if (r.trail && r.trail.length) { if (!r.trailT || t - r.trailT > 0.05) { r.trail.shift(); r.trailT = t; } }
    // the release after a telegraph: the attack drawing for a moment, with a lunge
    if (r.wasTele && !tele && b.state === 'fight') { r.strike = 0.42; r.atkI = (r.atkI + 1) % c.atk.length; if (dt > 0) { s.dx.v += face * 260; s.sx.v += 3; s.sy.v -= 2; } }
    r.wasTele = tele;
    if (b.melee && r.strike < 0.2) r.strike = 0.3;
    r.strike = Math.max(0, r.strike - dt);
    // a wound shoves the body back, along the spring
    if (b.flash > 0.08 && r.hurtK < 0.5 && dt > 0) { s.dx.v -= face * 170; s.sy.v -= 1.4; s.sx.v += 1.1; r.hurtK = 1; } if (b.flash <= 0) r.hurtK = 0;
    // which drawing
    let want = c.idle;
    const hurt = b.stunned || b.state === 'dying';
    if (hurt) want = c.hurt; else if (r.strike > 0 || (air && c.atk.length)) want = c.atk[r.atkI]; else if (b.state === 'intro' && c.intro != null && b.introT > 1.0) want = c.intro;
    if (want !== r.pose) { r.prev = r.pose; r.pose = want; r.fade = 0; }
    r.fade = Math.min(1, r.fade + dt / 0.11);
    // targets of the springs
    const T = { lean: 0, sx: 1, sy: 1, dx: 0, dy: 0, tilt: 0 };
    const br = Math.sin(t * 1.9 + (b.x || 0) * 0.01), n1 = noise(t, 2.2 + (b.x || 0) * 0.003);
    T.sy = 1 + br * 0.012; T.sx = 1 - br * 0.006; T.lean = n1 * 0.022; T.dx = n1 * 2;
    if (fly) { T.dy = Math.sin(t * 2.3 + 1) * 5 + n1 * 3; T.tilt = clamp01(Math.abs(r.speed) / 520) * 0.2 * (b.vx >= 0 ? 1 : -1) * face + (b.vy || 0) * 0.0002; }
    else if (moving && b.onGround) { const ph = t * (7 + Math.min(r.speed, 520) / 90), k = clamp01(r.speed / 420); T.dy = -Math.abs(Math.sin(ph)) * 5 * k; T.lean = 0.11 * k * (b.vx >= 0 ? 1 : -1) * face + Math.sin(ph) * 0.02 * k; T.sy = 1 + (Math.abs(Math.sin(ph)) - 0.5) * 0.04 * k; }
    if (air) { const up = (b.vy || 0) < 0; T.sy = up ? 1.09 : 1.03; T.sx = up ? 0.94 : 0.97; T.lean = 0.05 * face; }
    if (tele) { const k = clamp01((b.tele === 1 ? 1 : b.tele)); T.sy = 0.9; T.sx = 1.06; T.lean = -0.09 * face; T.dx = -face * 6 + Math.sin(t * 55) * 1.1; T.dy = fly ? -6 : 0; }
    if (r.strike > 0) { const k = r.strike / 0.42; T.sx = 1.05; T.sy = 0.97; T.lean = 0.1 * face * k; T.dx = face * 10 * k; }
    if (hurt) { T.sy = 0.94; T.lean = 0.08 * face; T.dy = fly ? 8 : 0; }
    s.lean.step(T.lean, dt); s.sx.step(T.sx, dt); s.sy.step(T.sy, dt); s.dx.step(T.dx, dt); s.dy.step(T.dy, dt); s.tilt.step(T.tilt, dt);
    r.fresh = false;
    return dt;
  }

  // draw the current pose, cross-fading from the last one, aligned on the feet
  function draw(g, b, key, t) {
    const c = CFG[key], poses = BOSS_POSES[key]; if (!c || !poses || !ready()) return false;
    const r = b._pr || (b._pr = new Rig(c)), dt = update(b, c, r, t), s = r.s;
    if (!poses[r.pose]) r.pose = c.idle; if (!poses[r.prev]) r.prev = c.idle;           // a drawing the boss does not have: its first one
    const ref = poses[c.idle], sc = Math.min(b.h * c.hm / ref[3], b.w * c.wm / ref[2]), fly = !!c.fly;
    const white = b.flash > 0, dying = b.state === 'dying', intro = b.state === 'intro';
    let alpha = 1, rise = 1;
    if (intro) { const k = clamp01(1 - b.introT / 1.4); alpha = ease(k); rise = lerp(0.82, 1, ease(k)); }
    if (dying) { const k = clamp01(b.dyingT / 2.1); alpha = 1 - easeOut(clamp01((k - 0.45) / 0.55)); rise = lerp(1, 0.9, ease(k)); }
    const flipped = (b.face || 1) * c.face < 0 ? -1 : 1;
    const baseY = fly ? b.cy : b.y + b.h, anchorY = fly ? 0.5 : 1;
    const m = MOTION[key] || {};
    const bend = (p, w, h) => {
      const x = -w / 2, y = -h * anchorY;
      if (m.flap) {                                                        // columns: the wing tips rise and fall, the body stays
        const N = 14, cw = w / N, sw = p[2] / N;
        for (let j = 0; j < N; j++) {
          const u = (j + 0.5) / N * 2 - 1, edge = Math.pow(Math.abs(u), 1.4), dy = Math.sin(t * m.fq * 6.283 - Math.abs(u) * 1.1) * m.flap * h * edge;
          g.drawImage(img, p[0] + sw * j, p[1], sw + 0.6, p[3], x + cw * j, y + dy, cw + 0.8, h);
        }
        return;
      }
      const N = 14, sh = p[3] / N, dh = h / N, amp = (m.sway || 0.01) * w, lag = clamp((r.vxs || 0) * flipped * 0.04, -0.25 * w, 0.25 * w);   // bands: sway above, a hem that trails the move below
      for (let i = 0; i < N; i++) {
        const v = (i + 0.5) / N, off = Math.sin(t * 1.8 + v * 3.2 + (b.x || 0) * 0.004) * amp * (1 - v) + Math.sin(t * 2.6 - v * 4) * amp * 0.4 * v - lag * Math.pow(v, 1.7) * (m.cloth || 0);
        g.drawImage(img, p[0], p[1] + sh * i, p[2], sh + 0.6, x + off, y + dh * i, w, dh + 0.8);
      }
    };
    const one = (pi, a) => {
      const p = poses[pi]; if (!p) return;
      const w = p[2] * sc, h = p[3] * sc;
      g.save(); g.globalAlpha *= a;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      bend(p, w, h);
      if (white) { g.globalAlpha *= 0.82; g.filter = 'brightness(0) invert(1)'; bend(p, w, h); }
      g.restore();
    };
    // the body at one place: the transform of the springs, then the drawing (or the two while they cross-fade)
    const body = (dx, dy, fade) => {
      g.save(); g.globalAlpha *= fade;
      g.translate(b.cx + dx + s.dx.x, baseY + dy + s.dy.x + (dying ? clamp01(b.dyingT / 2.1) * 18 : 0));
      if (b.state === 'dying') g.translate(Math.sin(t * 55) * 1.6 * (1 - clamp01(b.dyingT / 2.1)), 0);
      g.rotate(s.lean.x + s.tilt.x);
      g.scale(flipped * s.sx.x * rise, s.sy.x * rise);
      if (r.fade < 1 && r.prev !== r.pose) one(r.prev, 1 - r.fade);
      one(r.pose, r.fade < 1 ? r.fade : 1);
      g.restore();
    };
    if (r.trail && r.trail.length && !dying) r.trail.forEach((q, i) => { if (Math.abs(q.x - b.cx) + Math.abs(q.y - b.cy) > 14) body(q.x - b.cx, q.y - b.cy, 0.16 * (i + 1) / r.trail.length); });
    g.save(); g.globalAlpha *= alpha;
    body(0, 0, 1);
    g.restore();
    return true;
  }

  // replace Art.boss[key] for every boss with poses
  function install() {
    for (const key of Object.keys(CFG)) {
      const old = Art.boss[key];
      Art.boss[key] = function (g, b, t) {
        if (!ready() || !BOSS_POSES[key]) return old ? old(g, b, t) : undefined;
        const c = CFG[key], fly = !!c.fly;
        g.save(); g.translate(b.cx, b.y + b.h);
        if (!fly) groundD(g, Math.max(60, b.w * 0.75));
        g.restore();
        if (b.tele > 0) bloom(g, b.cx, b.cy, Math.max(b.w, b.h) * 1.3, c.glow, 0.2 + 0.24 * Math.abs(Math.sin(t * 12)));
        draw(g, b, key, t);
        bossStars(g, b, t, '#ffe98a', 0, -6);
      };
    }
  }
  install();
  return { ready, CFG, draw };
})();
