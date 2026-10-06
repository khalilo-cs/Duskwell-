'use strict';
// Boss fights. Every boss runs a generator "brain": each yield waits one frame,
// so an attack reads like a script (telegraph, strike, recover).

// shockwave that runs along the floor
function spawnShock(x, y, dir, speed, color, life) {
  G.projs.push(new Proj({ kind: 'shock', x, y, vx: dir * speed, vy: 0, w: 46, h: 36, dmg: 1, color: color || '#c9d3de', life: life || 1.8, pierce: true, passWalls: true }));
}
// `pal` re-colours a projectile for the other areas: { fill, fill2, glow, rgb } (see Art.drawProj)
function spawnRock(x, tele, pal) {
  const y0 = 2 * TILE;
  G.projs.push(new Proj({ kind: 'rock', x, y: y0, y0, r: 17, vx: 0, vy: 0, grav: 1500, dmg: 1, tele: tele || 0.7, life: 4, color: (pal && pal.glow) || '#8d97a3', passWalls: true, pal }));
}
// beam from the ceiling: a warning, then a short damaging window
function spawnBeam(x, tele, dur, w, pal) {
  Sound.play('tele');
  G.projs.push(new Proj({ kind: 'beam', x, y: 0, bw: w || 44, tele, dur: dur || 0.3, dmg: 1, life: 5, color: '#dff3ff', pierce: true, passWalls: true, pal }));
}
// pillar that rises at x after a warning
function spawnPillar(x, y, tele, dur, h, pal) {
  Sound.play('tele');
  G.projs.push(new Proj({ kind: 'pillar', x, y, bw: 46, ph: h || 230, tele, dur: dur || 0.4, dmg: 1, life: 5, color: (pal && pal.glow) || '#ff9bd6', pierce: true, passWalls: true, pal }));
}
// colour sets that re-tint the boss projectiles of other areas
const ICE = { fill: '#bfe8ff', fill2: '#f4fcff', glow: '#9fdcff', rgb: '170,225,255', spike: true };
const BOLT = { fill: '#d8e6ff', fill2: '#ffffff', glow: '#a8c0ff', rgb: '170,200,255' };
const GLASS = { fill: '#d4ccff', fill2: '#ffffff', glow: '#c8b8ff', rgb: '200,185,255', spike: true };
const SLAG = { fill: '#ff8a3a', fill2: '#ffe08a', glow: '#ff7a2a', rgb: '255,150,70' };

// base boss: intro, fight, dying. In the fight a generator (brain) picks attacks and yields once per frame
class Boss extends Enemy {
  constructor(def, w, h, cfg) {
    super(def, w, h);
    this.hp = this.maxHp = cfg.hp; this.kb = 0; this.isBoss = true; this.bossKey = cfg.key; this.geo = cfg.geo;
    this.state = 'intro'; this.introT = 2.4; this.phase = 1; this.phases = cfg.phases || [0.5];
    this.tele = 0; this.grav = true; this.melee = null; this.alpha = 1; this.invul = true; this.co = null;
    this.spd = 1; this.face = -1; this.stunned = false; this.dt = 1 / 60; this.dyingT = 0; this.blood = cfg.blood || '#e8eef5';
    this.dmg = 1; this.actName = ''; this.actStage = ''; this.actT = 0; this.actDur = 0;
  }
  // what the boss is doing right now, for its drawing: an attack, its stage (wind / hit / air / land ...), how long the stage runs
  setAct(name, stage, dur) { this.actName = name; this.actStage = stage || ''; this.actT = 0; this.actDur = dur || 0; }
  // y of the arena floor
  get floorY() { return G.floorY; }
  // turn toward the player
  facePlayer() { this.face = G.player.cx > this.cx ? 1 : -1; }
  body() { return this.hb(); }
  // hit box, a little smaller than the sprite
  hb() { return { x: this.x + 6, y: this.y + 4, w: this.w - 12, h: this.h - 4 }; }
  // generator helpers: wait s seconds, wait for a condition, fly to a point, hover
  *wait(s) { let t = s; while (t > 0) { t -= this.dt; yield; } }
  *until(fn, maxT) { let t = maxT || 3; while (!fn() && t > 0) { t -= this.dt; yield; } }
  doMelee(ox, oy, w, h, dmg, dur) { this.melee = { ox, oy, w, h, dmg, t: dur, face: this.face }; }
  // the melee box in world coordinates
  meleeRect() {
    const m = this.melee;
    return { x: m.face > 0 ? this.cx + m.ox : this.cx - m.ox - m.w, y: this.y + m.oy, w: m.w, h: m.h };
  }
  // attack after attack, forever
  *brain() { while (true) yield* this.chooseAttack(); }
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

  // take a hit; at a health threshold the boss enters its next phase
  hurt(dmg, dir, how) {
    if (this.dead || this.state !== 'fight' || this.invul || this.ghostly) { if (!this.invul && this.state === 'fight') Sound.play('hit'); return; }
    const burn = how === 'burn';
    this.hp -= dmg; this.flash = 0.1; if (!burn) { Sound.play('bossHit'); G.hitstop(0.05); }
    G.burst(this.cx + rand(-14, 14), this.cy + rand(-20, 20), 8, { color: burn ? pick(['#ff8a3a', '#ffd070']) : this.blood, speed: burn ? 150 : 230, life: 0.4, size: 3 });
    if (!burn) G.slashFx(this.cx, this.cy, dir);
    if (this.hp <= 0) { this.hp = 0; this.kill(); return; }
    const th = this.phases[this.phase - 1];
    if (th !== undefined && this.hp < this.maxHp * th) { this.phase++; this.spd = Math.max(0.42, this.spd * 0.78); this.co = this.shiftRoutine(); }
    else if (!this.enraged && this.hp < this.maxHp * 0.22) this.enrage();
  }
  // the last fifth of its health: it roars once more and fights quicker, and the hall strikes more often
  enrage() {
    this.enraged = true; this.spd = Math.max(0.42, this.spd * 0.84); this.tempo = Math.min(1.5, (this.tempo || 1) * 1.08); this.co = this.shiftRoutine();
    G.toastMsg(sx('الزعيم غاضب!', 'It rages!'), 2);
  }
  // the hall itself strikes while the guardian fights: a column of its own colour, shown a moment before it rises, near the hero
  hallStrikes(dt) {
    if (!(Diff.hazard > 0) || !G.arena || G.arena.state !== 'fight' || G.player.dead) return;
    this.hazT = (this.hazT === undefined ? 5 : this.hazT) - dt;
    if (this.hazT > 0) return;
    this.hazT = Math.max(2.2, 7.2 - this.phase * 1.3 - (this.enraged ? 1.4 : 0)) / Diff.hazard * rand(0.85, 1.15);
    const L = G.level, pal = { frost: ICE, storm: BOLT, mirror: GLASS, ember: SLAG }[L.def.theme];
    const x = clamp(G.player.cx + rand(-110, 110), 3 * TILE, L.pw - 3 * TILE);
    spawnPillar(x, this.floorY, 1.0, 0.45, 250, pal);
  }
  // phase change: roar, clear the projectiles, become hittable again
  *shiftRoutine() {
    this.invul = true; this.vx = 0; this.grav = true; this.melee = null; this.alpha = 1; this.ghostly = false; this.stunned = false; this.tele = 1; this.setAct('roar', '', 1.25);
    G.clearHostile();
    Sound.play('roar'); G.shake(10, 1.1);
    yield* this.wait(0.35);
    G.ring(this.cx, this.cy, '#ffffff'); G.ring(this.cx, this.cy, '#ffb0e0');
    yield* this.wait(0.9);
    this.tele = 0; this.invul = false; this.setAct('', '');
  }
  // start the death sequence
  kill() {
    this.state = 'dying'; this.dyingT = 0; this.melee = null; this.vx = 0; this.grav = true; this.tele = 0; this.alpha = 1; this.ghostly = false;
    G.clearHostile(); Sound.play('bossDie'); G.slowmo = 2.2; G.shake(12, 2.2); G.flash = 0.6;
    G.onBossDying(this);
  }
  // intro, fight (run the attack generator and the melee box) or dying
  update(dt) {
    this.t += dt; this.flash -= dt; this.dt = dt; this.actT += dt;
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
    this.hallStrikes(dt);
    if (this.enraged && Math.random() < 0.3) G.burst(this.cx + rand(-this.w / 2, this.w / 2), this.cy + rand(-this.h / 2, this.h / 2), 1, { color: pick(['#ff8a3a', '#ff4a3a']), speed: 60, life: 0.55, size: 3, grav: -90 });
    if (this.co) { const r = this.co.next(); if (r.done) this.co = this.brain(); }
    if (this.melee) {
      this.melee.t -= dt;
      if (this.melee.t <= 0) this.melee = null;
      else if (!G.player.dead && overlap(G.player.hurtbox(), this.meleeRect()) && G.player.hurt(this.melee.dmg, this.cx)) Mind.wounded(this);
    }
    this.physics(dt, this.grav);
    if (this.grav === false) { if (this.hitU || this.onGround) this.vy = 0; }
  }
}

