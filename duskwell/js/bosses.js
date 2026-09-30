'use strict';
// Boss fights. Every boss runs a generator "brain": each yield waits one frame,
// so an attack reads like a script (telegraph, strike, recover).

function spawnShock(x, y, dir, speed, color, life) {
  G.projs.push(new Proj({ kind: 'shock', x, y, vx: dir * speed, vy: 0, w: 46, h: 36, dmg: 1, color: color || '#c9d3de', life: life || 1.8, pierce: true, passWalls: true }));
}
function spawnRock(x, tele) {
  const y0 = 2 * TILE;
  G.projs.push(new Proj({ kind: 'rock', x, y: y0, y0, r: 17, vx: 0, vy: 0, grav: 1500, dmg: 1, tele: tele || 0.7, life: 4, color: '#8d97a3', passWalls: true }));
}
function spawnBeam(x, tele, dur, w) {
  Sound.play('tele');
  G.projs.push(new Proj({ kind: 'beam', x, y: 0, bw: w || 44, tele, dur: dur || 0.3, dmg: 1, life: 5, color: '#dff3ff', pierce: true, passWalls: true }));
}
function spawnPillar(x, y, tele, dur, h) {
  Sound.play('tele');
  G.projs.push(new Proj({ kind: 'pillar', x, y, bw: 46, ph: h || 230, tele, dur: dur || 0.4, dmg: 1, life: 5, color: '#ff9bd6', pierce: true, passWalls: true }));
}

class Boss extends Enemy {
  constructor(def, w, h, cfg) {
    super(def, w, h);
    this.hp = this.maxHp = cfg.hp; this.kb = 0; this.isBoss = true; this.bossKey = cfg.key; this.geo = cfg.geo;
    this.state = 'intro'; this.introT = 2.4; this.phase = 1; this.phases = cfg.phases || [0.5];
    this.tele = 0; this.grav = true; this.melee = null; this.alpha = 1; this.invul = true; this.co = null;
    this.spd = 1; this.face = -1; this.stunned = false; this.dt = 1 / 60; this.dyingT = 0; this.blood = cfg.blood || '#e8eef5';
    this.dmg = 1;
  }
  get floorY() { return G.floorY; }
  facePlayer() { this.face = G.player.cx > this.cx ? 1 : -1; }
  body() { return this.hb(); }
  hb() { return { x: this.x + 6, y: this.y + 4, w: this.w - 12, h: this.h - 4 }; }
  *wait(s) { let t = s; while (t > 0) { t -= this.dt; yield; } }
  *until(fn, maxT) { let t = maxT || 3; while (!fn() && t > 0) { t -= this.dt; yield; } }
  doMelee(ox, oy, w, h, dmg, dur) { this.melee = { ox, oy, w, h, dmg, t: dur, face: this.face }; }
  meleeRect() {
    const m = this.melee;
    return { x: m.face > 0 ? this.cx + m.ox : this.cx - m.ox - m.w, y: this.y + m.oy, w: m.w, h: m.h };
  }
  *brain() { while (true) yield* this.chooseAttack(); }

