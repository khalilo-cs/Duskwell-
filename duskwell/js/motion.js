'use strict';
// Living motion for the creatures and the bosses, laid over their drawings: springs, not fixed poses. Each body crouches before it
// strikes, stretches as it leaps, squashes when it lands, gives under a blow and springs back, leans into its run, breathes when
// still and turns with a quick squeeze instead of a flat flip. Everything eases (a damped spring per value) so nothing snaps.
const Motion = (() => {
  const K = 260, C = 2 * Math.sqrt(260) * 0.55;            // spring stiffness and damping: a little overshoot, then settles
  function spring(m, key, target, dt, k, c) {
    const v = key + 'v'; m[v] += ((k || K) * (target - m[key]) - (c || C) * m[v]) * dt; m[key] += m[v] * dt;
  }
  function state(e) {
    return e._mo || (e._mo = { sx: 1, sxv: 0, sy: 1, syv: 0, rot: 0, rotv: 0, off: 0, offv: 0, t: -1, ground: e.onGround, vy: 0, flash: 0, face: e.face || 1 });
  }
  function step(e, m, dt) {
    const boss = e.isBoss, s = boss ? 1 : 0.8;
    let tx = 1, ty = 1, tr = 0;
    const stage = e.actStage || '', still = Math.abs(e.vx || 0) < 20 && e.onGround;
    if (stage === 'wind' || e.tele > 0) { ty = 0.9; tx = 1.07; tr = -0.05 * (e.face || 1); }                // gathering itself
    else if (stage === 'hit' || stage === 'run' || stage === 'dash') { ty = 1.03; tx = 0.97; tr = 0.07 * (e.face || 1); }
    else if (stage === 'crash' || e.stunned) { ty = 0.93; tx = 1.06; }
    if (!e.onGround && e.grav !== false) { const k = Math.max(-1, Math.min(1, -(e.vy || 0) / 700)); ty += 0.1 * k; tx -= 0.07 * k; }   // stretched rising, a little squat falling
    if (e.grav !== false && e.onGround && Math.abs(e.vx || 0) > 60) tr += Math.max(-0.08, Math.min(0.08, (e.vx || 0) / 5000));
    if (still && !stage) ty += Math.sin(G.t * 2.4 + (e.x || 0) * 0.01) * 0.012;                                // breathing
    // events: a landing, a blow, a turn
    if (e.onGround && !m.ground && m.vy > 250) { const k = Math.min(1, m.vy / 900); m.syv -= 6 * k * s; m.sxv += 4 * k * s; }
    if ((e.flash || 0) > m.flash + 0.02) { m.offv += 380 * s * (m.hitDir || -(e.face || 1)); m.sxv -= 2.5 * s; m.syv += 1.5 * s; }
    if ((e.face || 1) !== m.face) { m.sxv -= 7; m.face = e.face || 1; }
    m.ground = e.onGround; m.vy = e.vy || 0; m.flash = e.flash || 0;
    spring(m, 'sx', tx, dt); spring(m, 'sy', ty, dt); spring(m, 'rot', tr, dt, 180, 2 * Math.sqrt(180) * 0.7); spring(m, 'off', 0, dt, 300, 2 * Math.sqrt(300) * 0.6);
    m.sx = Math.max(0.6, Math.min(1.4, m.sx)); m.sy = Math.max(0.6, Math.min(1.4, m.sy)); m.off = Math.max(-26, Math.min(26, m.off));
  }
  // draw e through fn with its motion laid on
  function wrap(g, e, fn) {
    if (e.dead || e.dummy || e.state === 'dying') return fn();
    const m = state(e), now = G.t;
    if (m.t >= 0) { let dt = now - m.t; if (dt > 0) { dt = Math.min(dt, 1 / 20); while (dt > 1e-4) { const d = Math.min(dt, 1 / 120); step(e, m, d); dt -= d; } } }
    m.t = now;
    if (Math.abs(m.sx - 1) < 0.002 && Math.abs(m.sy - 1) < 0.002 && Math.abs(m.rot) < 0.002 && Math.abs(m.off) < 0.2) return fn();
    const px = e.x + e.w / 2, py = e.grav === false ? e.y + e.h / 2 : e.y + e.h;                              // feet for walkers, the middle for fliers
    g.save();
    g.translate(px + m.off, py); g.rotate(m.rot); g.scale(m.sx, m.sy); g.translate(-px, -py);
    try { fn(); } finally { g.restore(); }
  }
  // which side a blow came from, so the body gives the right way
  if (typeof Enemy !== 'undefined') {
    const hurt = Enemy.prototype.hurt;
    const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no vibration here */ } };
    Enemy.prototype.hurt = function (dmg, dir, how) {
      if (typeof dir === 'number') state(this).hitDir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
      const was = this.dead, r = hurt.apply(this, arguments);
      if (how !== 'burn' && !was) buzz(this.dead ? (this.isBoss ? [60, 40, 120] : 22) : this.isBoss ? 16 : 10);   // the phone feels the blow
      return r;
    };
    Object.assign(Enemy.prototype.hurt, hurt);
    if (typeof Boss !== 'undefined' && Boss.prototype.hasOwnProperty('hurt')) {
      const hb = Boss.prototype.hurt;
      Boss.prototype.hurt = function (dmg, dir, how) {
        if (typeof dir === 'number') state(this).hitDir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
        const live = this.state === 'fight' && !this.invul && !this.ghostly, r = hb.apply(this, arguments);
        if (live && how !== 'burn') buzz(this.state === 'dying' ? [60, 40, 160] : 16);
        return r;
      };
      Object.assign(Boss.prototype.hurt, hb);
    }
  }
  return { wrap };
})();
