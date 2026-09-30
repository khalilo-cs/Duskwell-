'use strict';
// Physics, the player, regular enemies, projectiles and pickups.
// Everything talks to the running game through the global G (set in game.js).

class Level {
  constructor(def) {
    this.def = def; this.id = def.id; this.w = def.w; this.h = def.h;
    this.t = Uint8Array.from(def.t);
    this.pw = def.w * TILE; this.ph = def.h * TILE;
  }
  get(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return T_SOLID;
    return this.t[ty * this.w + tx];
  }
  set(tx, ty, v) { if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.t[ty * this.w + tx] = v; }
  solid(tx, ty) { const v = this.get(tx, ty); return v === T_SOLID || v === T_BREAK || v === T_GATE; }
  solidAtPx(x, y) { return this.solid(Math.floor(x / TILE), Math.floor(y / TILE)); }
  ground(tx, ty) { const v = this.get(tx, ty); return v === T_SOLID || v === T_BREAK || v === T_GATE || v === T_ONEWAY; }
}

// Axis separated move with tile collision. Sets onGround / hitL / hitR / hitU.
function moveBody(b, dt, L) {
  b.hitL = b.hitR = b.hitU = false;
  const dx = b.vx * dt;
  b.x += dx;
  if (dx !== 0) {
    const top = Math.floor((b.y + 0.5) / TILE), bot = Math.floor((b.y + b.h - 0.5) / TILE);
    if (dx > 0) {
      const tx = Math.floor((b.x + b.w) / TILE);
      for (let ty = top; ty <= bot; ty++) if (L.solid(tx, ty)) { b.x = tx * TILE - b.w - 0.001; b.hitR = true; b.vx = 0; break; }
    } else {
      const tx = Math.floor(b.x / TILE);
      for (let ty = top; ty <= bot; ty++) if (L.solid(tx, ty)) { b.x = (tx + 1) * TILE + 0.001; b.hitL = true; b.vx = 0; break; }
    }
  }
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  b.onGround = false;
  const l = Math.floor((b.x + 0.5) / TILE), r = Math.floor((b.x + b.w - 0.5) / TILE);
  if (b.vy >= 0) {
    const by = Math.floor((b.y + b.h) / TILE);
    for (let tx = l; tx <= r; tx++) {
      const v = L.get(tx, by);
      if (v === T_SOLID || v === T_BREAK || v === T_GATE || (v === T_ONEWAY && prevBottom <= by * TILE + 0.5 && !b.noOneway)) {
        b.y = by * TILE - b.h; b.vy = 0; b.onGround = true; break;
      }
    }
  } else {
    const ty = Math.floor(b.y / TILE);
    for (let tx = l; tx <= r; tx++) if (L.solid(tx, ty)) { b.y = (ty + 1) * TILE; b.vy = 0; b.hitU = true; break; }
  }
}

const GRAV = 2200, MAXFALL = 900;