// ---------------------------------------------------------------- Stone Guardian
class Guardian extends Boss {
  constructor(d) { super(d, 84, 108, { key: 'guardian', hp: 130, geo: 120, phases: [0.5], blood: '#c9d2dc' }); this.last = ''; }
  // pick leap, slam or charge, never the same twice
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.75 : 0.45);
    const opts = ['leap', 'slam', 'charge'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  // jump at the player; the landing sends shockwaves
  *leap() {
    this.facePlayer(); this.tele = 1; Sound.play('tele'); this.setAct('leap', 'wind', 0.5 * this.spd);
    yield* this.wait(0.5 * this.spd);
    this.tele = 0; this.setAct('leap', 'air');
    const T = 0.71;
    this.vy = -780; this.vx = clamp((G.player.cx - this.cx) / T, -470, 470); this.onGround = false;
    yield; yield;
    yield* this.until(() => this.onGround, 2);
    this.vx = 0; Sound.play('slam'); G.shake(9, 0.3); this.setAct('leap', 'land', 0.55 * this.spd);
    spawnShock(this.cx - 30, this.y + this.h, -1, 360); spawnShock(this.cx + 30, this.y + this.h, 1, 360);
    G.burst(this.cx, this.y + this.h, 16, { color: '#8a94a0', speed: 200, life: 0.5, size: 4, vy: -60 });
    if (this.phase >= 2) this.dropRocks(2);
    yield* this.wait(0.55 * this.spd);
    this.setAct('', '');
  }
  // rocks fall around the player
  dropRocks(n) {
    const L = G.level;
    for (let i = 0; i < n; i++) spawnRock(clamp(G.player.cx + rand(-260, 260), 3 * TILE, L.pw - 3 * TILE), 0.7 + i * 0.12);
  }
  // overhead slam with a shockwave and falling rocks
  *slam() {
    this.facePlayer(); this.tele = 1; Sound.play('tele'); this.setAct('slam', 'wind', 0.75 * this.spd);
    yield* this.wait(0.75 * this.spd);
    this.tele = 0; this.doMelee(24, 28, 120, 80, 1, 0.25); this.setAct('slam', 'hit', 0.9 * this.spd);
    Sound.play('slam'); G.shake(8, 0.3);
    spawnShock(this.cx + this.face * 70, this.y + this.h, this.face, 430);
    this.dropRocks(this.phase >= 2 ? 5 : 3);
    yield* this.wait(0.9 * this.spd);
    this.setAct('', '');
  }
  // run across the arena
  *charge() {
    this.facePlayer(); this.tele = 1; Sound.play('tele'); this.setAct('charge', 'wind', 0.55 * this.spd);
    yield* this.wait(0.55 * this.spd);
    this.tele = 0; this.setAct('charge', 'run');
    let t = 1.5;
    while (t > 0) { this.vx = this.face * (this.phase >= 2 ? 560 : 480); t -= this.dt; if (this.hitL || this.hitR) break; yield; }
    this.vx = 0; Sound.play('slam'); G.shake(8, 0.3); this.stunned = true; this.setAct('charge', 'crash', 1.1);
    this.dropRocks(2);
    yield* this.wait(1.1);
    this.stunned = false; this.setAct('charge', 'rise', 0.5);
    yield* this.wait(0.35);
    this.setAct('', '');
  }
}

// ---------------------------------------------------------------- Thornweaver
class Weaver extends Boss {
  constructor(d) { super(d, 44, 82, { key: 'weaver', hp: 120, geo: 120, phases: [0.5], blood: '#b6ef6a' }); this.last = ''; }
  // pick one of four attacks
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.55 : 0.3);
    const opts = ['dashSlash', 'needle', 'thorns', 'spin'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  // dash through the player with a scythe swing
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
  // throws needles
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
  // leap high, hang in the air and fire thorns
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
  // spinning slash
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
  // pick volley, dive, pillars or blink
  *chooseAttack() {
    yield* this.wait(this.phase === 1 ? 0.5 : 0.3);
    const opts = ['volley', 'dive', 'pillars', 'blink'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  // fly beside the player and fire rounds of shards
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
  // swoop at the player
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
  // pillars of light rise under the player
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
  // vanish and appear somewhere else
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
  // pick an attack; later phases add more
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
  // wide sword sweep
  *sweep() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.8 * this.spd);
    this.tele = 0; Sound.play('slam'); G.shake(7, 0.25);
    this.doMelee(20, 10, 170, 120, 1, 0.28);
    spawnShock(this.cx + this.face * 90, this.y + this.h, this.face, 520, '#e8f4ff');
    if (this.phase >= 3) spawnShock(this.cx - this.face * 90, this.y + this.h, -this.face, 520, '#e8f4ff');
    yield* this.wait(0.75 * this.spd);
  }
  // leap and slam down
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
  // beams of light from the ceiling
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
  // rings of orbs
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
  // rocks fall around the player
  *rain() {
    const L = G.level;
    this.tele = 1; Sound.play('roar');
    const n = this.phase >= 3 ? 10 : 7;
    for (let i = 0; i < n; i++) { spawnRock(clamp(G.player.cx + rand(-320, 320), 3 * TILE, L.pw - 3 * TILE), 0.85); yield* this.wait(0.22); }
    yield* this.wait(1.0);
    this.tele = 0;
  }
  // vanish, reappear next to the player and strike
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
    this.doMelee(20, 10, 170, 120, 1, 0.28);
    spawnShock(this.cx + this.face * 90, this.y + this.h, this.face, 560, '#e8f4ff');
    yield* this.wait(0.6);
  }
}