  hurt(dmg, dir, how) {
    if (this.dead || this.state !== 'fight' || this.invul || this.ghostly) { if (!this.invul && this.state === 'fight') Sound.play('hit'); return; }
    this.hp -= dmg; this.flash = 0.1; Sound.play('bossHit'); G.hitstop(0.05);
    G.burst(this.cx + rand(-14, 14), this.cy + rand(-20, 20), 8, { color: this.blood, speed: 230, life: 0.4, size: 3 });
    G.slashFx(this.cx, this.cy, dir);
    if (this.hp <= 0) { this.hp = 0; this.kill(); return; }
    const th = this.phases[this.phase - 1];
    if (th !== undefined && this.hp < this.maxHp * th) { this.phase++; this.spd = Math.max(0.55, this.spd * 0.78); this.co = this.shiftRoutine(); }
  }
  *shiftRoutine() {
    this.invul = true; this.vx = 0; this.grav = true; this.melee = null; this.alpha = 1; this.ghostly = false; this.stunned = false; this.tele = 1;
    G.clearHostile();
    Sound.play('roar'); G.shake(10, 1.1);
    yield* this.wait(0.35);
    G.ring(this.cx, this.cy, '#ffffff'); G.ring(this.cx, this.cy, '#ffb0e0');
    yield* this.wait(0.9);
    this.tele = 0; this.invul = false;
  }
  kill() {
    this.state = 'dying'; this.dyingT = 0; this.melee = null; this.vx = 0; this.grav = true; this.tele = 0; this.alpha = 1; this.ghostly = false;
    G.clearHostile(); Sound.play('bossDie'); G.slowmo = 2.2; G.shake(12, 2.2); G.flash = 0.6;
    G.onBossDying(this);
  }
  update(dt) {
    this.t += dt; this.flash -= dt; this.dt = dt;
    if (this.state === 'intro') {
      this.introT -= dt; this.physics(dt, this.grav);
      if (this.introT > 1.6 && this.introT - dt <= 1.6) { Sound.play('roar'); G.shake(6, 0.8); }
      if (this.introT <= 0) { this.state = 'fight'; this.invul = false; this.co = this.brain(); G.bossBarShow = true; }
      return;
    }
    if (this.state === 'dying') {
      this.dyingT += dt; this.physics(dt, true); this.vx *= 0.9;
      if (Math.random() < 0.6) G.burst(this.cx + rand(-this.w / 2, this.w / 2), this.cy + rand(-this.h / 2, this.h / 2), 3, { color: pick(['#ffffff', this.blood, '#ffb0e0']), speed: 180, life: 0.8, size: 4, grav: -40 });
      if (this.dyingT > 2.2) { this.dead = true; G.onBossDeath(this); }
      return;
    }
    if (this.co) { const r = this.co.next(); if (r.done) this.co = this.brain(); }
    if (this.melee) {
      this.melee.t -= dt;
      if (this.melee.t <= 0) this.melee = null;
      else if (!G.player.dead && overlap(G.player.hurtbox(), this.meleeRect())) G.player.hurt(this.melee.dmg, this.cx);
    }
    this.physics(dt, this.grav);
    if (this.grav === false) { if (this.hitU || this.onGround) this.vy = 0; }
  }
}

// ---------------------------------------------------------------- Stone Guardian
class Guardian extends Boss {
  constructor(d) { super(d, 84, 108, { key: 'guardian', hp: 130, geo: 120, phases: [0.5], blood: '#c9d2dc' }); this.last = ''; }
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.75 : 0.45);
    const opts = ['leap', 'slam', 'charge'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  *leap() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.5 * this.spd);
    this.tele = 0;
    const T = 0.71;
    this.vy = -780; this.vx = clamp((G.player.cx - this.cx) / T, -470, 470); this.onGround = false;
    yield; yield;
    yield* this.until(() => this.onGround, 2);
    this.vx = 0; Sound.play('slam'); G.shake(9, 0.3);
    spawnShock(this.cx - 30, this.y + this.h, -1, 360); spawnShock(this.cx + 30, this.y + this.h, 1, 360);
    G.burst(this.cx, this.y + this.h, 16, { color: '#8a94a0', speed: 200, life: 0.5, size: 4, vy: -60 });
    if (this.phase >= 2) this.dropRocks(2);
    yield* this.wait(0.55 * this.spd);
  }
  dropRocks(n) {
    const L = G.level;
    for (let i = 0; i < n; i++) spawnRock(clamp(G.player.cx + rand(-260, 260), 3 * TILE, L.pw - 3 * TILE), 0.7 + i * 0.12);
  }
  *slam() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.75 * this.spd);
    this.tele = 0; this.doMelee(24, 28, 120, 80, 2, 0.25);
    Sound.play('slam'); G.shake(8, 0.3);
    spawnShock(this.cx + this.face * 70, this.y + this.h, this.face, 430);
    this.dropRocks(this.phase >= 2 ? 5 : 3);
    yield* this.wait(0.9 * this.spd);
  }
  *charge() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.55 * this.spd);
    this.tele = 0;
    let t = 1.5;
    while (t > 0) { this.vx = this.face * (this.phase >= 2 ? 560 : 480); t -= this.dt; if (this.hitL || this.hitR) break; yield; }
    this.vx = 0; Sound.play('slam'); G.shake(8, 0.3); this.stunned = true;
    this.dropRocks(2);
    yield* this.wait(1.1);
    this.stunned = false;
  }
}