// ============================== PLAYER ==============================
class Player {
  constructor() {
    this.w = 22; this.h = 38;
    this.ab = { dash: false, wall: false, double: false };
    this.maxHp = 5; this.hp = 5; this.soul = 0; this.maxSoul = 99; this.geo = 0;
    this.nail = 5; this.soulGain = 11;
    this.place(0, 0, 1);
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  place(fx, fy, face) {           // fx, fy: feet centre in pixels
    this.x = fx - this.w / 2; this.y = fy - this.h; this.vx = 0; this.vy = 0; this.face = face || 1;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.jumping = false;
    this.dashT = 0; this.dashCD = 0; this.airDash = true; this.djAvail = true;
    this.wallDir = 0; this.wallCoyote = 0; this.lockX = 0; this.sliding = false;
    this.atkT = 0; this.atkCD = 0; this.atkBuf = 0; this.atkDir = 'side'; this.atkAlt = 0; this.hits = new Set();
    this.invuln = 0; this.hurtT = 0; this.focusT = 0; this.castHold = 0; this.castDone = false; this.castT = 0;
    this.sitting = null; this.dead = false; this.safe = { x: fx, y: fy }; this.safeT = 0;
    this.t = 0; this.landT = 0; this.ghost = []; this.recoil = 0;
  }
  hurtbox() { return { x: this.x + 4, y: this.y + 6, w: this.w - 8, h: this.h - 8 }; }

  touchWall(dir) {
    const L = G.level, x = dir > 0 ? this.x + this.w + 1 : this.x - 1;
    return L.solidAtPx(x, this.y + 8) || L.solidAtPx(x, this.y + this.h - 8);
  }

  update(dt) {
    const L = G.level;
    if (this.dead) return;
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    this.dashCD -= dt; this.atkCD -= dt; this.atkT -= dt; this.lockX -= dt; this.jumpBuf -= dt; this.atkBuf -= dt;
    this.wallCoyote -= dt; this.castT -= dt; this.landT -= dt; this.recoil -= dt;

    if (this.sitting) {
      if (Input.pressed('left') || Input.pressed('right') || Input.pressed('jump') || Input.pressed('down') || Input.pressed('attack') || Input.pressed('dash')) {
        this.sitting = null;
      }
      return;
    }
    const ix = Input.axisX(), iy = Input.axisY();
    const stunned = this.hurtT > 0;

    if (Input.pressed('jump')) this.jumpBuf = 0.12;
    if (Input.pressed('attack')) this.atkBuf = 0.12;

    // ---- cast / focus ----
    if (Input.pressed('cast')) { this.castHold = 0; this.castDone = false; }
    if (Input.down('cast')) this.castHold += dt;
    const canFocus = this.onGround && this.soul >= 33 && this.hp < this.maxHp && ix === 0 && this.dashT <= 0 && !stunned && this.atkT <= 0;
    if (Input.down('cast') && canFocus && this.castHold > 0.22 && !this.castDone) {
      if (this.focusT === 0) Sound.play('focus');
      this.focusT += dt;
      if (this.focusT >= 0.9) {
        this.hp = Math.min(this.maxHp, this.hp + 1); this.soul -= 33; this.focusT = 0; this.castDone = true;
        Sound.play('heal'); G.burst(this.cx, this.cy, 22, { color: '#dff6ff', speed: 220, life: 0.7, size: 3, grav: -80 });
      }
      if (Math.random() < 0.5) G.burst(this.cx + rand(-18, 18), this.y + this.h, 1, { color: '#bfe8ff', speed: 30, life: 0.8, size: 2, grav: -160, vy: -60 });
    } else if (this.focusT > 0) { this.focusT = 0; this.castDone = true; }
    if (Input.released('cast')) {
      if (!this.castDone && this.castHold < 0.3 && this.soul >= 33 && !stunned && this.dashT <= 0) this.castBolt();
      this.castHold = 0;
    }
    const focusing = this.focusT > 0;

    // ---- dash ----
    if (Input.pressed('dash') && this.ab.dash && this.dashCD <= 0 && (this.onGround || this.airDash) && !stunned && !focusing) {
      this.dashT = 0.21; this.dashCD = 0.5;
      if (ix !== 0) this.face = ix;
      if (!this.onGround) this.airDash = false;
      this.atkT = 0; this.vy = 0;
      Sound.play('dash');
      G.burst(this.cx, this.y + this.h - 4, 8, { color: '#9aa9b8', speed: 120, life: 0.4, size: 3, vy: -20 });
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.face * 690; this.vy = 0;
      if (this.ghost.length === 0 || this.t - this.ghost[this.ghost.length - 1].t > 0.03) this.ghost.push({ x: this.x, y: this.y, face: this.face, t: this.t });
    }
    this.ghost = this.ghost.filter(g => this.t - g.t < 0.22);

    // ---- horizontal ----
    if (this.dashT <= 0) {
      if (stunned || this.lockX > 0 || this.recoil > 0) {
        // keep knockback momentum
        this.vx = approach(this.vx, 0, (this.onGround ? 1400 : 500) * dt);
      } else if (focusing) {
        this.vx = 0;
      } else {
        const target = ix * 250;
        this.vx = approach(this.vx, target, (ix === 0 ? 4200 : 3600) * dt * (this.onGround ? 1 : 0.85));
        if (ix !== 0 && this.atkT <= 0) this.face = ix;
        else if (ix !== 0 && this.atkT > 0 && this.atkDir !== 'side') this.face = ix;
      }
      // ---- gravity ----
      this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    }

    // ---- wall slide / wall jump ----
    this.sliding = false;
    if (this.ab.wall && !this.onGround && !stunned && this.dashT <= 0) {
      let wd = 0;
      if (ix !== 0 && this.touchWall(ix)) wd = ix;
      else if (this.wallDir !== 0 && this.wallCoyote > 0 && this.touchWall(this.wallDir)) wd = this.wallDir;
      if (wd !== 0 && ix === wd) {
        this.wallDir = wd; this.wallCoyote = 0.12; this.airDash = true; this.djAvail = true;
        if (this.vy > 0) { this.vy = Math.min(this.vy, 70); this.sliding = true; this.face = -wd; }
      }
    }

    // ---- jump ----
    if (this.onGround) { this.coyote = 0.1; this.airDash = true; this.djAvail = true; }
    else this.coyote -= dt;
    if (this.jumpBuf > 0 && !stunned && !focusing) {
      if (this.onGround || this.coyote > 0) {
        this.vy = -700; this.jumping = true; this.coyote = 0; this.jumpBuf = 0; this.onGround = false;
        Sound.play('jump'); G.burst(this.cx, this.y + this.h, 5, { color: '#8d9aa8', speed: 70, life: 0.3, size: 2, vy: -10 });
      } else if (this.ab.wall && this.wallCoyote > 0 && this.wallDir !== 0) {
        this.vy = -650; this.vx = -this.wallDir * 310; this.face = -this.wallDir; this.lockX = 0.13; this.jumping = true;
        this.jumpBuf = 0; this.wallCoyote = 0; this.dashT = 0; this.airDash = true; this.djAvail = true;
        Sound.play('jump'); G.burst(this.cx + this.wallDir * 10, this.cy, 6, { color: '#cfd8e0', speed: 90, life: 0.3, size: 2 });
      } else if (this.ab.double && this.djAvail) {
        this.vy = -630; this.djAvail = false; this.jumping = true; this.jumpBuf = 0; this.dashT = 0;
        Sound.play('djump'); G.burst(this.cx, this.y + this.h, 12, { color: '#e8f4ff', speed: 140, life: 0.45, size: 3, vy: 40 });
        G.ring(this.cx, this.y + this.h - 4, '#d8ecff');
      }
    }
    if (this.jumping && !Input.down('jump') && this.vy < -360) this.vy = -360;
    if (this.vy >= 0) this.jumping = false;

    // ---- attack ----
    if (this.atkBuf > 0 && this.atkCD <= 0 && !stunned && !focusing && this.dashT <= 0) {
      this.atkBuf = 0;
      this.atkDir = iy < 0 ? 'up' : (iy > 0 && !this.onGround ? 'down' : 'side');
      this.atkT = 0.16; this.atkCD = 0.34; this.atkAlt ^= 1; this.hits = new Set();
      Sound.play('slash');
    }
    if (this.atkT > 0) this.attackHits();

    // ---- move ----
    const wasGround = this.onGround, fallV = this.vy;
    moveBody(this, dt, L);
    if (this.onGround && !wasGround && fallV > 300) { Sound.play('land'); this.landT = 0.12; G.burst(this.cx, this.y + this.h, 6, { color: '#8d9aa8', speed: 80, life: 0.3, size: 2 }); }
    if (this.onGround) { this.airDash = true; this.djAvail = true; this.wallDir = 0; }

    // ---- remember a safe place to come back to after spikes ----
    if (this.onGround && this.dashT <= 0) {
      this.safeT += dt;
      if (this.safeT > 0.25) {
        const tl = Math.floor((this.x - 6) / TILE), tr = Math.floor((this.x + this.w + 6) / TILE), ty = Math.floor((this.y + this.h + 2) / TILE);
        const hz = (t, y) => L.get(t, y) === T_HAZARD;
        if (!hz(tl, ty - 1) && !hz(tr, ty - 1) && L.ground(tl, ty) && L.ground(tr, ty) && L.get(Math.floor(this.cx / TILE), ty - 1) !== T_HAZARD) {
          this.safe = { x: this.cx, y: this.y + this.h };
        }
      }
    } else this.safeT = 0;

    // ---- spikes ----
    {
      const hb = this.hurtbox();
      const x0 = Math.floor(hb.x / TILE), x1 = Math.floor((hb.x + hb.w) / TILE), y0 = Math.floor(hb.y / TILE), y1 = Math.floor((hb.y + hb.h) / TILE);
      let spiked = false;
      for (let ty = y0; ty <= y1 && !spiked; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (L.get(tx, ty) === T_HAZARD) {
          // spikes are the lower half of their tile
          const sb = { x: tx * TILE + 3, y: ty * TILE + 10, w: TILE - 6, h: TILE - 10 };
          if (overlap(hb, sb)) { spiked = true; break; }
        }
      }
      if (spiked && this.invuln <= 0) this.spikeHurt();
    }
  }

  attackHits() {
    const L = G.level;
    let hb;
    const cx = this.cx;
    if (this.atkDir === 'up') hb = { x: cx - 30, y: this.y - 58, w: 60, h: 64 };
    else if (this.atkDir === 'down') hb = { x: cx - 28, y: this.y + this.h - 10, w: 56, h: 56 };
    else hb = { x: this.face > 0 ? this.x + this.w - 4 : this.x + 4 - 70, y: this.y - 8, w: 70, h: 52 };
    this.atkBox = hb;
    let connected = false;
    for (const e of G.enemies) {
      if (e.dead || e.ghostly || this.hits.has(e)) continue;
      if (overlap(hb, e.hb())) {
        this.hits.add(e);
        const dir = this.atkDir === 'side' ? this.face : (e.cx > cx ? 1 : -1);
        e.hurt(this.nail, dir, this.atkDir);
        this.soul = Math.min(this.maxSoul, this.soul + this.soulGain);
        connected = true;
      }
    }
    // tiles: breakable walls, spikes (pogo), plain walls (spark + recoil)
    const x0 = Math.floor(hb.x / TILE), x1 = Math.floor((hb.x + hb.w) / TILE), y0 = Math.floor(hb.y / TILE), y1 = Math.floor((hb.y + hb.h) / TILE);
    let wallHit = false, spikeHit = false;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const v = L.get(tx, ty);
      if (v === T_BREAK) { G.breakTile(tx, ty); connected = true; }
      else if (v === T_HAZARD && this.atkDir === 'down') spikeHit = true;
      else if (v === T_SOLID && this.atkDir === 'side' && !this.hits.has('wall')) wallHit = true;
    }
    if (wallHit) { this.hits.add('wall'); this.vx = -this.face * 140; this.recoil = 0.08; Sound.play('hit'); G.burst(this.face > 0 ? hb.x + hb.w : hb.x, hb.y + hb.h / 2, 6, { color: '#fff3c4', speed: 160, life: 0.25, size: 2 }); }
    if (connected && this.atkDir === 'down' || spikeHit && !this.hits.has('spike')) {
      this.hits.add('spike');
      this.vy = -560; this.jumping = false; this.airDash = true; this.djAvail = true; Sound.play('pogo');
      G.burst(cx, this.y + this.h, 6, { color: '#fff3c4', speed: 140, life: 0.25, size: 2 });
    } else if (connected && this.atkDir === 'side' && !this.hits.has('recoil')) {
      this.hits.add('recoil'); this.vx = -this.face * 150; this.recoil = 0.08;
    }
  }