// ---------------------------------------------------------------- Sporecap Matriarch
class Sporecap extends Boss {
  constructor(d) { super(d, 110, 104, { key: 'spore', hp: 150, geo: 150, phases: [0.5], blood: '#ffb070' }); this.last = ''; }
  // pick hop, spore rain, clouds or burrow
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.7 : 0.45);
    const opts = ['hop', 'sporeRain', 'clouds', 'burrow'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  // spit n globs upward in a spread
  spit(n, spread) {
    Sound.play('shoot');
    for (let i = 0; i < n; i++) {
      const vx = (i - (n - 1) / 2) * spread + rand(-20, 20);
      G.projs.push(new Proj({ kind: 'glob', x: this.cx, y: this.y + 10, vx, vy: rand(-720, -560), grav: 900, r: 9, dmg: 1, life: 4, color: '#ffb070' }));
    }
  }
  // big hop with a landing shockwave
  *hop() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.45 * this.spd);
    this.tele = 0;
    const T = 0.74; this.vy = -820; this.vx = clamp((G.player.cx - this.cx) / T, -460, 460); this.onGround = false;
    yield; yield;
    yield* this.until(() => this.onGround, 2);
    this.vx = 0; Sound.play('slam'); G.shake(9, 0.3);
    spawnShock(this.cx - 40, this.y + this.h, -1, 360, '#ffb070'); spawnShock(this.cx + 40, this.y + this.h, 1, 360, '#ffb070');
    this.spit(this.phase >= 2 ? 5 : 3, 90);
    yield* this.wait(0.55 * this.spd);
  }
  // lob spores upward so they rain down
  *sporeRain() {
    this.tele = 1; Sound.play('tele');
    yield* this.wait(0.5 * this.spd);
    this.tele = 0; this.spit(this.phase >= 2 ? 9 : 6, 70);
    yield* this.wait(1.0 * this.spd);
  }
  // drifting spore clouds
  *clouds() {
    this.tele = 1; Sound.play('tele');
    yield* this.wait(0.4 * this.spd);
    this.tele = 0; Sound.play('dash');
    const n = this.phase >= 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const x = clamp(G.player.cx + (i - (n - 1) / 2) * 140, 3 * TILE, G.level.pw - 3 * TILE);
      G.projs.push(new Proj({ kind: 'cloud', x, y: this.floorY - 40, w: 96, h: 80, vx: 0, vy: -10, dmg: 1, life: 1.8, pierce: true, passWalls: true, color: '#e8d070' }));
      yield* this.wait(0.15);
    }
    yield* this.wait(0.9 * this.spd);
  }
  // dig down and come up under the player
  *burrow() {
    this.ghostly = true;
    for (let a = 1; a > 0; a -= 0.08) { this.alpha = a; yield; }
    this.alpha = 0;
    let t = 0.9 * this.spd;
    while (t > 0) {
      this.x = clamp(G.player.cx, 3 * TILE, G.level.pw - 3 * TILE) - this.w / 2; t -= this.dt;
      if (Math.random() < 0.5) G.burst(this.cx + rand(-40, 40), this.floorY, 1, { color: '#b08050', speed: 120, life: 0.5, size: 4, vy: -120 });
      yield;
    }
    Sound.play('slam'); G.shake(8, 0.3);
    this.alpha = 1; this.ghostly = false; this.vy = -900; this.onGround = false;
    this.doMelee(-this.w / 2 - 10, -30, this.w + 20, this.h + 30, 1, 0.3);
    yield* this.until(() => this.onGround && this.vy === 0, 2);
    spawnShock(this.cx - 40, this.y + this.h, -1, 320, '#ffb070'); spawnShock(this.cx + 40, this.y + this.h, 1, 320, '#ffb070');
    yield* this.wait(0.6 * this.spd);
  }
}

// ---------------------------------------------------------------- Drowned Colossus
class Drowned extends Boss {
  constructor(d) { super(d, 96, 128, { key: 'drowned', hp: 180, geo: 180, phases: [0.5], blood: '#8fe0ff' }); this.last = ''; }
  // pick charge, geysers, bubbles or slam
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.7 : 0.45);
    const opts = ['charge', 'geysers', 'bubbles', 'slam'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  // charge across the arena
  *charge() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.55 * this.spd);
    this.tele = 0;
    let t = 1.5, k = 0;
    while (t > 0) {
      this.vx = this.face * (this.phase >= 2 ? 560 : 470); this.doMelee(0, 20, 70, 100, 1, 0.05); t -= this.dt; k++;
      if (k % 10 === 0) G.burst(this.cx, this.y + this.h, 6, { color: '#8fe0ff', speed: 140, life: 0.5, size: 3, vy: -120 });
      if (this.hitL || this.hitR) break;
      yield;
    }
    this.vx = 0; Sound.play('slam'); G.shake(8, 0.3); this.stunned = true;
    spawnShock(this.cx - this.face * 50, this.y + this.h, -this.face, 400, '#8fe0ff');
    yield* this.wait(0.9);
    this.stunned = false;
  }
  // water geysers burst from the floor
  *geysers() {
    this.tele = 1; Sound.play('roar');
    const rounds = this.phase >= 2 ? 2 : 1;
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < 4; i++) {
        const x = clamp(G.player.cx + (i - 1.5) * 130 + rand(-30, 30), 3 * TILE, G.level.pw - 3 * TILE);
        G.projs.push(new Proj({ kind: 'pillar', x, y: this.floorY, bw: 50, ph: 300, tele: 0.8, dur: 0.45, dmg: 1, life: 5, color: '#8fe0ff', pierce: true, passWalls: true }));
      }
      Sound.play('tele');
      yield* this.wait(1.1);
    }
    this.tele = 0;
    yield* this.wait(0.3);
  }
  // fan of bubbles aimed at the player
  *bubbles() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.5 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const a0 = Math.atan2(G.player.cy - this.cy, G.player.cx - this.cx), n = this.phase >= 2 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * 0.22;
      G.projs.push(new Proj({ kind: 'orb', x: this.cx + this.face * 40, y: this.cy - 20, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 12, dmg: 1, life: 3.2, color: '#8fe0ff' }));
    }
    yield* this.wait(0.8 * this.spd);
  }
  // overhead slam
  *slam() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.5 * this.spd);
    this.tele = 0;
    const T = 0.8; this.vy = -880; this.vx = clamp((G.player.cx - this.cx) / T, -430, 430); this.onGround = false;
    yield; yield;
    yield* this.until(() => this.onGround, 2);
    this.vx = 0; Sound.play('slam'); G.shake(10, 0.35);
    for (const d of [-1, 1]) spawnShock(this.cx + d * 50, this.y + this.h, d, 420, '#8fe0ff');
    for (let i = 0; i < (this.phase >= 2 ? 5 : 3); i++) spawnRock(clamp(G.player.cx + rand(-240, 240), 3 * TILE, G.level.pw - 3 * TILE), 0.7 + i * 0.1);
    yield* this.wait(0.6 * this.spd);
  }
}

