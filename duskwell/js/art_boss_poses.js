'use strict';
// The bosses drawn from the owner's assembled poses (art/bosses/poses.webp, cut by tools/sprites/cut_boss_poses.py): each boss has two
// or three finished drawings (standing, attacking, hurt or enraged). The pictures are drawn exactly as drawn; what is added is motion
// computed from what the boss is doing, in the same spirit as the Stone Guardian's puppet but for a whole drawing:
//  - every value (lean, squash, lunge, hover) chases its target through a damped spring (anim.js), so nothing snaps: moves ease in,
//    overshoot a little and settle, and a heavy boss is slower and bouncier than a light one
//  - the telegraph is an anticipation: the body gathers (squashes, leans back, trembles) while the boss glows; the attack is the release:
//    the attack drawing replaces the standing one with a lunge forward that decays through the spring
//  - walking bobs with each step and leans into the direction of travel; flyers hover and tilt with their speed
//  - a hit pushes the body back along the spring and flashes it white; stun and death use the hurt drawing; death sinks and fades
//  - changing drawings cross-fades quickly, aligned on the feet (or the centre for flyers), so the silhouette never pops
// The Stone Guardian has its own, jointed rig (art_boss_guardian.js).
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
    roc:         { idle: 0, atk: [1], hurt: 1, face: 1, hm: 2.4, wm: 2.7, heavy: 1.1, glow: '#a8c0ff', fly: true },
    regent:      { idle: 0, atk: [1, 2], hurt: 0, face: 1, hm: 1.55, wm: 2.8, heavy: 1.0, glow: '#c8a0ff', fly: true },
    wraith:      { idle: 0, atk: [1], hurt: 0, face: 1, hm: 2.4, wm: 3.0, heavy: 1.2, glow: '#9fd0ff', fly: true },
    duelist:     { idle: 0, atk: [1], hurt: 0, face: -1, hm: 2.1, wm: 6, heavy: 1.4, glow: '#d4ccff', dash: true },
    twin:        { idle: 0, atk: [0], hurt: 0, face: -1, hm: 2.4, wm: 6, heavy: 1.4, glow: '#ff6a8a', dash: true },
    bonewright:  { idle: 0, atk: [0], hurt: 0, face: 1, hm: 1.85, wm: 4.2, heavy: 0.9, glow: '#ffe0a0' },
    marrow:      { idle: 0, atk: [0], hurt: 0, face: 1, hm: 1.65, wm: 2.4, heavy: 0.75, glow: '#ff5a5a' },
    stargazer:   { idle: 0, atk: [1], hurt: 0, face: 1, hm: 1.95, wm: 5, heavy: 1.2, glow: '#9fb8ff', fly: true },
    king:        { idle: 0, atk: [0, 1], hurt: 0, face: 1, hm: 1.75, wm: 3.2, heavy: 0.9, glow: '#ffffff', intro: 1 },
  };

  class Rig {
    constructor(c) {
      const k = c.heavy || 1, sp = (w, z) => new Spr(0, w * k, z);
      this.s = { lean: sp(8, 0.5), sx: sp(14, 0.45), sy: sp(14, 0.4), dx: sp(10, 0.55), dy: sp(10, 0.5), tilt: sp(7, 0.6) };
      this.s.sx.snap(1); this.s.sy.snap(1);
      this.t = null; this.x = null; this.y = null; this.speed = 0; this.vy = 0; this.pose = c.idle; this.prev = c.idle; this.fade = 1; this.strike = 0; this.wasTele = false; this.flip = 0;
      this.hurtK = 0; this.atkI = 0; this.fresh = true; this.face = 1; this.dying = 0;
    }
  }

  function update(b, c, r, t) {
    let dt = r.t == null ? 0 : t - r.t;
    if (dt < 0 || dt > 0.12) { dt = 0; r.fresh = true; }
    r.t = t;
    if (dt === 0 && !r.fresh) return dt;
    const s = r.s, fly = !!c.fly, face = b.face || 1;
    if (r.fresh) r.face = face;
    const cx = b.cx, cy = b.cy;
    if (dt > 0 && r.x != null) { r.speed = lerp(r.speed, Math.abs(cx - r.x) / dt, clamp01(dt * 14)); r.vy = lerp(r.vy, (cy - r.y) / dt, clamp01(dt * 14)); }
    r.x = cx; r.y = cy;
    const tele = b.tele > 0, moving = r.speed > 40, air = !b.onGround && !fly && !b.isDummy;
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

  function draw(g, b, key, t) {
    const c = CFG[key], poses = BOSS_POSES[key]; if (!c || !poses || !ready()) return false;
    const r = b._pr || (b._pr = new Rig(c)), dt = update(b, c, r, t), s = r.s;
    const ref = poses[c.idle], sc = Math.min(b.h * c.hm / ref[3], b.w * c.wm / ref[2]), fly = !!c.fly;
    const white = b.flash > 0, dying = b.state === 'dying', intro = b.state === 'intro';
    let alpha = 1, rise = 1;
    if (intro) { const k = clamp01(1 - b.introT / 1.4); alpha = ease(k); rise = lerp(0.82, 1, ease(k)); }
    if (dying) { const k = clamp01(b.dyingT / 2.1); alpha = 1 - easeOut(clamp01((k - 0.45) / 0.55)); rise = lerp(1, 0.9, ease(k)); }
    const flipped = (b.face || 1) * c.face < 0 ? -1 : 1;
    const baseY = fly ? b.cy : b.y + b.h, anchorY = fly ? 0.5 : 1;
    const one = (pi, a) => {
      const p = poses[pi], w = p[2] * sc, h = p[3] * sc;
      g.save(); g.globalAlpha *= a;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, p[0], p[1], p[2], p[3], -w / 2, -h * anchorY, w, h);
      if (white) { g.globalAlpha *= 0.82; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, p[0], p[1], p[2], p[3], -w / 2, -h * anchorY, w, h); }
      g.restore();
    };
    g.save(); g.globalAlpha *= alpha;
    g.translate(b.cx + s.dx.x, baseY + s.dy.x + (dying ? clamp01(b.dyingT / 2.1) * 18 : 0));
    if (b.state === 'dying') g.translate(Math.sin(t * 55) * 1.6 * (1 - clamp01(b.dyingT / 2.1)), 0);
    g.rotate(s.lean.x + s.tilt.x);
    g.scale(flipped * s.sx.x * rise, s.sy.x * rise);
    if (r.fade < 1 && r.prev !== r.pose) one(r.prev, 1 - r.fade);
    one(r.pose, r.fade < 1 ? r.fade : 1);
    g.restore();
    return true;
  }

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