  castBolt() {
    this.soul -= 33; this.castT = 0.25;
    Sound.play('cast');
    G.projs.push(new Proj({ x: this.cx + this.face * 24, y: this.cy - 2, vx: this.face * 640, vy: 0, r: 15, dmg: 14, friendly: true, pierce: true, life: 0.85, kind: 'bolt', color: '#bfe6ff', passWalls: false }));
    this.vx = -this.face * 140; this.recoil = 0.1;
    G.shake(3, 0.12);
  }

  hurt(dmg, srcX) {
    if (this.invuln > 0 || this.dead || G.state !== 'play') return false;
    this.hp -= dmg; this.invuln = 1.4; this.hurtT = 0.28; this.focusT = 0; this.castDone = true; this.dashT = 0; this.atkT = 0;
    const dir = this.cx < srcX ? -1 : 1;
    this.vx = dir * 300; this.vy = -320; this.onGround = false; this.sitting = null;
    Sound.play('hurt'); G.hitstop(0.14); G.shake(9, 0.3); G.flash = 0.35;
    G.burst(this.cx, this.cy, 16, { color: '#e9f3ff', speed: 240, life: 0.5, size: 3 });
    G.burst(this.cx, this.cy, 10, { color: '#1a2230', speed: 200, life: 0.5, size: 4 });
    if (this.hp <= 0) { this.hp = 0; this.dead = true; G.onPlayerDeath(); }
    return true;
  }
  spikeHurt() {
    this.hp -= 1; this.invuln = 1.4; this.focusT = 0; this.dashT = 0; this.atkT = 0;
    Sound.play('hurt'); G.hitstop(0.12); G.shake(8, 0.3);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; G.onPlayerDeath(); return; }
    G.respawnFade(this.safe.x, this.safe.y);
  }
  sit(bench) {
    this.sitting = bench; this.vx = 0; this.vy = 0; this.x = bench.px - this.w / 2; this.y = bench.py - this.h;
    this.hp = this.maxHp; this.soul = this.maxSoul;
  }
}