// ---------------------------------------------------------------- Brood Mother
class Brood extends Boss {
  constructor(d) { super(d, 128, 80, { key: 'brood', hp: 170, geo: 170, phases: [0.5], blood: '#c8a8ff' }); this.last = ''; this.onCeil = false; }
  // pick one of four attacks
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.6 : 0.4);
    const opts = ['pounce', 'webShot', 'spawnBrood', 'ceilingDrop'].filter(o => o !== this.last);
    this.last = pick(opts);
    yield* this[this.last]();
  }
  // leap onto the player
  *pounce() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.42 * this.spd);
    this.tele = 0;
    const T = 0.6; this.vy = -660; this.vx = clamp((G.player.cx - this.cx) / T, -520, 520); this.onGround = false;
    yield; yield;
    yield* this.until(() => this.onGround, 2);
    this.vx = 0; Sound.play('slam'); G.shake(6, 0.2);
    this.doMelee(-this.w / 2, 20, this.w, 60, 1, 0.15);
    if (this.phase >= 2) { spawnShock(this.cx - 50, this.y + this.h, -1, 360, '#c8a8ff'); spawnShock(this.cx + 50, this.y + this.h, 1, 360, '#c8a8ff'); }
    yield* this.wait(0.5 * this.spd);
  }
  // fan of web shots
  *webShot() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.45 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const a0 = Math.atan2(G.player.cy - this.cy, G.player.cx - this.cx), n = this.phase >= 2 ? 5 : 3;
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.2; G.projs.push(new Proj({ kind: 'web', x: this.cx + this.face * 50, y: this.cy - 10, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 10, dmg: 1, life: 2.5, color: '#e6e0ff' })); }
    yield* this.wait(0.6 * this.spd);
  }
  // hatch spiderlings (pounce instead if four are alive)
  *spawnBrood() {
    const alive = G.enemies.filter(e => e.kind === 'brood_child' && !e.dead).length;
    if (alive >= 4) { yield* this.pounce(); return; }
    this.tele = 1; Sound.play('roar');
    yield* this.wait(0.6);
    this.tele = 0;
    for (const d of [-1, 1]) {
      const s = new Spider({ x: 0, y: 0, ground: true }); s.kind = 'brood_child'; s.geo = 0; s.hp = 8;
      s.x = this.cx + d * 50 - s.w / 2; s.y = this.y + this.h - s.h - 10; s.vx = d * 200; s.vy = -300;
      G.enemies.push(s);
    }
    yield* this.wait(0.8 * this.spd);
  }
  // climb the ceiling and drop down
  *ceilingDrop() {
    this.vy = -1100; this.onGround = false;
    yield; yield;
    yield* this.until(() => this.hitU || this.vy >= 0, 1.2);
    this.grav = false; this.vy = 0; this.onCeil = true; this.tele = 1; Sound.play('tele');
    let t = 0.8 * this.spd;
    while (t > 0) { this.vx = clamp((G.player.cx - this.cx) * 5, -420, 420); this.vy = -20; t -= this.dt; yield; }
    this.vx = 0; this.tele = 0; this.onCeil = false; this.grav = true; this.vy = 1100;
    yield* this.until(() => this.onGround, 2);
    Sound.play('slam'); G.shake(10, 0.35);
    for (const d of [-1, 1]) spawnShock(this.cx + d * 50, this.y + this.h, d, 400, '#c8a8ff');
    yield* this.wait(0.6 * this.spd);
  }
}

