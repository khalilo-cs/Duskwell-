'use strict';
// The creatures of the Ossuary and the Lunar Observatory. Each brain is one switch over currentState, like the
// older enemies in entities.js: the Heap (rises, and rises again once), the Skull Bat (spits teeth), the Censer
// (a swinging thurible that breathes wisps), the Lensling (aims a ray), the Orrery (a core and three orbits) and
// the Lunar Hare (leaps; in low gravity it flies).

// projectile palettes of the two areas (see tintedProj in art_sprites.js)
const BONEP = { fill: '#efe6d0', fill2: '#ffffff', glow: '#d8f0d0', rgb: '230,225,200', base: '#6a5a44' };
const WISPP = { fill: '#bfe8d0', fill2: '#f0fff6', glow: '#9fe8c0', rgb: '160,232,192' };
const STARP = { fill: '#dfe6ff', fill2: '#ffffff', glow: '#b8c4ff', rgb: '200,210,255', base: '#2a3060' };

// the length a ray can travel from (x, y) along angle a before it meets a wall
function rayLength(x, y, a, max) {
  const L = G.level, dx = Math.cos(a), dy = Math.sin(a);
  for (let d = 0; d < max; d += 8) if (L.solidAtPx(x + dx * d, y + dy * d)) return d;
  return max;
}
// the part of a line of light that wounds: spawns a ray that warns for tele seconds, then burns for dur
function spawnRay(x, y, a, o) {
  o = o || {};
  G.projs.push(new Proj({ kind: 'ray', x, y, a, len: rayLength(x, y, a, o.len || 760), rw: o.rw || 16, tele: o.tele == null ? 0.5 : o.tele, dur: o.dur || 0.24, dmg: 1, life: 4, pierce: true, passWalls: true, color: o.color || '#cfe0ff', pal: o.pal }));
}