// ---------------------------------------------------------------- Thornweaver
class Weaver extends Boss {
  constructor(d) { super(d, 44, 82, { key: 'weaver', hp: 120, geo: 120, phases: [0.5], blood: '#b6ef6a' }); this.last = ''; }
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.55 : 0.3);
    const opts = ['dashSlash', 'needle', 'thorns', 'spin'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  *dashSlash() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.34 * this.spd);
    this.tele = 0; Sound.play('dash');
    let t = 0.4;
    while (t > 0) { this.vx = this.face * 820; this.doMelee(10, 14, 76, 62, 1, 0.05); t -= this.dt; if (this.hitL || this.hitR) break; yield; }
    this.vx = 0;
    if (this.phase >= 2) { this.facePlayer(); yield* this.wait(0.15); this.vy = -380; this.vx = this.face * 300; yield* this.until(() => this.onGround, 1); this.vx = 0; }
    yield* this.wait(0.4 * this.spd);
  }
  *needle() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.36 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const vys = this.phase >= 2 ? [-90, 0, 90] : [0];
    for (const vy of vys) G.projs.push(new Proj({ kind: 'needle', x: this.cx + this.face * 34, y: this.y + 36, vx: this.face * 660, vy, r: 8, dmg: 1, color: '#ffe3a0', life: 2 }));
    this.vx = -this.face * 240; this.vy = -300;
    yield* this.until(() => this.onGround, 1);
    this.vx = 0;
    yield* this.wait(0.5 * this.spd);
  }
  *thorns() {
    const L = G.level;
    this.vy = -900; this.vx = clamp((L.pw / 2 - this.cx) * 0.6, -200, 200);
    yield* this.until(() => this.vy >= -60, 1);
    this.grav = false; this.vx = 0; this.vy = 0; this.tele = 1; Sound.play('tele');
    yield* this.wait(0.45 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const n = this.phase >= 2 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.22 + 0.56 * i / (n - 1));
      G.projs.push(new Proj({ kind: 'thorn', x: this.cx, y: this.cy, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, r: 7, dmg: 1, color: '#9fe07a', life: 2, rot: a }));
    }
    yield* this.wait(0.25);
    this.grav = true;
    yield* this.until(() => this.onGround, 2);
    yield* this.wait(0.5 * this.spd);
  }
  *spin() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.3 * this.spd);
    this.tele = 0; Sound.play('slash'); this.spinning = true;
    let t = this.phase >= 2 ? 1.5 : 1.15;
    while (t > 0) {
      this.facePlayer(); this.vx = this.face * 250; this.doMelee(-58, 8, 116, 72, 1, 0.05); t -= this.dt;
      if (this.onGround && this.hitR || this.hitL) { this.vy = -420; }
      yield;
    }
    this.spinning = false; this.vx = 0;
    yield* this.wait(0.5 * this.spd);
  }
}