// ---------------------------------------------------------------- The Rime Queen
// A floating sovereign of frost. She never touches the ground: fans of ice shards, falling icicles, rings of
// cold, a low sweep across the hall and (from the second wound on) columns of killing light.
class Queen extends Boss {
  constructor(d) { super(d, 72, 100, { key: 'queen', hp: 210, geo: 240, phases: [0.66, 0.33], blood: '#cfeeff' }); this.grav = false; this.last = ''; }
  get hoverY() { return this.floorY - 6 * TILE; }
  // pick one of the ice attacks
  *chooseAttack() {
    yield* this.wait(this.phase === 1 ? 0.55 : this.phase === 2 ? 0.4 : 0.28);
    const opts = ['shards', 'icefall', 'ring'];
    if (this.phase >= 2) opts.push('sweep', 'beams');
    if (this.phase >= 3) opts.push('blink');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  // fan of n shards
  fan(n, spread, speed) {
    const a = Math.atan2(G.player.cy - this.cy, G.player.cx - this.cx);
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * spread;
      G.projs.push(new Proj({ kind: 'shard', x: this.cx, y: this.cy, vx: Math.cos(a + o) * speed, vy: Math.sin(a + o) * speed, r: 7, dmg: 1, color: '#9fdcff', life: 3, rot: a + o, pal: ICE }));
    }
  }
  // volleys of ice shards
  *shards() {
    const L = G.level;
    yield* this.flyTo(clamp(G.player.cx + pick([-1, 1]) * rand(170, 290), 4 * TILE, L.pw - 4 * TILE), this.hoverY, 380);
    const rounds = this.phase >= 3 ? 4 : this.phase >= 2 ? 3 : 2;
    for (let r = 0; r < rounds; r++) {
      this.facePlayer(); this.tele = 1; Sound.play('tele');
      yield* this.hover(0.45 * this.spd);
      this.tele = 0; Sound.play('shoot');
      this.fan(this.phase >= 2 ? 5 : 3, 0.26, 360);
      yield* this.hover(0.32);
    }
    yield* this.wait(0.25);
  }
  // icicles fall from the ceiling
  *icefall() {
    const L = G.level;
    yield* this.flyTo(L.pw / 2, this.hoverY - 50, 380);
    this.tele = 1; Sound.play('roar');
    const n = this.phase >= 3 ? 9 : this.phase >= 2 ? 7 : 5;
    for (let i = 0; i < n; i++) {
      spawnRock(clamp(G.player.cx + rand(-280, 280), 3 * TILE, L.pw - 3 * TILE), 0.85, ICE);
      yield* this.hover(0.2);
    }
    yield* this.hover(0.9);
    this.tele = 0;
  }
  // ring of orbs
  *ring() {
    const L = G.level;
    yield* this.flyTo(clamp(L.pw / 2 + rand(-120, 120), 5 * TILE, L.pw - 5 * TILE), this.hoverY - 20, 360);
    this.tele = 1; Sound.play('tele');
    yield* this.hover(0.6 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const rings = this.phase >= 2 ? 2 : 1, n = this.phase >= 3 ? 14 : 10;
    for (let r = 0; r < rings; r++) {
      const off = r * Math.PI / n + (this.phase >= 3 ? this.t : 0);
      for (let i = 0; i < n; i++) {
        const a = off + i * Math.PI * 2 / n;
        G.projs.push(new Proj({ kind: 'orb', x: this.cx, y: this.cy, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 10, dmg: 1, color: '#bfe8ff', life: 3.2, pal: ICE }));
      }
      yield* this.hover(0.55);
    }
    yield* this.hover(0.4);
  }
  *sweep() {                                   // a low pass across the hall: jump it, then the cold bursts up behind her
    const L = G.level, side = this.cx < L.pw / 2 ? 1 : -1;
    yield* this.flyTo(side > 0 ? 4 * TILE : L.pw - 4 * TILE, this.floorY - 50, 420);
    this.face = side; this.tele = 1; Sound.play('tele');
    yield* this.hover(0.55 * this.spd);
    this.tele = 0; Sound.play('dash'); this.sweeping = true;
    let t = 2.2;
    while (t > 0 && ((side > 0 && this.cx < L.pw - 4 * TILE) || (side < 0 && this.cx > 4 * TILE))) {
      this.vx = side * (this.phase >= 3 ? 640 : 540); this.vy = 0; this.doMelee(-this.w / 2 - 8, 6, this.w + 16, this.h - 6, 1, 0.05);
      if (Math.random() < 0.5) G.burst(this.cx - side * 20, this.cy + rand(-20, 30), 1, { color: '#dff3ff', speed: 60, life: 0.4, size: 3 });
      t -= this.dt; yield;
    }
    this.sweeping = false; this.vx = 0; Sound.play('slam'); G.shake(6, 0.2);
    this.fan(5, 0.4, 340);
    yield* this.flyTo(this.cx, this.hoverY, 380);
  }
  // beams of cold
  *beams() {
    const L = G.level, n = 2 + this.phase;
    yield* this.flyTo(L.pw / 2, this.hoverY - 40, 380);
    this.tele = 1;
    for (let i = 0; i < n; i++) {
      spawnBeam(i % 2 === 0 ? G.player.cx : clamp(G.player.cx + rand(-240, 240), 3 * TILE, L.pw - 3 * TILE), 0.8, 0.3, 44, ICE);
      yield* this.hover(0.5);
    }
    yield* this.hover(0.9);
    this.tele = 0;
  }
  // vanish and reappear
  *blink() {
    const L = G.level;
    this.ghostly = true;
    for (let a = 1; a > 0; a -= 0.1) { this.alpha = a; yield; }
    this.alpha = 0; yield* this.wait(0.3);
    this.x = clamp(G.player.cx + pick([-1, 1]) * rand(140, 300), 4 * TILE, L.pw - 4 * TILE) - this.w / 2; this.y = this.hoverY - rand(0, 70);
    for (let a = 0; a < 1; a += 0.1) { this.alpha = a; yield; }
    this.alpha = 1; this.ghostly = false;
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.hover(0.35);
    this.tele = 0; Sound.play('shoot'); this.fan(7, 0.2, 400);
    yield* this.hover(0.3);
  }
}

// ---------------------------------------------------------------- The Cinder Colossus
// A walking furnace of basalt. Slow, huge and honest: every blow is announced. It lobs bombs of slag, rolls
// into walls, calls geysers up under the hero's feet and, when nearly spent, shakes the whole floor.
class Colossus extends Boss {
  constructor(d) { super(d, 118, 150, { key: 'colossus', hp: 300, geo: 340, phases: [0.66, 0.33], blood: '#ffb070' }); this.last = ''; this.rolling = false; }
  // pick one of the fire attacks
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.8 : this.phase === 2 ? 0.55 : 0.38);
    const opts = ['smash', 'lob', 'roll'];
    if (this.phase >= 2) opts.push('geysers', 'rain');
    if (this.phase >= 3) opts.push('quake');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  // slag falls from the ceiling
  slagDrops(n) {
    const L = G.level;
    for (let i = 0; i < n; i++) spawnRock(clamp(G.player.cx + rand(-280, 280), 3 * TILE, L.pw - 3 * TILE), 0.75 + i * 0.12, SLAG);
  }
  // fist smash
  *smash() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.85 * this.spd);
    this.tele = 0; this.doMelee(24, 18, 150, 112, 1, 0.25);
    Sound.play('slam'); G.shake(9, 0.3);
    spawnShock(this.cx + this.face * 80, this.y + this.h, this.face, 440, '#ff9a50');
    if (this.phase >= 2) spawnShock(this.cx - this.face * 80, this.y + this.h, -this.face, 440, '#ff9a50');
    G.burst(this.cx + this.face * 70, this.y + this.h, 16, { color: '#ff9a50', speed: 220, life: 0.6, size: 4, vy: -80 });
    if (this.phase >= 2) this.slagDrops(this.phase >= 3 ? 4 : 2);
    yield* this.wait(0.9 * this.spd);
  }
  // lob bombs at the player
  *lob() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.55 * this.spd);
    this.tele = 0;
    const n = this.phase >= 3 ? 3 : this.phase >= 2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.facePlayer(); Sound.play('shoot');
      const x = this.cx + this.face * 40, y = this.y + 30, p = G.player, g = 1100, T = 0.95 + i * 0.12;
      G.projs.push(new Proj({ kind: 'bomb', x, y, r: 11, vx: clamp((p.cx - x + rand(-40, 40)) / T, -420, 420), vy: (p.cy - y - 0.5 * g * T * T) / T, grav: g, fuse: 2.2, life: 4, dmg: 1, color: '#ff8a3a', blastR: 74 }));
      yield* this.wait(0.35);
    }
    yield* this.wait(0.55 * this.spd);
  }
  // roll across the arena
  *roll() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.6 * this.spd);
    this.tele = 0; this.rolling = true;
    let t = 1.8;
    while (t > 0) {
      this.vx = this.face * (this.phase >= 3 ? 560 : 480); this.doMelee(-this.w / 2, 24, this.w, this.h - 24, 1, 0.05);
      t -= this.dt; if (this.hitL || this.hitR) break;
      if (Math.random() < 0.4) G.burst(this.cx - this.face * 40, this.y + this.h - 6, 1, { color: '#ff9a50', speed: 80, life: 0.4, size: 3, vy: -40 });
      yield;
    }
    this.vx = 0; this.rolling = false; Sound.play('slam'); G.shake(8, 0.3); this.stunned = true;
    this.slagDrops(this.phase >= 2 ? 3 : 2);
    yield* this.wait(1.15);
    this.stunned = false;
  }
  // fire geysers
  *geysers() {
    const L = G.level, n = this.phase >= 3 ? 5 : 3;
    this.tele = 1; Sound.play('roar');
    yield* this.wait(0.4);
    for (let i = 0; i < n; i++) {
      spawnPillar(clamp(G.player.cx + (i - (n - 1) / 2) * 110 + rand(-30, 30), 3 * TILE, L.pw - 3 * TILE), this.floorY, 0.9, 0.45, 300, SLAG);
      yield* this.wait(0.2);
    }
    yield* this.wait(1.1);
    this.tele = 0;
  }
  // fire rain
  *rain() {
    this.tele = 1; Sound.play('roar');
    const n = this.phase >= 3 ? 10 : 7;
    for (let i = 0; i < n; i++) { this.slagDrops(1); yield* this.wait(0.22); }
    yield* this.wait(1.0);
    this.tele = 0;
  }
  *quake() {                                   // a great leap; the landing sends fire along the floor both ways
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.55 * this.spd);
    this.tele = 0;
    this.vy = -860; this.vx = clamp((G.player.cx - this.cx) / 0.78, -440, 440); this.onGround = false;
    yield; yield;
    yield* this.until(() => this.onGround, 2);
    this.vx = 0; Sound.play('slam'); G.shake(12, 0.45); G.flash = 0.25;
    for (const d of [-1, 1]) spawnShock(this.cx + d * 60, this.y + this.h, d, 420, '#ff9a50');
    for (let i = 1; i <= 4; i++) {
      for (const d of [-1, 1]) G.projs.push(new Proj({ kind: 'blast', x: this.cx + d * (60 + i * 78), y: this.y + this.h - 12, r: 20, r0: 62, dmg: 1, life: 0.45, pierce: true, passWalls: true, color: '#ff8a3a' }));
      Sound.play('slam');
      yield* this.wait(0.14);
    }
    yield* this.wait(0.7 * this.spd);
  }
}