// ---------------------------------------------------------------- the Heap
class BoneHeap extends Enemy {
  constructor(d) {
    super(d, 34, 46); this.hp = 7; this.geo = 5; this.kb = 0.8; this.blood = '#efe6d0'; this.dmg = 0; this.revived = false;
    this.currentState = 'pile'; this.rise = 0;
  }
  hb() {
    const s = this.currentState, b = this.y + this.h;
    if (s === 'pile' || s === 'reform') return { x: this.x, y: b - 16, w: this.w, h: 16 };
    if (s === 'skull') return { x: this.x + 8, y: b - 18, w: 18, h: 18 };
    if (s === 'rising') { const h = 16 + 30 * clamp(this.stateT / 0.6, 0, 1); return { x: this.x, y: b - h, w: this.w, h }; }
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
  body() {
    const s = this.currentState;
    if (s === 'slash') { const b = this.hb(); return { x: this.face > 0 ? b.x + 4 : b.x - 40, y: b.y + 6, w: this.w + 36, h: b.h - 8 }; }
    return this.hb();
  }
  hurt(dmg, dir, how) {
    if (this.currentState === 'rising' || this.currentState === 'reform') { Sound.play('clank'); return false; }     // the bones are still gathering
    return super.hurt(dmg, dir, how);
  }
  onHurt(dir, how) {
    const s = this.currentState;
    if (s === 'pile' || s === 'skull' || s === 'rising' || s === 'reform') { G.burst(this.cx, this.cy + 10, 6, { color: '#efe6d0', speed: 140, life: 0.3, size: 3 }); return; }
    super.onHurt(dir, how);
  }
  kill() {
    const s = this.currentState;
    if (!this.revived && (s === 'walk' || s === 'windup' || s === 'slash' || s === ST.RECOIL)) {            // it falls apart... and the skull waits
      this.revived = true; this.hp = 1; this.dmg = 0; this.vx = 0; this.setState('skull');
      Sound.play('creak'); G.shake(3, 0.12);
      G.burst(this.cx, this.cy, 18, { color: '#efe6d0', speed: 240, life: 0.6, size: 4 }); return;
    }
    super.kill();
  }
  update(dt) {
    this.tick(dt);
    const p = G.player, dist = Math.abs(p.cx - this.cx);
    switch (this.currentState) {
      case 'pile':
        this.dmg = 0; this.vx = 0;
        if (this.stateT > 0.5 && dist < 150 && Math.abs(p.cy - this.cy) < 110 && this.seesPlayer(260)) { this.setState('rising'); Sound.play('creak'); }
        break;
      case 'rising':
        this.dmg = 0; this.vx = 0; this.face = p.cx > this.cx ? 1 : -1;
        if (Math.random() < 0.4) G.burst(this.cx + rand(-14, 14), this.y + this.h - 10, 1, { color: '#efe6d0', speed: 60, life: 0.4, size: 3, vy: -80 });
        if (this.stateT >= 0.6) { this.hp = this.revived ? 9 : 15; this.dmg = 1; this.setState('walk'); }
        break;
      case 'walk':
        this.dmg = 1;
        if (this.onGround) {
          this.face = p.cx > this.cx ? 1 : -1;
          this.vx = this.edgeAhead(this.face) ? 0 : this.face * 66;
          if (this.stateT > 0.6 && dist < 74 && Math.abs(p.cy - this.cy) < 70) { this.vx = 0; this.setState('windup'); Sound.play('tele'); }
        }
        break;
      case 'windup':
        this.vx = 0; this.face = p.cx > this.cx ? 1 : -1;
        if (this.stateT > 0.4) { this.setState('slash'); Sound.play('slash'); }
        break;
      case 'slash':
        this.vx = this.face * 90;
        if (this.stateT > 0.17) this.setState('walk');
        break;
      case ST.RECOIL:
        if (this.onGround) this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState('walk');
        break;
      case 'skull':
        this.dmg = 0; this.vx = 0;
        if (this.stateT > 2.4) { this.setState('reform'); Sound.play('creak'); }
        break;
      case 'reform':
        this.dmg = 0; this.vx = 0;
        if (Math.random() < 0.5) G.burst(this.cx + rand(-24, 24), this.y + this.h - rand(0, 30), 1, { color: '#efe6d0', speed: 80, life: 0.3, size: 3 });
        if (this.stateT > 0.8) this.setState('rising');
        break;
    }
    this.physics(dt);
    if (this.hitL || this.hitR) this.vx = 0;
  }
}

// ---------------------------------------------------------------- the Skull Bat
class SkullBat extends Flyer {
  constructor(d) { super(d); this.hp = 9; this.geo = 5; this.blood = '#efe6d0'; this.spit = rand(1, 2.2); this.glowR = 70; }
  update(dt) {
    this.tick(dt); this.spit -= dt;
    const p = G.player, sees = this.seesPlayer(340);
    if (sees) this.lastSeen = this.t;
    switch (this.currentState) {
      case ST.IDLE:
        this.steer(this.home.x + Math.sin(this.t * 0.8 + this.ph) * 40, this.home.y + Math.sin(this.t * 1.9 + this.ph) * 14, 60, 200, dt);
        if (sees) this.setState(ST.CHASE);
        break;
      case ST.CHASE:                // hangs above you, side to side, and drops teeth
        this.steer(p.cx + Math.sin(this.t * 1.1) * 150, p.cy - 112 + Math.sin(this.t * 3.2) * 12, 125, 380, dt);
        if (this.spit <= 0 && sees) { this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (p.dead || this.t - this.lastSeen > 2.2) this.setState(ST.IDLE);
        break;
      case ST.ANTICIPATION:         // the jaw drops open
        this.vx *= 0.88; this.vy *= 0.88; this.face = p.cx > this.cx ? 1 : -1;
        if (this.stateT > 0.46) {
          const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
          Sound.play('shoot');
          for (const o of [-0.3, 0, 0.3]) G.projs.push(new Proj({ kind: 'shard', x: this.cx, y: this.cy + 6, vx: Math.cos(a + o) * 250, vy: Math.sin(a + o) * 250, r: 7, dmg: 1, color: '#efe6d0', life: 2.6, rot: a + o, pal: BONEP }));
          this.spit = rand(2.2, 3.2); this.setState(ST.CHASE);
        }
        break;
      case ST.RECOIL:
        this.vx *= 0.94; this.vy *= 0.94;
        if (this.stateT > 0.2) this.setState(ST.CHASE);
        break;
    }
    this.physics(dt, false);
    if (this.hitL || this.hitR) this.vx = 0; if (this.hitU || this.onGround) this.vy = 0;
  }
}

// ---------------------------------------------------------------- the Censer
// A thurible on a chain from the ceiling. It swings, glows when it has seen you, and breathes a ring of green wisps.
class Censer extends Enemy {
  constructor(d) {
    super(d, 34, 44); this.hp = 16; this.geo = 6; this.kb = 0; this.blood = '#bfe8d0'; this.glowR = 150;
    this.ax = d.x * TILE + TILE / 2; this.ay = d.y * TILE; this.len = (d.len || 4) * TILE; this.amp = d.amp || 0.55; this.ph = rand(0, 6);
    this.cool = rand(1, 2.5); this.tele = 0; this.ang = 0; this.place();
  }
  place() { this.ang = this.amp * Math.sin(this.t * 1.15 + this.ph); this.x = this.ax + Math.sin(this.ang) * this.len - this.w / 2; this.y = this.ay + Math.cos(this.ang) * this.len - this.h / 2; }
  update(dt) {
    this.t += dt; this.flash -= dt; this.stateT += dt;
    this.place();
    if (this.tele > 0) { this.tele -= dt; if (this.tele <= 0) this.fire(); }
    else { this.cool -= dt; if (this.cool <= 0 && this.seesPlayer(440)) { this.tele = 0.6; this.cool = 3.4; Sound.play('tele'); } }
  }
  fire() {
    Sound.play('cast');
    const n = 6, a0 = rand(0, 6.28);
    for (let i = 0; i < n; i++) { const a = a0 + i * Math.PI * 2 / n; G.projs.push(new Proj({ kind: 'orb', x: this.cx, y: this.cy, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 8, dmg: 1, life: 2.6, color: '#9fe8c0', pal: WISPP })); }
    G.burst(this.cx, this.cy, 10, { color: '#bfe8d0', speed: 140, life: 0.4, size: 3, grav: -40 });
  }
}

// ---------------------------------------------------------------- the Lensling
class Lensling extends Enemy {
  constructor(d) { super(d, 36, 30); this.hp = 14; this.geo = 5; this.kb = 0.7; this.blood = '#e8d8ff'; this.glowR = 90; this.cool = rand(0.5, 1.4); this.aim = 0; }
  eye() { return { x: this.cx + this.face * 8, y: this.y + 11 }; }
  update(dt) {
    this.tick(dt); this.cool -= dt;
    const p = G.player;
    switch (this.currentState) {
      case ST.IDLE: this.setState(ST.PATROL); break;
      case ST.PATROL:
        if (this.onGround) this.walkPatrol(34, dt);
        if (this.cool <= 0 && this.seesPlayer(460)) { this.vx = 0; this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        break;
      case ST.ANTICIPATION: {        // the lens swings after you, then locks
        this.vx = 0; const e = this.eye(), want = Math.atan2(p.cy - e.y, p.cx - e.x);
        if (this.stateT < 0.6) { let d = want - this.aim; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; this.aim += d * Math.min(1, dt * 7); this.face = Math.cos(this.aim) >= 0 ? 1 : -1; }
        if (this.stateT > 0.95) { spawnRay(e.x, e.y, this.aim, { tele: 0.1, dur: 0.24, rw: 14, pal: STARP }); Sound.play('rend'); this.setState(ST.ATTACK); }
        break;
      }
      case ST.ATTACK:
        if (this.stateT > 0.4) { this.cool = 2.3; this.setState(ST.PATROL); }
        break;
      case ST.RECOIL:
        if (this.onGround) this.vx *= 0.85;
        if (this.stateT > 0.2) { this.cool = 1; this.setState(ST.PATROL); }
        break;
    }
    this.physics(dt);
    if (this.hitL) this.face = 1; if (this.hitR) this.face = -1;
  }
}

// ---------------------------------------------------------------- the Orrery
class Orrery extends Enemy {
  constructor(d) { super(d, 30, 30); this.hp = 22; this.geo = 8; this.kb = 0.5; this.blood = '#ffe9a0'; this.glowR = 130; this.ph = rand(0, 6); this.orbA = rand(0, 6); this.R = 46; }
  orbPos(i) { const a = this.orbA + i * Math.PI * 2 / 3; return { x: this.cx + Math.cos(a) * this.R, y: this.cy + Math.sin(a) * this.R * 0.8 }; }
  update(dt) {
    this.tick(dt); this.orbA += dt * 2.3;
    const p = G.player, sees = this.seesPlayer(360);
    if (sees) this.lastSeen = this.t;
    const steer = (tx, ty, sp, acc) => { const dx = tx - this.cx, dy = ty - this.cy, d = Math.hypot(dx, dy) || 1; this.vx = approach(this.vx, dx / d * sp, acc * dt); this.vy = approach(this.vy, dy / d * sp, acc * dt); };
    switch (this.currentState) {
      case ST.IDLE:
        steer(this.home.x + Math.sin(this.t * 0.7 + this.ph) * 36, this.home.y + Math.sin(this.t * 1.5 + this.ph) * 14, 40, 160);
        if (sees) this.setState(ST.CHASE);
        break;
      case ST.CHASE:
        steer(p.cx, p.cy - 36 + Math.sin(this.t * 2) * 14, 52, 140);
        if (p.dead || this.t - this.lastSeen > 2.5) this.setState(ST.IDLE);
        break;
      case ST.RECOIL:
        this.vx *= 0.94; this.vy *= 0.94;
        if (this.stateT > 0.2) this.setState(ST.CHASE);
        break;
    }
    this.physics(dt, false);
    if (this.hitL || this.hitR) this.vx = 0; if (this.hitU || this.onGround) this.vy = 0;
    if (!p.dead) for (let i = 0; i < 3; i++) { const o = this.orbPos(i); if (overlap(p.hurtbox(), { x: o.x - 8, y: o.y - 8, w: 16, h: 16 })) p.hurt(1, o.x); }
  }
}

// ---------------------------------------------------------------- the Lunar Hare
class LunarHare extends Enemy {
  constructor(d) { super(d, 34, 30); this.hp = 12; this.geo = 4; this.blood = '#e0e8ff'; this.wait = rand(0.5, 1.5); }
  update(dt) {
    this.tick(dt);
    const p = G.player;
    switch (this.currentState) {
      case ST.IDLE:
        if (this.onGround) this.vx *= 0.8;
        if (this.onGround && this.stateT > this.wait && this.seesPlayer(420)) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); }
        break;
      case ST.ANTICIPATION:         // ears back, a crouch
        this.vx = 0;
        if (this.stateT > 0.3) { this.vy = -560; this.vx = this.face * rand(170, 220); this.onGround = false; this.setState(ST.ATTACK); Sound.play('bounce'); }
        break;
      case ST.ATTACK:
        if (this.onGround && this.stateT > 0.12) { this.wait = rand(0.8, 1.5); this.setState(ST.IDLE); }
        break;
      case ST.RECOIL:
        if (this.onGround) this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState(ST.IDLE);
        break;
    }
    const gz = G.level.gravAt(this.cx, this.cy);                                     // a hop in low gravity is a flight
    this.vy = Math.min(this.vy + GRAV * (gz ? gz.k : 1) * dt, MAXFALL * (gz ? 0.6 : 1));
    moveBody(this, dt, G.level);
    if (this.hitL || this.hitR) this.vx = 0;
  }
}

Object.assign(ENEMY_TYPES, { heap: BoneHeap, skullbat: SkullBat, censer: Censer, lensling: Lensling, orrery: Orrery, lunarhare: LunarHare });