// ---------------------------------------------------------------- Crystal Wraith
class Wraith extends Boss {
  constructor(d) { super(d, 62, 78, { key: 'wraith', hp: 140, geo: 140, phases: [0.5], blood: '#ff9bd6' }); this.grav = false; this.last = ''; }
  get hoverY() { return this.floorY - 6.5 * TILE; }
  *chooseAttack() {
    yield* this.wait(this.phase === 1 ? 0.5 : 0.3);
    const opts = ['volley', 'dive', 'pillars', 'blink'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  *flyTo(tx, ty, speed, maxT) {
    let t = maxT || 2;
    while (t > 0) {
      const dx = tx - this.cx, dy = ty - this.cy, d = Math.hypot(dx, dy);
      if (d < 14) break;
      this.vx = dx / d * speed; this.vy = dy / d * speed; this.face = sign(dx) || this.face; t -= this.dt; yield;
    }
    this.vx = this.vy = 0;
  }
  *hover(s) { let t = s; while (t > 0) { this.vy = Math.sin(this.t * 3) * 30; this.vx = 0; this.facePlayer(); t -= this.dt; yield; } this.vy = 0; }
  *volley() {
    const L = G.level;
    const tx = clamp(G.player.cx + pick([-1, 1]) * rand(160, 280), 4 * TILE, L.pw - 4 * TILE);
    yield* this.flyTo(tx, this.hoverY, 360);
    const rounds = this.phase >= 2 ? 3 : 2;
    for (let r = 0; r < rounds; r++) {
      this.facePlayer(); this.tele = 1; Sound.play('tele');
      yield* this.hover(0.5 * this.spd);
      this.tele = 0; Sound.play('shoot');
      const a = Math.atan2(G.player.cy - this.cy, G.player.cx - this.cx), n = this.phase >= 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 0.28;
        G.projs.push(new Proj({ kind: 'shard', x: this.cx, y: this.cy, vx: Math.cos(a + o) * 340, vy: Math.sin(a + o) * 340, r: 7, dmg: 1, color: '#ff8fd0', life: 3, rot: a + o }));
      }
      yield* this.hover(0.35);
    }
    yield* this.wait(0.3);
  }
  *dive() {
    const L = G.level;
    yield* this.flyTo(clamp(G.player.cx, 4 * TILE, L.pw - 4 * TILE), this.hoverY - 40, 420);
    this.tele = 1; Sound.play('tele');
    let t = 0.55 * this.spd;
    while (t > 0) { this.vx = (G.player.cx - this.cx) * 4; this.vy = 0; this.vx = clamp(this.vx, -300, 300); t -= this.dt; yield; }
    const dx = G.player.cx - this.cx, dy = G.player.cy - this.cy, d = Math.hypot(dx, dy) || 1;
    this.tele = 0; this.vx = dx / d * 700; this.vy = dy / d * 700;
    let tt = 1.2;
    while (tt > 0 && !this.onGround && !this.hitL && !this.hitR) { this.vx = dx / d * 700; this.vy = dy / d * 700; tt -= this.dt; yield; }
    this.vx = this.vy = 0;
    if (this.onGround || this.cy > this.floorY - 70) {
      Sound.play('slam'); G.shake(8, 0.3);
      spawnShock(this.cx - 20, this.floorY, -1, 400, '#ff9bd6'); spawnShock(this.cx + 20, this.floorY, 1, 400, '#ff9bd6');
    }
    yield* this.wait(0.35);
    yield* this.flyTo(this.cx, this.hoverY, 320);
  }
  *pillars() {
    const L = G.level;
    yield* this.flyTo(L.pw / 2, this.hoverY - 30, 360);
    this.tele = 1;
    const n = this.phase >= 2 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const x = clamp(G.player.cx + (i - (n - 1) / 2) * 120 + rand(-30, 30), 3 * TILE, L.pw - 3 * TILE);
      spawnPillar(x, this.floorY, 0.85, 0.4, 260);
      yield* this.hover(0.18);
    }
    yield* this.hover(1.0);
    this.tele = 0;
    if (this.phase >= 2) {
      const x = clamp(G.player.cx, 3 * TILE, L.pw - 3 * TILE);
      spawnPillar(x, this.floorY, 0.7, 0.4, 260);
      yield* this.hover(0.9);
    }
  }
  *blink() {
    const L = G.level;
    this.ghostly = true;
    for (let a = 1; a > 0; a -= 0.1) { this.alpha = a; yield; }
    this.alpha = 0; yield* this.wait(0.3);
    this.x = clamp(G.player.cx + pick([-1, 1]) * rand(120, 300), 4 * TILE, L.pw - 4 * TILE) - this.w / 2; this.y = this.hoverY - rand(0, 60);
    for (let a = 0; a < 1; a += 0.1) { this.alpha = a; yield; }
    this.alpha = 1; this.ghostly = false;
    yield* this.wait(0.25);
  }
}