// ---------------------------------------------------------------- Thunderhoof
// A bull of the high peaks, armoured in storm-cloud, the mid-boss of Stormcrest. It charges, stamps and gores, and
// once it is hurt enough it calls the lightning down. (Mid-bosses guard a way on; they leave geo, not a seal.)
class Thunderhoof extends Boss {
  constructor(d) { super(d, 132, 92, { key: 'thunderhoof', hp: 170, geo: 160, phases: [0.5], blood: '#cfe0ff' }); this.last = ''; }
  // pick one of the storm attacks
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.7 : 0.45);
    const opts = ['charge', 'stomp', 'gore'];
    if (this.phase >= 2) opts.push('thunder');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  // n lightning bolts at the player's x
  bolts(n) {
    const L = G.level;
    for (let i = 0; i < n; i++) spawnBeam(clamp(G.player.cx + (i === 0 ? 0 : rand(-260, 260)), 3 * TILE, L.pw - 3 * TILE), 0.85 + i * 0.12, 0.3, 44, BOLT);
  }
  // charge across the arena
  *charge() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.6 * this.spd);
    this.tele = 0; this.charging = true;
    let t = 1.7;
    while (t > 0) {
      this.vx = this.face * (this.phase >= 2 ? 620 : 520); this.doMelee(-this.w / 2, 12, this.w, this.h - 12, 1, 0.05);
      if (Math.random() < 0.5) G.burst(this.cx - this.face * 50, this.y + this.h - 8, 1, { color: '#dfe9ff', speed: 100, life: 0.35, size: 3, vy: -40 });
      t -= this.dt; if (this.hitL || this.hitR) break; yield;
    }
    this.vx = 0; this.charging = false; Sound.play('slam'); G.shake(9, 0.3); this.stunned = true;
    this.bolts(this.phase >= 2 ? 3 : 2);
    yield* this.wait(1.2);
    this.stunned = false;
  }
  // stomp with a shockwave
  *stomp() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.7 * this.spd);
    this.tele = 0; this.doMelee(24, 14, 150, 80, 1, 0.25);
    Sound.play('slam'); G.shake(8, 0.3);
    for (const d of [-1, 1]) spawnShock(this.cx + d * 80, this.y + this.h, d, 430, '#dfe9ff');
    yield* this.wait(0.8 * this.spd);
  }
  // gore with the horns
  *gore() {
    const lunges = this.phase >= 2 ? 2 : 1;
    for (let i = 0; i < lunges; i++) {
      this.facePlayer(); this.tele = 1; Sound.play('tele');
      yield* this.wait(0.4 * this.spd);
      this.tele = 0; Sound.play('dash');
      let t = 0.38;
      while (t > 0) { this.vx = this.face * 760; this.doMelee(-this.w / 2, 8, this.w + 20, this.h - 8, 1, 0.05); t -= this.dt; if (this.hitL || this.hitR) break; yield; }
      this.vx = 0;
      yield* this.wait(0.22);
    }
    yield* this.wait(0.5 * this.spd);
  }
  // calls down lightning
  *thunder() {
    this.tele = 1; Sound.play('roar'); G.shake(5, 0.6);
    yield* this.wait(0.4);
    this.bolts(this.phase >= 2 ? 4 : 3);
    yield* this.wait(1.5);
    this.tele = 0;
  }
}

