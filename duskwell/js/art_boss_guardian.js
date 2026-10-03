'use strict';
// The Stone Guardian drawn from the owner's part sheet (art/bosses/guardian.webp, cut by tools/sprites/cut_boss.py).
// A cut-out puppet: legs, skirt, chest, collar, head, shoulders, arms, the hammer and the cloak are separate pieces moved by a
// small skeleton. The pieces are drawn exactly as drawn; only their placement and angle change.
//
// What makes the movement read as natural (all of it lives here, none of it changes the fight):
//  - nothing jumps to a pose: every angle chases its target through a damped spring (anim.js), so each move eases in, overshoots a
//    little and settles; heavy parts (the body) are slow and bouncy, light ones (the head, the cloak) lag behind and flutter
//  - attacks follow the stage the fight logic reports (setAct): a slow anticipation, a held tremor, a fast strike, an impact hold,
//    a slow recovery, the lengths taken from the real timings of the attack so what you see matches what the hitbox does
//  - the legs are driven by distance travelled, so a planted foot never slides on the floor; the body rides on whichever leg is
//    planted, rising over it and sinking between steps; a crouch spreads the legs (a sumo squat) instead of floating
//  - the hammer is a pendulum on the fist: it lags the arm, swings past and settles
//  - the cloak streams opposite to the movement; the head stays level while the body leans; turning pivots the body instead of flipping
//  - it wakes from a crouch when the fight begins, roars at the second phase, and when it dies it kneels and the stones fall apart
// Units below are pixels of the sheet; S shrinks them to the game.
const GuardianArt = (() => {
  const img = new Image(); img.src = 'art/bosses/guardian.webp';
  const R = BOSS_PARTS.guardian;
  const ready = () => img.complete && img.naturalWidth > 0;
  const S = 0.46;                                   // game pixels per sheet pixel
  const HS = 1.1, HANDLE = 0.4;                     // the hammer head's scale, and how much the long handle is shortened
  const GRIP = [86, 150];                           // where the fist closes on the handle (hammer part pixels)
  const LEG = 148;                                  // length of a leg from the hip to the sole
  const STRIDE = 40 / S;                            // how far a foot swings either side of the hip (sheet pixels)
  const { Spr, ease, easeIn, easeOut, lerp, clamp01, noise } = Anim;

  // ---------------------------------------------------------------- the pose: what each value should be, for what the boss is doing
  function targets(b, rig, t) {
    const T = { c: 0, hx: 0, lean: 0, head: 0, aA: 0.55, phi: 0, aB: -0.1, tA: 0.12, tB: -0.12, kA: 0, kB: 0, cloak: 0, sx: 1, sy: 1, air: 0, fa: 1, fh: 1, fb: 1, shake: 0, gait: 0 };
    const n1 = noise(t, 1.3), n2 = noise(t, 4.1), br = Math.sin(t * 1.55);
    const stage = b.actName + ':' + b.actStage, u = b.actDur > 0 ? clamp01(b.actT / b.actDur) : 0, at = b.actT;
    const moving = rig.speed > 60 && b.onGround;
    // standing: breathing, the weight drifting from one foot to the other, the head looking about a little
    T.hx = n1 * 4; T.lean = n1 * 0.025; T.head = n2 * 0.05 + br * 0.01; T.aA = 0.55 + br * 0.015 + n2 * 0.03; T.aB = -0.12 - br * 0.02 + n1 * 0.03; T.phi = n2 * 0.02; T.tA = 0.1 + n1 * 0.04; T.tB = -0.12 - n1 * 0.04;
    T.c = 3 + br * 1.5; T.cloak = n1 * 0.05;

    if (b.state === 'intro') {                                                              // asleep as a heap of stone, then it rises and roars
      const k = 1 - clamp01(b.introT / 2.4);
      const wake = ease((k - 0.12) / 0.3), roar = Math.sin(clamp01((k - 0.38) / 0.3) * Math.PI), up = ease((k - 0.62) / 0.3);
      T.c = lerp(48, 3, Math.max(wake * 0.6, up)); T.lean = lerp(0.34, 0, wake); T.head = lerp(0.72, -0.1, wake) - roar * 0.5; T.aA = lerp(0.2, 0.55, wake) + roar * 1.2; T.aB = lerp(0.5, -0.1, wake) + roar * 1.5; T.phi = lerp(-0.25, 0, wake); T.tA = lerp(0.2, 0.1, wake); T.tB = -T.tA;
      T.cloak = lerp(0.3, 0, wake); T.sy = 1 + roar * 0.05; T.shake = (k < 0.12 ? 0.3 : 0) + roar * 1.5; T.fa = 0.6; T.fh = 0.6;
      return T;
    }
    if (b.state === 'dying') {                                                              // the knees give, the hammer drops, the body slumps
      const k = clamp01(b.dyingT / 1.4);
      T.c = lerp(3, 78, easeIn(k)); T.lean = lerp(0, 0.5, ease(k)); T.head = lerp(0, 0.85, ease(k)); T.aA = lerp(0.55, 0.15, k); T.aB = lerp(-0.1, 0.5, k); T.phi = lerp(0, -0.55, ease(k)); T.cloak = 0.3;
      T.shake = 2.2 * (1 - k * 0.5); T.fa = 0.5; T.fh = 0.5; T.fb = 0.5; T.tA = 0.2; T.tB = -0.2; return T;
    }
    if (b.actName === 'roar') {                                                             // the phase change: chest out, head thrown back, arms wide, the hammer lifted
      const k = Math.sin(clamp01(at / 1.25) * Math.PI) ** 0.6;
      T.c = lerp(3, 14, k * 0.5); T.lean = -0.22 * k; T.head = -0.55 * k; T.aA = lerp(0.55, 1.9, k); T.aB = lerp(-0.1, 1.7, k); T.phi = lerp(0, 0.35, k); T.sy = 1 + 0.035 * k; T.shake = 1.8 * k; T.cloak = 0.2 * k;
      return T;
    }
    if (stage === 'slam:wind') {                                                            // a dip, then the hammer climbs behind the head and holds, trembling
      const dip = Math.sin(clamp01(u / 0.2) * Math.PI / 2), lift = ease((u - 0.16) / 0.66), hold = clamp01((u - 0.82) / 0.18);
      T.c = lerp(3, 16, dip) * (1 - lift * 0.4); T.lean = lerp(0.06 * dip, -0.17, lift); T.head = lerp(0.1 * dip, -0.24, lift); T.aA = lerp(0.55, 0.3, dip) + lift * 2.2; T.phi = lerp(0, 0.28, dip) + lift * 0.75; T.aB = lerp(-0.1, 0.6, lift);
      T.tA = 0.3 + lift * 0.25; T.tB = -0.3 - lift * 0.2; T.sy = 1 + lift * 0.03;
      T.shake = hold * 0.9; T.fa = 0.75; T.fh = 0.7; T.cloak = -0.12 * lift;
      return T;
    }
    if (stage === 'slam:hit') {                                                             // the strike is fast, the impact holds, then it hauls the hammer back up
      const fast = at < 0.14, hold = at < 0.5, back = ease((at - 0.5) / Math.max(0.3, b.actDur - 0.5));
      if (hold) { T.c = lerp(3, 24, easeOut(at / 0.12)); T.lean = 0.3; T.head = 0.22; T.aA = 0.78; T.phi = -2.35; T.aB = -0.55; T.tA = 0.5; T.tB = -0.42; T.sy = lerp(1, 0.95, easeOut(at / 0.1)); T.sx = lerp(1, 1.04, easeOut(at / 0.1)); T.cloak = 0.5; T.shake = at < 0.2 ? 1.6 : 0; }
      else { T.c = lerp(24, 3, back); T.lean = lerp(0.3, 0, back); T.head = lerp(0.22, 0, back); T.aA = lerp(0.78, 0.55, back); T.phi = lerp(-2.35, 0, back); T.aB = lerp(-0.55, -0.1, back); T.tA = lerp(0.5, 0.1, back); T.tB = lerp(-0.42, -0.12, back); T.cloak = lerp(0.5, 0, back); }
      T.fa = fast ? 3.2 : 0.9; T.fh = fast ? 2.8 : 0.9; T.fb = fast ? 2 : 1;
      return T;
    }
    if (stage === 'leap:wind') {                                                            // it sinks into a squat, the arms loading back; it springs
      const k = easeIn(u), tr = u > 0.7 ? Math.sin(t * 50) * 0.4 : 0;
      T.c = lerp(3, 56, ease(u)); T.lean = lerp(0, 0.34, ease(u)); T.head = lerp(0, 0.22, k); T.aA = lerp(0.55, -0.7, ease(u)); T.phi = lerp(0, 1.0, ease(u)); T.aB = lerp(-0.1, -1.0, ease(u)); T.sy = lerp(1, 0.94, k); T.sx = lerp(1, 1.05, k); T.cloak = 0.4 * k;
      T.tA = 0.2; T.tB = -0.2; T.shake = tr; T.fa = 0.8;
      return T;
    }
    if (stage === 'leap:air' || (!b.actName && !b.onGround && !b.isDummy)) {                // stretched on the way up, curled at the top, braced and falling
      const rising = b.vy < -140, apex = Math.abs(b.vy) <= 140;
      T.air = 1; T.fa = 1.5; T.fh = 1.3; T.fb = 1.4;
      if (rising) { T.c = 0; T.lean = -0.1; T.head = -0.1; T.aA = 2.0; T.phi = -0.5; T.aB = 1.7; T.tA = 0.85; T.kA = 1; T.tB = -0.25; T.kB = 1; T.sy = 1.1; T.sx = 0.94; T.cloak = 0.45; }
      else if (apex) { T.c = 0; T.lean = 0.1; T.head = 0.15; T.aA = 1.5; T.phi = -1.0; T.aB = 0.8; T.tA = 0.6; T.kA = 0.8; T.tB = -0.4; T.kB = 0.8; T.sy = 1.0; T.cloak = 0.2; }
      else { T.c = 0; T.lean = 0.2; T.head = 0.15; T.aA = 0.9; T.phi = -1.3; T.aB = -0.5; T.tA = 0.4; T.kA = 0.2; T.tB = -0.15; T.kB = 0.2; T.sy = 1.04; T.sx = 0.97; T.cloak = -0.55; }
      return T;
    }
    if (stage === 'leap:land') {                                                            // the impact: a deep squash that rebounds, the hammer dragging
      const k = clamp01(at / 0.55), sq = Math.exp(-k * 4), hold = at < 0.1;
      T.c = lerp(3, 46, hold ? 1 : sq); T.lean = 0.2 * sq; T.head = 0.2 * sq; T.aA = lerp(0.55, 0.9, sq); T.phi = lerp(0, -0.9, sq); T.aB = lerp(-0.1, -0.5, sq); T.sy = lerp(1, 0.9, sq); T.sx = lerp(1, 1.08, sq); T.cloak = 0.5 * sq;
      T.fa = hold ? 3 : 1; T.fh = hold ? 2.4 : 1; T.shake = hold ? 1.6 : 0; return T;
    }
    if (stage === 'charge:wind') {                                                          // a step back, weight low, head down: it digs in to charge
      const back = Math.sin(clamp01(u / 0.45) * Math.PI / 2), dig = ease((u - 0.4) / 0.6);
      T.c = lerp(3, 24, dig); T.lean = lerp(0, -0.12, back) + dig * 0.5; T.head = lerp(0, -0.1, back) + dig * 0.5; T.aA = lerp(0.55, -0.2, dig); T.phi = lerp(0, 1.15, dig); T.aB = lerp(-0.1, -0.7, dig);
      T.tA = 0.6 * dig + 0.1; T.tB = -0.55 * dig - 0.12; T.shake = dig * 0.9; T.cloak = 0.2; T.fa = 0.9; T.sy = 1 - 0.03 * dig;
      return T;
    }
    if (stage === 'charge:run' || moving) {                                                 // the stride is driven by the feet, see below
      T.gait = 1; T.lean = 0.34; T.head = 0.22; T.aA = 0.95; T.phi = 1.15; T.aB = -0.7; T.c = 0; T.cloak = -0.3; T.fa = 1.1;
      return T;
    }
    if (stage === 'charge:crash') {                                                         // thrown back by the wall, then slumped, dazed
      const r = at < 0.18, k = ease((at - 0.15) / 0.5);
      if (r) { T.c = -6; T.lean = -0.38; T.head = -0.5; T.aA = 1.2; T.phi = 0.4; T.aB = 1.1; T.hx = -8; T.tA = 0.6; T.tB = -0.2; T.sy = 1.04; T.cloak = 0.6; T.fa = 3; T.fh = 3; T.fb = 3; }
      else { T.c = lerp(-2, 22, k); T.lean = lerp(-0.2, 0.34, k); T.head = lerp(-0.3, 0.6, k) + Math.sin(t * 1.6) * 0.03; T.aA = lerp(1.0, 0.3, k); T.phi = lerp(0.3, -0.15, k); T.aB = lerp(0.8, 0.45, k); T.tA = 0.3; T.tB = -0.3; T.cloak = 0.2; T.fh = 0.7; }
      return T;
    }
    if (stage === 'charge:rise') {                                                          // it gathers itself and stands
      const k = ease(u);
      T.c = lerp(22, 3, k); T.lean = lerp(0.34, 0, k); T.head = lerp(0.6, 0, k); T.aA = lerp(0.3, 0.55, k); T.phi = lerp(-0.15, 0, k); T.aB = lerp(0.45, -0.1, k); T.fa = 0.7; T.fh = 0.7;
      return T;
    }
    if (b.stunned) { T.c = 22; T.lean = 0.34; T.head = 0.6; T.aA = 0.3; T.phi = -0.15; T.aB = 0.45; T.tA = 0.3; T.tB = -0.3; }
    if (b.tele > 0) T.shake = 0.6;
    return T;
  }

  // ---------------------------------------------------------------- the rig: springs, the gait, the turn
  class Rig {
    constructor() {
      const sp = (w, z) => new Spr(0, w, z);
      this.s = { c: sp(13, 0.5), hx: sp(8, 0.8), lean: sp(9, 0.65), head: sp(12, 0.4), aA: sp(11, 0.7), phi: sp(9, 0.38), aB: sp(10, 0.6), cloak: sp(7, 0.3), sx: sp(16, 0.5), sy: sp(16, 0.45), tA: sp(12, 0.75), tB: sp(12, 0.75), kA: sp(14, 0.8), kB: sp(14, 0.8), gw: sp(9, 1) };
      this.t = null; this.x = null; this.speed = 0; this.ph = 0; this.face = 1; this.turn = 1; this.turnTo = 0; this.shake = 0; this.air = 0; this.stepA = 0; this.stepB = 0; this.fresh = true; this.T = null;
    }
    update(b, t) {
      let dt = this.t == null ? 0 : t - this.t;
      if (dt < 0 || dt > 0.12) { dt = 0; this.fresh = true; }
      this.dt = dt;
      if (dt === 0 && !this.fresh) return;
      const T = targets(b, this, t), s = this.s;
      const cx = b.cx, dx = this.x == null ? 0 : cx - this.x;
      if (dt > 0) this.speed = lerp(this.speed, Math.abs(dx) / dt, clamp01(dt * 18));
      const fwd = (b.vx || 0) * (b.face || 1);
      const set = (k, v, w, z) => { if (this.fresh) s[k].snap(v); else s[k].step(v, dt, w, z); };
      // the pose values chase their targets (fa / fh / fb speed up the arm, the hammer and the other arm for a strike)
      set('c', T.c); set('hx', T.hx); set('lean', T.lean); set('head', T.head); set('sx', T.sx); set('sy', T.sy);
      set('aA', T.aA, 11 * T.fa); set('phi', T.phi - Math.max(-0.5, Math.min(0.5, s.aA.v * 0.03)), 9 * T.fh); set('aB', T.aB, 10 * T.fb);
      set('tA', T.tA); set('tB', T.tB); set('kA', T.kA); set('kB', T.kB);
      // the cloak streams opposite to the run; rising drags it down, falling lifts it
      set('cloak', Math.max(-0.7, Math.min(0.7, T.cloak - Math.max(-1, Math.min(1, fwd / 520)) * 0.7 + (b.vy || 0) * -0.0003)));
      set('gw', T.gait && b.onGround ? 1 : 0);
      this.T = T; this.shake = T.shake; this.air = T.air;
      // the gait advances with the ground actually covered, so a planted foot does not slide
      if (b.onGround && dt > 0) this.ph = (this.ph + Math.abs(dx) / (4 * STRIDE * S)) % 1;
      // turning: the body pivots through a quick crouch, the mirror happens halfway
      if (!this.fresh && (b.face || 1) !== this.face && !this.turnTo && this.turn >= 1) { this.turnTo = b.face || 1; this.turn = 0; }
      if (this.turn < 1) { this.turn = Math.min(1, this.turn + dt / 0.22); if (this.turn >= 0.5 && this.turnTo) { this.face = this.turnTo; this.turnTo = 0; } }
      else if (this.fresh) this.face = b.face || 1;
      this.x = cx; this.t = t; this.fresh = false;
    }
  }

  function put(g, name, ax, ay, x, y, a, sx, sy, white) {
    const r = R[name]; g.save(); g.translate(x, y); if (a) g.rotate(a); if (sx || sy) g.scale(sx || 1, sy || 1);
    g.drawImage(img, r[0], r[1], r[2], r[3], -ax, -ay, r[2], r[3]);
    if (white) { g.globalAlpha *= 0.85; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, r[0], r[1], r[2], r[3], -ax, -ay, r[2], r[3]); }
    g.restore();
  }
  // the cloak as vertical strips that ripple, the tail rippling more than the collar
  function cloak(g, x, y, a, wave, t, white) {
    const r = R.cloak, W = r[2], ax = 22, ay = 10, n = Math.ceil(W / 3);
    g.save(); g.translate(x, y); g.rotate(a);
    for (let i = 0; i < n; i++) {
      const sx = i * 3, sw = Math.min(3, W - sx), d = Math.abs(sx - ax) / W, dy = Math.sin(t * 6.5 - sx * 0.12) * wave * d * 3;
      g.drawImage(img, r[0] + sx, r[1], sw, r[3], sx - ax, -ay + dy, sw + 0.6, r[3]);
      if (white) { g.save(); g.globalAlpha *= 0.85; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, r[0] + sx, r[1], sw, r[3], sx - ax, -ay + dy, sw + 0.6, r[3]); g.restore(); }
    }
    g.restore();
  }
  // when it dies the stones fall apart: each piece gets its own push, falls, spins and comes to rest on the ground
  const SCATTER = { head: [-40, -170, 0.9], core: [10, -120, -0.5], collar: [-30, -140, 0.6], shoulder_a: [-120, -110, -1.1], shoulder_b: [110, -100, 1.2], arm_a: [-110, -60, -0.9], arm_b: [100, -40, 1.0], leg_a: [-70, 10, 0.5], leg_b: [70, 10, -0.4], skirt: [0, -20, 0.3], hammer: [-130, -60, 1.5], chain: [-40, -10, 2], cloak: [120, -30, 0.7] };
  function scatter(name, k, floor) {
    const s = SCATTER[name] || [0, 0, 0]; if (k <= 0) return [0, 0, 0];
    const tt = k * 1.25, y = s[1] * tt * 0.6 + 380 * tt * tt;
    return [s[0] * tt, Math.min(y, floor), s[2] * tt * 1.4];
  }

  // ---------------------------------------------------------------- drawing
  function draw(g, b, t) {
    const rig = b._rig || (b._rig = new Rig());
    rig.update(b, t);
    const s = rig.s, white = b.flash > 0, ph2 = (b.phase || 1) >= 2, dead = b.state === 'dying';
    const sc = dead ? clamp01((b.dyingT - 1.0) / 1.2) : 0;
    const turnW = rig.turn < 1 ? 1 - 0.16 * Math.sin(rig.turn * Math.PI) : 1;
    g.save();
    // the sheet faces left, the game draws facing right; the visual face lags the logical one during a turn
    g.scale(-S * rig.face * turnW, S);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    if (rig.shake) g.translate(Math.sin(t * 70) * rig.shake * 0.55 / S, 0);
    const crouch = Math.max(-10, s.c.x) + (rig.turn < 1 ? 10 * Math.sin(rig.turn * Math.PI) : 0);
    // the legs: a pose, or the gait; the hip rides on the planted leg
    const gw = clamp01(s.gw.x), u = rig.ph;
    const gaitLeg = p => {
      const q = (u + p) % 1; let x, lift = 0;
      if (q < 0.5) x = STRIDE * (1 - 4 * q);                                                // planted: the foot slides back under the body as it moves forward
      else { const k = (q - 0.5) * 2; x = -STRIDE + 2 * STRIDE * ease(k); lift = Math.sin(k * Math.PI) * 15 / S; }
      return { th: Math.asin(Math.max(-0.95, Math.min(0.95, x / LEG))), lift };
    };
    const gA = gaitLeg(0), gB = gaitLeg(0.5);
    const tc = Math.acos(clamp01(1 - Math.max(0, crouch) / LEG));                            // a crouch spreads the legs
    const pA = { th: s.tA.x + tc, lift: Math.max(0, s.kA.x) * 24 / S }, pB = { th: s.tB.x - tc, lift: Math.max(0, s.kB.x) * 24 / S };
    const LA = { th: lerp(pA.th, gA.th, gw), lift: lerp(pA.lift, gA.lift, gw) }, LB = { th: lerp(pB.th, gB.th, gw), lift: lerp(pB.lift, gB.lift, gw) };
    const air = rig.air > 0 || !b.onGround;
    const ground = Math.max(LEG * Math.cos(LA.th) - LA.lift, LEG * Math.cos(LB.th) - LB.lift);
    const hipY = -(air ? LEG * Math.max(Math.cos(LA.th), Math.cos(LB.th)) : ground);
    const hipX = s.hx.x + Math.sin(s.lean.x) * 6;
    const H = [hipX, hipY];
    // footfalls: dust and a dull thud when a foot comes down at speed
    if (!b.isDummy && gw > 0.8 && rig.speed > 220) {
      const sa = u < 0.5 ? 1 : 0, sb = ((u + 0.5) % 1) < 0.5 ? 1 : 0;
      if (sa && !rig.stepA) footfall(b, LA); if (sb && !rig.stepB) footfall(b, LB);
      rig.stepA = sa; rig.stepB = sb;
    } else { rig.stepA = rig.stepB = 0; }
    const sxs = s.sx.x, sys = s.sy.x, lean = s.lean.x, tw = Math.sin(u * Math.PI * 2) * 0.04 * gw;
    // a point on the upper body: an offset from the hip, scaled (squash and stretch), leaned and twisted
    const up = (dx, dy, extra) => { const a = lean * 0.55 + (extra || 0), x = dx * sxs, y = dy * sys; return [H[0] + x * Math.cos(a) - y * Math.sin(a), H[1] + x * Math.sin(a) + y * Math.cos(a)]; };
    const P = (name, ax, ay, x, y, a, sx, sy) => { const d = scatter(name, sc, 0); put(g, name, ax, ay, x + d[0], y + d[1], (a || 0) + d[2], sx, sy, white); };
    // ----- behind the body: the cloak, the back leg and the back arm
    const sB = up(92, -100, -tw);
    { const d = scatter('cloak', sc, 0); g.save(); g.translate(d[0], d[1]); g.rotate(d[2] * 0.3);
      cloak(g, sB[0] - 4, sB[1] + 4, s.cloak.x + Math.sin(t * 2.7) * 0.03, 0.6 + rig.speed / 160, t, white); g.restore(); }
    P('leg_b', 47, 10, H[0] + 28, hipY - LB.lift, LB.th, 1.07, 1.07);
    P('arm_b', 38, 14, sB[0], sB[1], s.aB.x + Math.sin(u * Math.PI * 2) * 0.28 * gw, 1, 1);
    P('leg_a', 44, 10, H[0] - 22, hipY - LA.lift, LA.th, 1, 1);
    // ----- skirt and chain at the belt (they swing with the lean and the stride)
    P('skirt', 42, 6, H[0], H[1] - 6, Math.sin(t * 2.1) * 0.02 - lean * 0.35 + Math.sin(u * Math.PI * 2) * 0.05 * gw, 1.25, 0.62);
    P('chain', 22, 4, H[0] - 38, H[1] - 10, Math.sin(t * 2.6 + 1) * 0.06 + Math.sin(u * Math.PI * 4) * 0.16 * gw - lean * 0.5, 0.9, 0.9);
    // ----- the chest, the collar, the head
    const core = up(0, -68), collar = up(-2, -98), head = up(-2, -134), shB = up(84, -106, -tw), shA = up(-84, -106, tw);
    P('core', 58, 45, core[0], core[1], lean * 0.55 + tw * 0.4, sxs, sys);
    P('collar', 78, 52, collar[0], collar[1], lean * 0.55, sxs, sys);
    P('head', 52, 66, head[0], head[1], s.head.x + lean * 0.1, 1, 1);
    P('shoulder_b', 56, 66, shB[0], shB[1], 0.05 + lean * 0.4 + tw, 1, 1);
    // ----- the hammer arm: the fist closes on the handle wherever the arm points; the hammer swings from the fist
    const sA = up(-90, -100, tw), aAng = s.aA.x + Math.sin(u * Math.PI * 2 + 3.1) * 0.06 * gw, armLen = 160;
    const fist = [sA[0] - Math.sin(aAng) * armLen, sA[1] + Math.cos(aAng) * armLen];
    const hd = scatter('hammer', sc, 0);
    // a fast swing leaves a smear: the hammer drawn again where it was a moment ago, fading (as in hand-drawn animation)
    const hist = rig.hist || (rig.hist = []);
    if (rig.dt > 0) { hist.unshift({ x: fist[0], y: fist[1], a: s.phi.x }); if (hist.length > 4) hist.pop(); }
    const dphi = hist.length > 1 ? Math.abs(hist[0].a - hist[1].a) : 0;
    if (dphi > 0.18 && !white) for (let i = 1; i < hist.length; i++) { const hh = hist[i]; drawHammer(g, hh.x, hh.y, hh.a, Math.min(0.34, dphi * 0.6) * (1 - i / hist.length), false); }
    drawHammer(g, fist[0] + hd[0], fist[1] + hd[1], s.phi.x + hd[2], 1, white);
    P('arm_a', 42, 14, sA[0], sA[1], aAng, 1, 1);
    P('shoulder_a', 60, 62, shA[0], shA[1], -0.05 + lean * 0.4 - tw, 1, 1);
    // ----- phase two: the cracks burn
    if (ph2 && !white && !dead) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 5.5);
      g.globalCompositeOperation = 'lighter';
      for (const [x, y, r, a] of [[core[0], core[1], 110, 0.5], [fist[0] + Math.sin(s.phi.x) * 90, fist[1] - Math.cos(s.phi.x) * 90, 130, 0.45], [shA[0], shA[1], 80, 0.25], [shB[0], shB[1], 80, 0.25]]) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,150,40,' + (a * pulse) + ')'); gr.addColorStop(1, 'rgba(255,90,10,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 9; i++) {                                                          // embers climbing off the stone
        const k = (t * 0.55 + i * 0.113) % 1, x = H[0] + Math.sin(i * 12.9 + t) * 120 - 10, y = hipY - 40 - k * 280;
        g.fillStyle = 'rgba(255,' + (150 + 60 * (1 - k)) + ',60,' + (0.8 * (1 - k)) + ')'; g.beginPath(); g.arc(x, y, 7 * (1 - k * 0.6), 0, 7); g.fill();
      }
    }
    g.restore();
  }
  const HHEAD = 108;
  // the hammer, hanging from the fist (the origin of the drawing is the grip): the head at full width, the long handle shortened
  function drawHammer(g, x, y, a, alpha, white) {
    const hm = R.hammer, gap = (GRIP[1] - HHEAD) * HANDLE * HS, ox = -GRIP[0] * HS, w = hm[2] * HS;
    g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha *= alpha;
    g.drawImage(img, hm[0], hm[1] + HHEAD, hm[2], GRIP[1] - HHEAD, ox, -gap, w, gap);
    g.drawImage(img, hm[0], hm[1] + GRIP[1], hm[2], hm[3] - GRIP[1], ox, 0, w, (hm[3] - GRIP[1]) * HANDLE * HS);
    g.drawImage(img, hm[0], hm[1], hm[2], HHEAD, ox, -gap - HHEAD * HS, w, HHEAD * HS);
    if (white) { g.globalAlpha *= 0.85; g.filter = 'brightness(0) invert(1)'; g.drawImage(img, hm[0], hm[1], hm[2], HHEAD, ox, -gap - HHEAD * HS, w, HHEAD * HS); }
    g.restore();
  }
  function footfall(b, L) {
    const x = b.cx + (b.face || 1) * (Math.sin(L.th) * LEG * S), y = b.y + b.h;
    G.burst(x, y - 2, 3, { color: '#8a94a0', speed: 70, life: 0.35, size: 3, vy: -40 });
    Sound.play('clunk');
  }

  return { ready, draw, S, Rig };
})();

Art.boss.guardian = (function (old) {
  return function (g, b, t) {
    if (!GuardianArt.ready()) return old(g, b, t);
    g.save(); g.translate(b.cx, b.y + b.h);
    if (b.state === 'dying') g.translate(Math.sin(t * 60) * 1.2, 0);
    g.save(); g.scale(b.face || 1, 1); telGlow(g, b, '#ffb347', 0, -60, 130); groundD(g, 74); g.restore();
    GuardianArt.draw(g, b, t);
    g.restore();
    bossStars(g, b, t, '#ffe98a', 0, -6);
  };
})(Art.boss.guardian);