// ---------------------------------------------------------------- The Hollow King
class King extends Boss {
  constructor(d) { super(d, 92, 138, { key: 'king', hp: 240, geo: 300, phases: [0.66, 0.33], blood: '#eaf6ff' }); this.last = ''; }
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.7 : this.phase === 2 ? 0.45 : 0.3);
    const opts = ['sweep', 'leapSlam', 'orbs'];
    if (this.phase >= 2) opts.push('beams', 'rain');
    if (this.phase >= 3) opts.push('blinkStrike');
    const o2 = opts.filter(o => o !== this.last);
    this.last = pick(o2);
    yield* this[this.last]();
  }
  *sweep() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.8 * this.spd);
    this.tele = 0; Sound.play('slam'); G.shake(7, 0.25);
    this.doMelee(20, 10, 170, 120, 2, 0.28);
    spawnShock(this.cx + this.face * 90, this.y + this.h, this.face, 520, '#e8f4ff');
    if (this.phase >= 3) spawnShock(this.cx - this.face * 90, this.y + this.h, -this.face, 520, '#e8f4ff');
    yield* this.wait(0.75 * this.spd);
  }
  *leapSlam() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.5 * this.spd);
    this.tele = 0;
    const T = 0.76;
    this.vy = -840; this.vx = clamp((G.player.cx - this.cx) / T, -470, 470); this.onGround = false;
    yield; yield;
    yield* this.until(() => this.onGround, 2);
    this.vx = 0; Sound.play('slam'); G.shake(10, 0.35);
    for (const d of [-1, 1]) spawnShock(this.cx + d * 40, this.y + this.h, d, 380, '#e8f4ff');
    yield* this.wait(0.3);
    for (const d of [-1, 1]) spawnShock(this.cx + d * 40, this.y + this.h, d, 300, '#e8f4ff');
    yield* this.wait(0.6 * this.spd);
  }
  *beams() {
    const L = G.level, n = 2 + this.phase;
    this.tele = 1;
    for (let i = 0; i < n; i++) {
      const x = i % 2 === 0 ? G.player.cx : clamp(G.player.cx + rand(-240, 240), 3 * TILE, L.pw - 3 * TILE);
      spawnBeam(x, 0.8, 0.3);
      yield* this.wait(0.5);
    }
    yield* this.wait(0.9);
    this.tele = 0;
  }
  *orbs() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.6 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const rings = this.phase >= 2 ? 2 : 1, n = this.phase >= 3 ? 12 : 9;
    for (let r = 0; r < rings; r++) {
      const off = r * Math.PI / n + (this.phase >= 3 ? this.t : 0);
      for (let i = 0; i < n; i++) {
        const a = off + i * Math.PI * 2 / n;
        G.projs.push(new Proj({ kind: 'orb', x: this.cx, y: this.cy - 10, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 11, dmg: 1, color: '#e6f3ff', life: 3.2, passWalls: false }));
      }
      yield* this.wait(0.55);
    }
    yield* this.wait(0.5 * this.spd);
  }
  *rain() {
    const L = G.level;
    this.tele = 1; Sound.play('roar');
    const n = this.phase >= 3 ? 10 : 7;
    for (let i = 0; i < n; i++) { spawnRock(clamp(G.player.cx + rand(-320, 320), 3 * TILE, L.pw - 3 * TILE), 0.85); yield* this.wait(0.22); }
    yield* this.wait(1.0);
    this.tele = 0;
  }
  *blinkStrike() {
    const L = G.level;
    this.ghostly = true;
    for (let a = 1; a > 0; a -= 0.1) { this.alpha = a; yield; }
    this.alpha = 0; yield* this.wait(0.35);
    const side = -G.player.face;
    this.x = clamp(G.player.cx + side * 130, 3 * TILE, L.pw - 3 * TILE) - this.w / 2; this.y = this.floorY - this.h - 2; this.vy = 0;
    for (let a = 0; a < 1; a += 0.1) { this.alpha = a; yield; }
    this.alpha = 1; this.ghostly = false;
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.3);
    this.tele = 0; Sound.play('slam'); G.shake(7, 0.25);
    this.doMelee(20, 10, 170, 120, 2, 0.28);
    spawnShock(this.cx + this.face * 90, this.y + this.h, this.face, 560, '#e8f4ff');
    yield* this.wait(0.6);
  }
}

const BOSS_TYPES = { guardian: Guardian, weaver: Weaver, wraith: Wraith, king: King };