// ---------------------------------------------------------------- The Storm Roc
// A great bird that rules the summit. It strafes the hall dropping needles, swoops across it, dives, calls lightning
// in columns, and (from the first wound on) beats up a gale that shoves the hero along the floor.
class Roc extends Boss {
  constructor(d) { super(d, 124, 90, { key: 'roc', hp: 260, geo: 280, phases: [0.66, 0.33], blood: '#cfe0ff' }); this.grav = false; this.last = ''; this.galeZone = null; }
  get hoverY() { return this.floorY - 5.5 * TILE; }
  // pick one of the flying attacks
  *chooseAttack() {
    yield* this.wait(this.phase === 1 ? 0.55 : this.phase === 2 ? 0.4 : 0.28);
    const opts = ['strafe', 'swoop', 'lightning'];
    if (this.phase >= 2) opts.push('dive', 'gale');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  // fire one needle
  needle(x, y, vx, vy) { G.projs.push(new Proj({ kind: 'needle', x, y, vx, vy, r: 8, dmg: 1, color: '#e8f0ff', life: 2.6 })); }
  *strafe() {                                    // fly the length of the hall, a rain of needles behind
    const L = G.level, side = this.cx < L.pw / 2 ? 1 : -1;
    yield* this.flyTo(side > 0 ? 4 * TILE : L.pw - 4 * TILE, this.hoverY - 30, 420);
    this.face = side; this.tele = 1; Sound.play('tele');
    yield* this.hover(0.5 * this.spd);
    this.tele = 0; Sound.play('shoot');
    let t = 3, n = 0;
    while (t > 0 && ((side > 0 && this.cx < L.pw - 4 * TILE) || (side < 0 && this.cx > 4 * TILE))) {
      this.vx = side * (this.phase >= 3 ? 400 : 320); this.vy = Math.sin(this.t * 6) * 20; this.face = side;
      if (++n % (this.phase >= 2 ? 9 : 13) === 0) { this.needle(this.cx, this.cy + 20, rand(-40, 40), 380); if (this.phase >= 2) this.needle(this.cx, this.cy + 20, (G.player.cx - this.cx) * 0.9, 330); }
      t -= this.dt; yield;
    }
    this.vx = this.vy = 0;
    yield* this.flyTo(L.pw / 2, this.hoverY, 380);
  }
  *swoop() {                                     // a diagonal pass across the hall, low over the floor
    const L = G.level, side = G.player.cx < L.pw / 2 ? -1 : 1;           // start on the far side from the hero
    yield* this.flyTo(side > 0 ? L.pw - 3 * TILE : 3 * TILE, this.hoverY - 70, 420);
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.hover(0.55 * this.spd);
    this.tele = 0; Sound.play('dash'); this.sweeping = true;
    const tx = clamp(2 * G.player.cx - this.cx, 3 * TILE, L.pw - 3 * TILE), ty = this.floorY - 56;
    const dx = tx - this.cx, dy = ty - this.cy, d = Math.hypot(dx, dy) || 1, sp = this.phase >= 3 ? 740 : 640;
    let t = 1.4;
    while (t > 0 && Math.hypot(tx - this.cx, ty - this.cy) > 40) {
      this.vx = dx / d * sp; this.vy = dy / d * sp; this.face = sign(dx) || this.face; this.doMelee(-this.w / 2, 4, this.w, this.h - 4, 1, 0.05);
      t -= this.dt; yield;
    }
    this.sweeping = false; this.vx = this.vy = 0; Sound.play('slam'); G.shake(6, 0.2);
    for (const dd of [-1, 1]) spawnShock(this.cx + dd * 30, this.floorY, dd, 380, '#dfe9ff');
    yield* this.flyTo(this.cx, this.hoverY, 380);
  }
  // lightning strikes
  *lightning() {
    const L = G.level, n = 3 + this.phase;
    yield* this.flyTo(L.pw / 2, this.hoverY - 40, 380);
    this.tele = 1; Sound.play('roar');
    for (let i = 0; i < n; i++) {
      spawnBeam(i % 2 === 0 ? G.player.cx : clamp(G.player.cx + rand(-260, 260), 3 * TILE, L.pw - 3 * TILE), 0.85, 0.3, 44, BOLT);
      yield* this.hover(0.45);
    }
    yield* this.hover(0.9);
    this.tele = 0;
  }
  // dive at the player
  *dive() {
    const L = G.level;
    yield* this.flyTo(clamp(G.player.cx, 4 * TILE, L.pw - 4 * TILE), this.hoverY - 60, 440);
    this.tele = 1; Sound.play('tele');
    let t = 0.5 * this.spd;
    while (t > 0) { this.vx = clamp((G.player.cx - this.cx) * 4, -320, 320); this.vy = 0; t -= this.dt; yield; }
    this.tele = 0; Sound.play('dash'); this.sweeping = true;
    let tt = 1.1;
    while (tt > 0 && this.cy < this.floorY - 52) { this.vx = 0; this.vy = 760; this.doMelee(-this.w / 2, 4, this.w, this.h, 1, 0.05); tt -= this.dt; yield; }
    this.sweeping = false; this.vx = this.vy = 0; Sound.play('slam'); G.shake(9, 0.3);
    for (const dd of [-1, 1]) { spawnShock(this.cx + dd * 30, this.floorY, dd, 420, '#dfe9ff'); }
    yield* this.wait(0.35);
    yield* this.flyTo(this.cx, this.hoverY, 340);
  }
  *gale() {                                      // a crosswind across the whole hall, and needles to dodge while it shoves
    const L = G.level, dir = pick([-1, 1]);
    yield* this.flyTo(L.pw / 2, this.hoverY - 40, 380);
    this.tele = 1; Sound.play('roar');
    yield* this.hover(0.6);
    this.galeZone = { x: 0, y: 0, w: L.pw, h: L.ph, wx: dir * (this.phase >= 3 ? 190 : 150), wy: 0 };
    L.winds.push(this.galeZone);
    for (let i = 0; i < 6; i++) {
      this.needle(clamp(G.player.cx + rand(-90, 90), 3 * TILE, L.pw - 3 * TILE), this.cy, 0, 360);
      yield* this.hover(0.42);
    }
    this.endGale(); this.tele = 0;
  }
  // remove the crosswind zone
  endGale() { if (this.galeZone) { const L = G.level; L.winds = L.winds.filter(w => w !== this.galeZone); this.galeZone = null; } }
  // the gale ends when the phase changes or the Roc dies
  shiftRoutine() { this.endGale(); return super.shiftRoutine(); }
  kill() { this.endGale(); super.kill(); }
}

// ---------------------------------------------------------------- The Glass Duelist
// The mid-boss of the Mirror Vault: a fencer of black glass. It lunges, strings blows together and, above all, guards:
// while the blade is up your strikes ring off it and it answers with a riposte. Wait out the guard, strike after.
class Duelist extends Boss {
  constructor(d) { super(d, 46, 90, { key: 'duelist', hp: 190, geo: 170, phases: [0.5], blood: '#d4ccff' }); this.last = ''; this.guarding = false; this.parried = false; }
  // blows that land on the raised blade are answered
  hurt(dmg, dir, how) {
    if (this.guarding && this.state === 'fight' && !this.invul && how !== 'burn') {            // the blade is up: it turns the blow aside
      this.parried = true; Sound.play('clank'); G.hitstop(0.04);
      G.burst(this.cx + this.face * 30, this.cy - 10, 10, { color: '#f4efff', speed: 240, life: 0.3, size: 2 });
      return false;                              // the player gains no soul from a parried blow
    }
    super.hurt(dmg, dir, how);
  }
  // pick one of the sword attacks
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.6 : 0.35);
    const opts = ['lunge', 'combo', 'guard'];
    if (this.phase >= 2) opts.push('shatter', 'rain');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  // step sideways for t seconds
  *step(dir, speed, t) { let x = t; while (x > 0) { this.vx = dir * speed; x -= this.dt; if (this.hitL || this.hitR) break; yield; } this.vx = 0; }
  *lunge() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.4 * this.spd);
    this.tele = 0; Sound.play('dash'); this.lunging = true;
    let t = 0.3;
    while (t > 0) { this.vx = this.face * 880; this.doMelee(10, 30, 120, 22, 1, 0.06); t -= this.dt; if (this.hitL || this.hitR) break; yield; }
    this.vx = 0; this.lunging = false;
    yield* this.wait(0.7 * this.spd);
  }
  // a chain of slashes
  *combo() {
    const n = this.phase >= 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      this.facePlayer(); this.tele = 1; Sound.play('tele');
      yield* this.wait(0.26 * this.spd);
      this.tele = 0; Sound.play('slash'); this.slashing = i % 2 + 1;
      this.doMelee(6, i % 2 ? 40 : 14, 100, i % 2 ? 24 : 60, 1, 0.14);
      yield* this.step(this.face, 300, 0.14);
      yield* this.wait(0.12);
      this.slashing = 0;
    }
    yield* this.wait(0.7 * this.spd);
  }
  *guard() {                                    // blade up; a blow that lands on it is answered at once
    this.facePlayer(); this.guarding = true; this.parried = false; Sound.play('clank');
    let t = 1.5 * (this.phase >= 2 ? 0.85 : 1), answered = false;
    while (t > 0) {
      this.facePlayer(); this.vx = 0;
      if (this.parried) { answered = true; break; }
      t -= this.dt; yield;
    }
    this.guarding = false;
    if (answered) {                              // the riposte: fast, long, and not telegraphed enough, which is the lesson
      this.parried = false; this.facePlayer(); this.tele = 1;
      yield* this.wait(0.12);
      this.tele = 0; Sound.play('dash'); this.lunging = true;
      let x = 0.34; while (x > 0) { this.vx = this.face * 900; this.doMelee(10, 30, 130, 24, 1, 0.06); x -= this.dt; if (this.hitL || this.hitR) break; yield; }
      this.vx = 0; this.lunging = false;
      yield* this.wait(0.55);
    } else {                                     // nobody struck: it comes down in a slow overhead, wide open afterwards
      this.tele = 1; Sound.play('tele'); yield* this.wait(0.5); this.tele = 0; Sound.play('slam'); G.shake(5, 0.2);
      this.slashing = 2; this.doMelee(10, -10, 90, 100, 1, 0.2); yield* this.wait(0.2); this.slashing = 0;
      this.stunned = true; yield* this.wait(1.1); this.stunned = false;
    }
  }
  *shatter() {                                  // a back-step, a fan of glass, then straight at you
    this.facePlayer(); this.vy = -380; this.vx = -this.face * 340; this.onGround = false;
    yield; yield; yield* this.until(() => this.onGround, 1); this.vx = 0;
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.35 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const a = Math.atan2(G.player.cy - this.cy, G.player.cx - this.cx);
    for (let i = -2; i <= 2; i++) G.projs.push(new Proj({ kind: 'shard', x: this.cx + this.face * 30, y: this.cy - 10, vx: Math.cos(a + i * 0.2) * 420, vy: Math.sin(a + i * 0.2) * 420, r: 7, dmg: 1, color: '#c8b8ff', life: 2.4, rot: a + i * 0.2, pal: GLASS }));
    yield* this.wait(0.3);
    yield* this.lunge();
  }
  // shards of glass fall
  *rain() {
    const L = G.level; this.tele = 1; Sound.play('roar');
    for (let i = 0; i < 7; i++) { spawnRock(clamp(G.player.cx + rand(-300, 300), 3 * TILE, L.pw - 3 * TILE), 0.8, GLASS); yield* this.wait(0.2); }
    yield* this.wait(1.0); this.tele = 0;
  }
}