// ============================== PROJECTILES ==============================
class Proj {
  constructor(o) {
    Object.assign(this, { vx: 0, vy: 0, r: 8, dmg: 1, grav: 0, life: 3, friendly: false, pierce: false, kind: 'orb', color: '#ff9bd6', passWalls: false, t: 0, hitSet: new Set() }, o);
    if (this.kind === 'shock') { this.w = this.w || 44; this.h = this.h || 34; }
  }
  rect() {
    if (this.kind === 'shock') return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
    if (this.kind === 'beam') return { x: this.x - this.bw / 2, y: 0, w: this.bw, h: G.level.ph };
    if (this.kind === 'pillar') return { x: this.x - this.bw / 2, y: this.y - this.ph, w: this.bw, h: this.ph };
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }
  update(dt) {
    const L = G.level;
    this.t += dt; this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.kind === 'beam' || this.kind === 'pillar') {
      // telegraph, then a short damaging window
      this.active = this.t >= this.tele && this.t < this.tele + this.dur;
      if (this.t >= this.tele + this.dur) this.dead = true;
      if (this.t >= this.tele && !this.fired) { this.fired = true; Sound.play('slam'); G.shake(4, 0.15); }
      if (this.active && !G.player.dead && overlap(G.player.hurtbox(), this.rect())) G.player.hurt(this.dmg, this.x);
      return;
    }
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.kind === 'rock') {
      if (this.t < this.tele) { this.vy = 0; this.y = this.y0; return; }
      if (L.solidAtPx(this.x, this.y + this.r)) { this.dead = true; G.burst(this.x, this.y + this.r, 12, { color: '#8a94a0', speed: 160, life: 0.5, size: 4, vy: -80 }); G.shake(3, 0.1); return; }
    } else if (this.kind === 'shock') {
      const below = L.ground(Math.floor(this.x / TILE), Math.floor((this.y + 4) / TILE));
      if (!below || L.solidAtPx(this.x + Math.sign(this.vx) * this.w / 2, this.y - 6)) { this.dead = true; return; }
      if (Math.random() < 0.5) G.burst(this.x, this.y, 1, { color: this.color, speed: 40, life: 0.3, size: 3, vy: -60 });
    } else if (!this.passWalls && L.solidAtPx(this.x, this.y)) {
      this.dead = true; G.burst(this.x, this.y, 6, { color: this.color, speed: 100, life: 0.3, size: 2 }); return;
    }
    if (this.x < -80 || this.y < -200 || this.x > L.pw + 80 || this.y > L.ph + 80) { this.dead = true; return; }
    const rc = this.rect();
    if (this.friendly) {
      for (const e of G.enemies) {
        if (e.dead || e.ghostly || this.hitSet.has(e)) continue;
        if (overlap(rc, e.hb())) { this.hitSet.add(e); e.hurt(this.dmg, sign(this.vx) || 1, 'spell'); if (!this.pierce) { this.dead = true; return; } }
      }
    } else if (!G.player.dead && overlap(G.player.hurtbox(), rc)) {
      if (G.player.hurt(this.dmg, this.x) && !this.pierce) this.dead = true;
    }
  }
}