// ---------------------------------------------------------------- The Wanderer's Twin
// The dark reflection of the hero, the last secret of the Mirror Vault. It fights with your own tools: the nail, the
// dash, the double jump, the soul bolt, the Dusk Cry. Third phase: it steps through the mirror to strike from behind.
class Twin extends Boss {
  constructor(d) { super(d, 32, 58, { key: 'twin', hp: 330, geo: 400, phases: [0.66, 0.33], blood: '#d8c8ff' }); this.last = ''; this.dashing = false; this.slashing = 0; this.airborne = false; }
  // hit box, as small as the player's
  hb() { return { x: this.x + 3, y: this.y + 2, w: this.w - 6, h: this.h - 2 }; }
  // pick a move the player knows: slash, rush, dash, leap, bolt, cry, echo
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.55 : this.phase === 2 ? 0.38 : 0.26);
    const opts = ['rush', 'dashSlash', 'leap', 'bolt'];
    if (this.phase >= 2) opts.push('cry', 'echo');
    if (this.phase >= 3) opts.push('mirrorStep');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  *slash(up) {                                   // one swing of the nail
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.2 * this.spd);
    this.tele = 0; Sound.play('slash'); this.slashing = up ? 2 : 1;
    this.doMelee(up ? -20 : 4, up ? -36 : 6, up ? 50 : 96, up ? 70 : 54, 1, 0.14);
    yield* this.wait(0.2);
    this.slashing = 0;
  }
  *rush() {                                      // run in, two or three swings
    this.facePlayer(); let t = 1.4;
    while (t > 0 && Math.abs(G.player.cx - this.cx) > 70) { this.facePlayer(); this.vx = this.face * (this.phase >= 3 ? 420 : 360); t -= this.dt; yield; }
    this.vx = 0;
    const n = this.phase >= 2 ? 3 : 2;
    for (let i = 0; i < n; i++) { yield* this.slash(false); this.vx = this.face * 140; yield* this.wait(0.05); this.vx = 0; }
    yield* this.wait(0.4 * this.spd);
  }
  *dashSlash() {                                 // the Shadow Dash: through your side, a swing on the far side
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.38 * this.spd);
    this.tele = 0; Sound.play('dash'); this.dashing = true;
    const dir = this.face; let t = 0.24;
    while (t > 0) { this.vx = dir * 820; t -= this.dt; if (this.hitL || this.hitR) break; yield; }
    this.vx = 0; this.dashing = false;
    this.face = -dir; this.facePlayer();
    yield* this.slash(false);
    yield* this.wait(0.45 * this.spd);
  }
  *leap() {                                      // jump, a second jump in the air, then the Soul Dive
    this.facePlayer(); this.vy = -720; this.vx = clamp((G.player.cx - this.cx) * 0.8, -300, 300); this.onGround = false; this.airborne = true; Sound.play('jump');
    yield* this.wait(0.3);
    this.vy = -560; Sound.play('djump'); G.ring(this.cx, this.cy + 20, '#d8c8ff');
    yield* this.wait(0.22);
    this.tele = 1; this.vx = 0; this.vy = -60; yield* this.wait(0.18); this.tele = 0;
    this.diving = true; this.vy = 1000; this.vx = clamp((G.player.cx - this.cx) * 1.2, -260, 260);
    while (!this.onGround) { this.doMelee(-24, this.h - 20, 48, 46, 1, 0.05); yield; }
    this.diving = false; this.airborne = false; this.vx = 0; Sound.play('slam'); G.shake(8, 0.25);
    for (const d of [-1, 1]) spawnShock(this.cx + d * 30, this.y + this.h, d, 380, '#d8c8ff');
    yield* this.wait(0.6 * this.spd);
  }
  *bolt() {                                      // your own soul bolt, sent back
    this.facePlayer(); this.tele = 1; this.casting = true; Sound.play('tele');
    yield* this.wait(0.4 * this.spd);
    this.tele = 0; Sound.play('cast');
    const n = this.phase >= 2 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.facePlayer();
      G.projs.push(new Proj({ kind: 'bolt', x: this.cx + this.face * 30, y: this.cy - 4 + i * 26, vx: this.face * 520, vy: 0, r: 12, dmg: 1, color: '#d8c8ff', life: 2.2, pierce: false }));
      yield* this.wait(0.25);
    }
    this.casting = false;
    yield* this.wait(0.5 * this.spd);
  }
  *cry() {                                       // the Dusk Cry: a column of violet light where you stand
    this.tele = 1; this.casting = true; Sound.play('roar');
    yield* this.wait(0.3);
    const L = G.level, n = this.phase >= 3 ? 3 : 2;
    for (let i = 0; i < n; i++) { spawnPillar(clamp(G.player.cx + (i ? rand(-200, 200) : 0), 3 * TILE, L.pw - 3 * TILE), this.floorY, 0.8, 0.45, 300, { fill: '#d8c8ff', fill2: '#ffffff', glow: '#c8b8ff', rgb: '200,185,255' }); yield* this.wait(0.3); }
    yield* this.wait(1.0); this.tele = 0; this.casting = false;
  }
  *echo() {                                      // three crescents of the Blade Echo, one above the other
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.45 * this.spd);
    this.tele = 0; Sound.play('slash'); this.slashing = 1;
    for (let i = 0; i < 3; i++) G.projs.push(new Proj({ kind: 'wave', x: this.cx + this.face * 34, y: this.y + 10 + i * 24, vx: this.face * 420, vy: 0, r: 15, dmg: 1, color: '#d8c8ff', life: 1.8, pierce: true }));
    yield* this.wait(0.25); this.slashing = 0;
    yield* this.wait(0.6 * this.spd);
  }
  *mirrorStep() {                                // out of the glass behind you
    const L = G.level;
    this.ghostly = true;
    for (let a = 1; a > 0; a -= 0.1) { this.alpha = a; yield; }
    this.alpha = 0; yield* this.wait(0.3);
    this.x = clamp(G.player.cx - G.player.face * 90, 3 * TILE, L.pw - 3 * TILE) - this.w / 2; this.y = this.floorY - this.h - 2; this.vy = 0;
    for (let a = 0; a < 1; a += 0.12) { this.alpha = a; yield; }
    this.alpha = 1; this.ghostly = false; this.facePlayer();
    yield* this.slash(false);
    yield* this.slash(true);
    yield* this.wait(0.45);
  }
}

// boss key -> class
const BOSS_TYPES = { duelist: Duelist, twin: Twin, thunderhoof: Thunderhoof, roc: Roc, queen: Queen, colossus: Colossus, guardian: Guardian, weaver: Weaver, wraith: Wraith, king: King, spore: Sporecap, drowned: Drowned, brood: Brood };