// ============================== PICKUPS ==============================
class Geo {
  constructor(x, y, v) {
    this.x = x; this.y = y; this.v = v; this.w = v >= 25 ? 14 : v >= 5 ? 11 : 8; this.h = this.w;
    this.vx = rand(-140, 140); this.vy = rand(-420, -220); this.age = 0; this.onGround = false; this.noOneway = false;
  }
  update(dt) {
    this.age += dt;
    this.vy = Math.min(this.vy + GRAV * 0.8 * dt, 700);
    if (this.onGround) this.vx *= 0.9;
    moveBody(this, dt, G.level);
    if (this.hitL || this.hitR) this.vx = -this.vx * 0.5;
    if (this.onGround && this.vy === 0 && Math.abs(this.vx) > 10 && Math.random() < 0.0) this.vy = -100;
    if (this.age > 0.25) {
      const p = G.player;
      const dx = p.cx - (this.x + this.w / 2), dy = p.cy - (this.y + this.h / 2);
      if (!p.dead && Math.abs(dx) < 26 && Math.abs(dy) < 30) { this.dead = true; p.geo += this.v; Sound.play('geo'); G.burst(this.x, this.y, 3, { color: '#fff1a8', speed: 60, life: 0.3, size: 2 }); G.geoPulse = 1; }
    }
    if (this.age > 60) this.dead = true;
  }
}

class Item {
  // kind: ability | seed | cache
  constructor(def) {
    this.def = def; this.x = def.x * TILE + TILE / 2; this.y = def.y * TILE + TILE / 2; this.t = 0; this.id = def.id; this.kind = def.kind;
  }
  update(dt) {
    this.t += dt;
    const p = G.player;
    if (p.dead || G.state !== 'play') return;
    if (Math.abs(p.cx - this.x) < 30 && Math.abs(p.cy - this.y) < 40) { this.dead = true; G.collectItem(this); }
  }
}

// ============================== ENEMIES ==============================
class Enemy {
  constructor(def, w, h) {
    this.w = w; this.h = h;
    this.x = def.x * TILE + TILE / 2 - w / 2; this.y = def.y * TILE + TILE - h;
    this.vx = 0; this.vy = 0; this.face = def.face || (Math.random() < 0.5 ? -1 : 1);
    this.t = rand(0, 10); this.flash = 0; this.stun = 0; this.dead = false; this.dmg = 1; this.geo = 2;
    this.kb = 1; this.home = { x: this.x + w / 2, y: this.y + h / 2 }; this.onGround = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  hb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  body() { return this.hb(); }
  hurt(dmg, dir, how) {
    if (this.dead) return;
    this.hp -= dmg; this.flash = 0.12; Sound.play('hit'); G.hitstop(how === 'spell' ? 0.03 : 0.06);
    G.burst(this.cx, this.cy, 8, { color: this.blood || '#ffd59a', speed: 220, life: 0.35, size: 3 });
    G.burst(this.cx, this.cy, 3, { color: '#ffffff', speed: 260, life: 0.15, size: 2 });
    G.slashFx(this.cx, this.cy, dir);
    this.onHurt(dir, how);
    if (this.hp <= 0) this.kill();
  }
  onHurt(dir) { if (this.kb) { this.vx = dir * 220 * this.kb; this.vy = -140 * this.kb; this.stun = 0.18; } }
  kill() {
    this.dead = true; Sound.play('enemyDie'); G.shake(4, 0.15);
    G.burst(this.cx, this.cy, 22, { color: this.blood || '#ffd59a', speed: 260, life: 0.6, size: 4 });
    G.burst(this.cx, this.cy, 8, { color: '#0a0d12', speed: 180, life: 0.6, size: 5 });
    G.dropGeo(this.cx, this.cy, this.geo);
  }
  canSeePlayer(range) {
    const p = G.player;
    return !p.dead && Math.abs(p.cx - this.cx) < range && Math.abs(p.cy - this.cy) < range * 0.7;
  }
  physics(dt, grav) {
    if (grav !== false) this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    moveBody(this, dt, G.level);
  }
}

class Crawler extends Enemy {
  constructor(d) { super(d, 34, 22); this.hp = 10; this.geo = 2; this.speed = 52; this.blood = '#ffcf8a'; }
  update(dt) {
    this.t += dt; this.flash -= dt; this.stun -= dt;
    if (this.stun <= 0 && this.onGround) {
      this.vx = this.face * this.speed;
      const L = G.level, fx = Math.floor((this.cx + this.face * (this.w / 2 + 6)) / TILE), fy = Math.floor((this.y + this.h + 4) / TILE);
      if (!L.ground(fx, fy) || L.solid(fx, Math.floor((this.y + this.h - 4) / TILE)) || this.hitL || this.hitR) this.face *= -1;
    } else if (this.onGround) this.vx *= 0.9;
    this.physics(dt);
    if (this.hitL) this.face = 1; if (this.hitR) this.face = -1;
  }
}

class Flyer extends Enemy {
  constructor(d) { super(d, 30, 26); this.hp = 10; this.geo = 3; this.state = 'idle'; this.kb = 1.2; this.blood = '#d9f0a0'; this.ph = rand(0, 6); }
  update(dt) {
    this.t += dt; this.flash -= dt; this.stun -= dt;
    const p = G.player;
    if (this.stun > 0) { this.vx *= 0.94; this.vy *= 0.94; }
    else {
      let tx, ty, sp, acc;
      if (this.state === 'idle') {
        tx = this.home.x + Math.sin(this.t * 0.8 + this.ph) * 40; ty = this.home.y + Math.sin(this.t * 1.7 + this.ph) * 14; sp = 60; acc = 200;
        if (this.canSeePlayer(280)) this.state = 'chase';
      } else {
        tx = p.cx; ty = p.cy - 6 + Math.sin(this.t * 4) * 18; sp = 135; acc = 420;
        if (p.dead || Math.abs(p.cx - this.cx) > 480 || Math.abs(p.cy - this.cy) > 380) this.state = 'idle';
      }
      const dx = tx - this.cx, dy = ty - this.cy, d = Math.hypot(dx, dy) || 1;
      this.vx = approach(this.vx, dx / d * sp, acc * dt); this.vy = approach(this.vy, dy / d * sp, acc * dt);
      if (Math.abs(this.vx) > 10) this.face = sign(this.vx);
    }
    this.physics(dt, false);
    if (this.hitL || this.hitR) this.vx = 0; if (this.hitU || this.onGround) this.vy = 0;
  }
}

class Hopper extends Enemy {
  constructor(d) { super(d, 30, 30); this.hp = 14; this.geo = 4; this.wait = rand(0.6, 1.6); this.tele = 0; this.blood = '#b8e08a'; }
  update(dt) {
    this.t += dt; this.flash -= dt; this.stun -= dt;
    const p = G.player;
    if (this.onGround) {
      if (this.stun <= 0) this.vx *= 0.8;
      if (this.tele > 0) {
        this.tele -= dt;
        if (this.tele <= 0) { this.vy = -540; this.vx = this.face * rand(140, 200); this.onGround = false; }
      } else if (this.stun <= 0) {
        this.wait -= dt;
        if (this.wait <= 0) {
          this.wait = rand(0.9, 1.8);
          if (this.canSeePlayer(380)) { this.face = p.cx > this.cx ? 1 : -1; this.tele = 0.28; }
        }
      }
    }
    this.physics(dt);
    if (this.hitL || this.hitR) this.vx = 0;
  }
}

class Spitter extends Enemy {
  constructor(d) { super(d, 30, 36); this.hp = 12; this.geo = 4; this.cool = rand(0.8, 2); this.tele = 0; this.kb = 0; this.blood = '#9fdc7a'; }
  update(dt) {
    this.t += dt; this.flash -= dt;
    const p = G.player;
    this.face = p.cx > this.cx ? 1 : -1;
    if (this.tele > 0) {
      this.tele -= dt;
      if (this.tele <= 0) this.fire();
    } else {
      this.cool -= dt;
      if (this.cool <= 0 && this.canSeePlayer(430)) { this.tele = 0.45; this.cool = 2.3; Sound.play('tele'); }
    }
    this.physics(dt);
  }
  fire() {
    const p = G.player, g = 900, T = clamp(Math.abs(p.cx - this.cx) / 360 + 0.45, 0.5, 1.1);
    const sx = this.cx, sy = this.y + 6;
    const vx = (p.cx - sx) / T, vy = (p.cy - sy - 0.5 * g * T * T) / T;
    Sound.play('shoot');
    G.projs.push(new Proj({ x: sx, y: sy, vx, vy, grav: g, r: 8, dmg: 1, kind: 'glob', color: '#b6ef6a', life: 3 }));
  }
}

class Shard extends Enemy {     // crystal turret
  constructor(d) { super(d, 30, 42); this.hp = 15; this.geo = 5; this.cool = rand(1, 2.4); this.tele = 0; this.kb = 0; this.blood = '#ff9bd6'; }
  update(dt) {
    this.t += dt; this.flash -= dt;
    const p = G.player;
    this.face = p.cx > this.cx ? 1 : -1;
    if (this.tele > 0) {
      this.tele -= dt;
      if (this.tele <= 0) {
        const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
        Sound.play('shoot');
        for (const o of [-0.26, 0, 0.26]) G.projs.push(new Proj({ x: this.cx, y: this.cy - 6, vx: Math.cos(a + o) * 270, vy: Math.sin(a + o) * 270, r: 7, dmg: 1, kind: 'shard', color: '#ff8fd0', life: 3, rot: a + o }));
      }
    } else {
      this.cool -= dt;
      if (this.cool <= 0 && this.canSeePlayer(470)) { this.tele = 0.5; this.cool = 2.8; Sound.play('tele'); }
    }
    this.physics(dt);
  }
}

class Sentinel extends Enemy {
  constructor(d) { super(d, 40, 58); this.hp = 32; this.geo = 14; this.state = 'patrol'; this.timer = 0; this.kb = 0.35; this.dmg = 1; this.blood = '#d8c8a0'; }
  update(dt) {
    this.t += dt; this.flash -= dt; this.stun -= dt;
    const p = G.player, L = G.level;
    if (this.stun > 0) { this.vx *= 0.9; this.physics(dt); return; }
    if (this.state === 'patrol') {
      this.vx = this.face * 42;
      const fx = Math.floor((this.cx + this.face * (this.w / 2 + 6)) / TILE), fy = Math.floor((this.y + this.h + 4) / TILE);
      if (this.onGround && (!L.ground(fx, fy) || L.solid(fx, Math.floor((this.y + this.h - 6) / TILE)))) this.face *= -1;
      if (!p.dead && Math.abs(p.cx - this.cx) < 300 && Math.abs(p.cy - this.cy) < 90) { this.state = 'wind'; this.timer = 0.55; this.face = p.cx > this.cx ? 1 : -1; Sound.play('tele'); }
    } else if (this.state === 'wind') {
      this.vx = 0; this.timer -= dt;
      if (this.timer <= 0) { this.state = 'charge'; this.timer = 1.0; }
    } else if (this.state === 'charge') {
      this.vx = this.face * 340; this.timer -= dt;
      const fx = Math.floor((this.cx + this.face * (this.w / 2 + 6)) / TILE), fy = Math.floor((this.y + this.h + 4) / TILE);
      if (this.hitL || this.hitR || this.timer <= 0 || !L.ground(fx, fy)) {
        this.state = 'rest'; this.timer = 0.9; this.vx = 0;
        if (this.hitL || this.hitR) { G.shake(3, 0.12); Sound.play('land'); }
      }
    } else if (this.state === 'rest') {
      this.vx = 0; this.timer -= dt; if (this.timer <= 0) this.state = 'patrol';
    }
    this.physics(dt);
  }
}

class ShadeEnemy extends Enemy {   // the shade that keeps your Geo after a death
  constructor(d, geo) { super(d, 34, 46); this.hp = 28; this.geo = 0; this.stored = geo; this.kb = 0.3; this.ghostly = false; this.blood = '#9db5d6'; this.home = { x: this.x + 17, y: this.y + 23 }; }
  update(dt) {
    this.t += dt; this.flash -= dt; this.stun -= dt;
    const p = G.player;
    if (this.stun > 0) { this.vx *= 0.93; this.vy *= 0.93; }
    else {
      const d = Math.hypot(p.cx - this.cx, p.cy - this.cy);
      const tx = d < 360 ? p.cx : this.home.x, ty = (d < 360 ? p.cy - 10 : this.home.y) + Math.sin(this.t * 3) * 20;
      const dx = tx - this.cx, dy = ty - this.cy, m = Math.hypot(dx, dy) || 1;
      this.vx = approach(this.vx, dx / m * 105, 260 * dt); this.vy = approach(this.vy, dy / m * 105, 260 * dt);
      this.face = sign(this.vx) || this.face;
    }
    this.physics(dt, false);
  }
  kill() {
    this.dead = true; Sound.play('enemyDie'); G.shake(5, 0.2);
    G.burst(this.cx, this.cy, 26, { color: '#b9cbe8', speed: 240, life: 0.8, size: 4 });
    G.player.geo += this.stored; G.shadeRecovered(this.stored);
  }
}

const ENEMY_TYPES = { crawler: Crawler, flyer: Flyer, hopper: Hopper, spitter: Spitter, shard: Shard, sentinel: Sentinel };
