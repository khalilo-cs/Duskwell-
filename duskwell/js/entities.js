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
  solid(tx, ty) { const v = this.get(tx, ty); return v === T_SOLID || v === T_BREAK || v === T_GATE || v === T_CRACK || v === T_CRUMBLE; }
  hazard(tx, ty) { const v = this.get(tx, ty); return v === T_HAZARD || v === T_ACID; }
  solidAtPx(x, y) { return this.solid(Math.floor(x / TILE), Math.floor(y / TILE)); }
  ground(tx, ty) { const v = this.get(tx, ty); return v === T_SOLID || v === T_BREAK || v === T_GATE || v === T_ONEWAY || v === T_CRACK || v === T_BOUNCE || v === T_CRUMBLE; }
  // 2D raycast through the tile grid, sampled every 8px
  lineOfSight(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 8);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.solidAtPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }
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
      const top = (v === T_ONEWAY || v === T_BOUNCE) && prevBottom <= by * TILE + 0.5 && !b.noOneway;
      if (L.solid(tx, by) || top) {
        b.y = by * TILE - b.h; b.vy = 0; b.onGround = true;
        if (v === T_BOUNCE) b.bounced = true;
        break;
      }
    }
  } else {
    const ty = Math.floor(b.y / TILE);
    for (let tx = l; tx <= r; tx++) if (L.solid(tx, ty)) { b.y = (ty + 1) * TILE; b.vy = 0; b.hitU = true; break; }
  }
}

const GRAV = 2200, MAXFALL = 900, FALL_MULT = 1.25;
// Comet Heart (super dash): seconds of charge, top speed, and the damage it does on contact
const SD_CHARGE = 0.8, SD_SPEED = 1050, SD_DMG = 13;

// ============================== PLAYER ==============================
class Player {
  constructor() {
    this.w = 22; this.h = 38;
    this.ab = { dash: false, wall: false, double: false, dive: false, superdash: false };
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
    this.t = 0; this.landT = 0; this.ghost = []; this.recoil = 0; this.diving = false; this.bounced = false;
    this.sd = null; this.riding = null; this.turnT = 0; this.airT = 0;
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
    this.wallCoyote -= dt; this.castT -= dt; this.landT -= dt; this.recoil -= dt; this.turnT -= dt;
    this.airT = this.onGround ? 0 : this.airT + dt;

    if (this.sitting) {
      if (Input.pressed('left') || Input.pressed('right') || Input.pressed('jump') || Input.pressed('down') || Input.pressed('attack') || Input.pressed('dash')) {
        this.sitting = null;
      }
      return;
    }
    if (this.diving) { this.updateDive(dt); return; }
    if (this.sd && this.updateSuperdash(dt)) return;
    const ix = Input.axisX(), iy = Input.axisY();
    const stunned = this.hurtT > 0;
    const faceBefore = this.face;

    if (Input.pressed('jump')) this.jumpBuf = 0.12;
    if (Input.pressed('attack')) this.atkBuf = 0.12;

    // ---- cast / focus ----
    if (Input.pressed('cast')) { this.castHold = 0; this.castDone = false; }
    // Down + cast plunges at once, so it never waits for the key to be released
    if (Input.pressed('cast') && this.ab.dive && Input.down('down') && this.soul >= 33 && !stunned && this.dashT <= 0) {
      this.castDone = true; this.startDive(); return;
    }
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
      if (!this.castDone && this.castHold < 0.3 && this.soul >= 33 && !stunned && this.dashT <= 0) {
        this.castBolt();
      }
      this.castHold = 0;
    }
    const focusing = this.focusT > 0;

    // ---- Comet Heart: hold on the ground or on a wall to charge ----
    if (Input.pressed('superdash') && this.ab.superdash && !stunned && !focusing && this.dashT <= 0 && (this.onGround || this.sliding)) {
      this.sd = { state: 'charge', t: 0, wall: this.sliding ? this.wallDir : 0, ready: false, hits: new Set() };
      this.atkT = 0; this.focusT = 0;
      Sound.play('sdcharge');
      return;
    }

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
      // heavier gravity while falling removes the floaty feel
      this.vy = Math.min(this.vy + GRAV * (this.vy > 0 ? FALL_MULT : 1) * dt, MAXFALL);
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
    const wasGround = this.onGround, fallV = this.vy, prevBottom = this.y + this.h;
    moveBody(this, dt, L);
    Mech.land(this, prevBottom);
    if (this.onGround && this.face !== faceBefore && this.atkT <= 0) this.turnT = 0.1;
    if (this.onGround && !wasGround && fallV > 300) { Sound.play('land'); this.landT = 0.12; G.burst(this.cx, this.y + this.h, 6, { color: '#8d9aa8', speed: 80, life: 0.3, size: 2 }); }
    if (this.onGround) { this.airDash = true; this.djAvail = true; this.wallDir = 0; }
    if (this.bounced) {             // mushroom cap
      this.bounced = false; this.onGround = false; this.vy = -1000; this.jumping = false;
      Sound.play('bounce'); G.burst(this.cx, this.y + this.h, 10, { color: '#ffb070', speed: 160, life: 0.5, size: 3, vy: -60 });
    }

    // ---- remember a safe place to come back to after spikes ----
    if (this.onGround && this.dashT <= 0) {
      this.safeT += dt;
      if (this.safeT > 0.25) {
        const tl = Math.floor((this.x - 6) / TILE), tr = Math.floor((this.x + this.w + 6) / TILE), ty = Math.floor((this.y + this.h + 2) / TILE);
        const hz = (t, y) => L.hazard(t, y);
        if (!this.riding && !hz(tl, ty - 1) && !hz(tr, ty - 1) && L.ground(tl, ty) && L.ground(tr, ty) && !L.hazard(Math.floor(this.cx / TILE), ty - 1) && !Mech.unsafe(tl, ty) && !Mech.unsafe(tr, ty)) {
          this.safe = { x: this.cx, y: this.y + this.h };
        }
      }
    } else this.safeT = 0;

    this.checkSpikes();
  }

  checkSpikes() {
    const L = G.level;
    {
      const hb = this.hurtbox();
      const x0 = Math.floor(hb.x / TILE), x1 = Math.floor((hb.x + hb.w) / TILE), y0 = Math.floor(hb.y / TILE), y1 = Math.floor((hb.y + hb.h) / TILE);
      let spiked = false;
      for (let ty = y0; ty <= y1 && !spiked; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (L.hazard(tx, ty)) {
          // spikes are the lower half of their tile; acid starts just under its surface
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
    const mh = Mech.attack(hb, this);
    if (mh.pogo) spikeHit = true;
    if (mh.clank && this.atkDir === 'side' && !this.hits.has('wall')) wallHit = true;
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

  startDive() {
    this.soul -= 33; this.diving = true; this.dashT = 0; this.atkT = 0; this.focusT = 0; this.vx = 0; this.vy = 1250;
    Sound.play('cast'); G.burst(this.cx, this.cy, 12, { color: '#dff3ff', speed: 160, life: 0.4, size: 3 });
  }
  updateDive(dt) {
    this.vx = 0; this.vy = 1250;
    const prevBottom = this.y + this.h;
    moveBody(this, dt, G.level);
    Mech.land(this, prevBottom);
    if (Math.random() < 0.8) G.burst(this.cx + rand(-8, 8), this.y, 1, { color: '#dff3ff', speed: 20, life: 0.35, size: 3, grav: -200 });
    if (!this.onGround) return;
    // a cracked floor gives way and the dive keeps going
    const L = G.level, row = Math.floor((this.y + this.h + 2) / TILE);
    let broke = false;
    for (let tx = Math.floor(this.x / TILE); tx <= Math.floor((this.x + this.w) / TILE); tx++) if (L.get(tx, row) === T_CRACK) { G.breakCrack(tx, row); broke = true; }
    if (broke) { this.onGround = false; return; }
    this.diving = false; this.invuln = Math.max(this.invuln, 0.35); this.landT = 0.15;
    Sound.play('slam'); G.shake(10, 0.35); G.ring(this.cx, this.y + this.h - 6, '#dff3ff', 0.35);
    G.burst(this.cx, this.y + this.h, 24, { color: '#dff3ff', speed: 300, life: 0.5, size: 3, vy: -120 });
    const blast = { x: this.cx - 120, y: this.y + this.h - 80, w: 240, h: 90 };
    for (const e of G.enemies) if (!e.dead && !e.ghostly && overlap(blast, e.hb())) e.hurt(18, e.cx > this.cx ? 1 : -1, 'spell');
    for (const d of [-1, 1]) G.projs.push(new Proj({ kind: 'shock', x: this.cx + d * 30, y: this.y + this.h, vx: d * 480, dmg: 8, friendly: true, pierce: true, life: 0.45, color: '#dff3ff', passWalls: true }));
  }

  hurt(dmg, srcX) {
    if (this.invuln > 0 || this.dead || this.diving || G.state !== 'play') return false;
    this.hp -= dmg; this.invuln = 1.4; this.hurtT = 0.28; this.focusT = 0; this.castDone = true; this.dashT = 0; this.atkT = 0; this.sd = null;
    const dir = this.cx < srcX ? -1 : 1;
    this.vx = dir * 300; this.vy = -320; this.onGround = false; this.sitting = null;
    Sound.play('hurt'); G.hitstop(0.14); G.shake(9, 0.3); G.flash = 0.35;
    G.burst(this.cx, this.cy, 16, { color: '#e9f3ff', speed: 240, life: 0.5, size: 3 });
    G.burst(this.cx, this.cy, 10, { color: '#1a2230', speed: 200, life: 0.5, size: 4 });
    if (this.hp <= 0) { this.hp = 0; this.dead = true; G.onPlayerDeath(); }
    return true;
  }
  spikeHurt() {
    this.hp -= 1; this.invuln = 1.4; this.focusT = 0; this.dashT = 0; this.atkT = 0; this.sd = null; this.riding = null;
    Sound.play('hurt'); G.hitstop(0.12); G.shake(8, 0.3);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; G.onPlayerDeath(); return; }
    G.respawnFade(this.safe.x, this.safe.y);
  }
  // Returns true while the Comet Heart owns the frame (charging or flying).
  updateSuperdash(dt) {
    const s = this.sd, L = G.level;
    s.t += dt;
    if (s.state === 'charge') {
      this.vx = 0;
      if (this.hurtT > 0) { this.sd = null; return false; }
      if (s.wall) {
        this.vy = 0; this.face = -s.wall; this.sliding = true;
        if (!this.touchWall(s.wall)) { this.sd = null; return false; }
      } else {
        this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
        const pb = this.y + this.h;
        moveBody(this, dt, L); Mech.land(this, pb);
        if (!this.onGround) { this.sd = null; return false; }      // the floor gave way
        const ix = Input.axisX(); if (ix) this.face = ix;
      }
      // light gathers toward the chest while charging
      if (Math.random() < 0.7) {
        const a = rand(0, Math.PI * 2), r = rand(40, 70);
        G.parts.push({ x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.6, vy: -Math.sin(a) * r * 2.6, life: 0.35, t: 0, size: rand(2, 3.5), color: s.ready ? '#ffe6a8' : '#ffc070', grav: 0 });
      }
      if (!s.ready && s.t >= SD_CHARGE) { s.ready = true; Sound.play('sdready'); G.ring(this.cx, this.cy, '#ffe6a8'); }
      if (!Input.down('superdash')) {
        if (!s.ready) { this.sd = null; return false; }
        s.state = 'go'; s.t = 0; s.dir = s.wall ? -s.wall : this.face; this.face = s.dir;
        this.sliding = false; this.wallDir = 0;
        Sound.play('sdlaunch'); G.shake(6, 0.2);
        G.burst(this.cx - s.dir * 10, this.cy, 16, { color: '#ffd890', speed: 260, life: 0.45, size: 3 });
      }
      return true;
    }
    // flying: straight and level until a wall, a jump or a hit stops it
    if (Input.pressed('jump') || Input.pressed('dash') || Input.pressed('superdash') || Input.pressed('cast')) {
      this.sd = null; this.vx = s.dir * 260; this.vy = 0; this.jumpBuf = 0; Input.consume('jump');
      Sound.play('land'); return false;
    }
    this.vy = 0; this.vx = s.dir * Math.min(SD_SPEED, 520 + s.t * 5200);
    const pb = this.y + this.h;
    moveBody(this, dt, L);
    Mech.land(this, pb);
    if (this.ghost.length === 0 || this.t - this.ghost[this.ghost.length - 1].t > 0.025) this.ghost.push({ x: this.x, y: this.y, face: this.face, t: this.t, sd: true });
    this.ghost = this.ghost.filter(g => this.t - g.t < 0.26);
    if (Math.random() < 0.9) G.burst(this.cx - s.dir * 16, this.cy + rand(-10, 10), 1, { color: '#ffd890', speed: 40, life: 0.3, size: 3, grav: 0, vy: 0 });
    const hb = this.hurtbox();
    for (const e of G.enemies) {
      if (e.dead || e.ghostly || s.hits.has(e) || !overlap(hb, e.hb())) continue;
      s.hits.add(e); e.hurt(SD_DMG, s.dir, 'spell'); G.hitstop(0.05);
      this.soul = Math.min(this.maxSoul, this.soul + 6);
    }
    if (this.hitL || this.hitR) {
      this.sd = null; this.vx = -s.dir * 170; this.vy = -240; this.recoil = 0.15;
      Sound.play('slam'); G.shake(9, 0.3); G.hitstop(0.06);
      G.burst(s.dir > 0 ? this.x + this.w : this.x, this.cy, 18, { color: '#ffe0b0', speed: 280, life: 0.45, size: 3 });
      return true;
    }
    this.checkSpikes();
    return true;
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
    if (this.kind === 'cloud') { const k = clamp(this.t / 0.25, 0.3, 1); return { x: this.x - this.w * k / 2, y: this.y - this.h * k / 2, w: this.w * k, h: this.h * k }; }
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
    if (this.kind === 'cloud') {
      if (this.life < 0.3) return;      // fading puff no longer hurts
      if (!G.player.dead && overlap(G.player.hurtbox(), this.rect())) G.player.hurt(this.dmg, this.x);
      return;
    }
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
// Enemy brains mirror a PlayMaker FSM: each enemy runs one switch over this.currentState.
const ST = { IDLE: 'idle', PATROL: 'patrol', CHASE: 'chase', ANTICIPATION: 'anticipation', ATTACK: 'attack', RECOIL: 'recoil' };
class Enemy {
  constructor(def, w, h) {
    this.w = w; this.h = h;
    this.x = def.x * TILE + TILE / 2 - w / 2; this.y = def.y * TILE + TILE - h;
    this.vx = 0; this.vy = 0; this.face = def.face || (Math.random() < 0.5 ? -1 : 1);
    this.t = rand(0, 10); this.flash = 0; this.stun = 0; this.dead = false; this.dmg = 1; this.geo = 2;
    this.kb = 1; this.home = { x: this.x + w / 2, y: this.y + h / 2 }; this.onGround = false;
    this.currentState = ST.IDLE; this.stateT = 0; this.lastSeen = -99;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  hb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  body() { return this.hb(); }
  setState(s) { this.currentState = s; this.stateT = 0; }
  tick(dt) { this.t += dt; this.flash -= dt; this.stun -= dt; this.stateT += dt; }
  hurt(dmg, dir, how) {
    if (this.dead) return;
    this.hp -= dmg; this.flash = 0.12; Sound.play('hit'); G.hitstop(how === 'spell' ? 0.03 : 0.06);
    G.burst(this.cx, this.cy, 8, { color: this.blood || '#ffd59a', speed: 220, life: 0.35, size: 3 });
    G.burst(this.cx, this.cy, 3, { color: '#ffffff', speed: 260, life: 0.15, size: 2 });
    G.slashFx(this.cx, this.cy, dir);
    this.onHurt(dir, how);
    if (this.hp <= 0) this.kill();
  }
  // knockback pushes the enemy away from the strike and puts it in the Recoil state
  onHurt(dir) { if (this.kb) { this.vx = dir * 220 * this.kb; this.vy = -140 * this.kb; this.stun = 0.18; this.setState(ST.RECOIL); } }
  kill() {
    this.dead = true; Sound.play('enemyDie'); G.shake(4, 0.15);
    G.burst(this.cx, this.cy, 22, { color: this.blood || '#ffd59a', speed: 260, life: 0.6, size: 4 });
    G.burst(this.cx, this.cy, 8, { color: '#0a0d12', speed: 180, life: 0.6, size: 5 });
    G.dropGeo(this.cx, this.cy, this.geo);
  }
  // distance check first, then a ray through the tiles so walls block the view
  seesPlayer(range) {
    const p = G.player;
    if (p.dead) return false;
    const dx = p.cx - this.cx, dy = p.cy - this.cy;
    if (dx * dx + dy * dy > range * range) return false;
    return G.level.lineOfSight(this.cx, this.y + 8, p.cx, p.cy);
  }
  canSeePlayer(range) { return this.seesPlayer(range); }
  // ledge or wall directly ahead: ground walkers turn or stop instead of walking off
  edgeAhead(dir) {
    const L = G.level, fx = Math.floor((this.cx + dir * (this.w / 2 + 6)) / TILE), fy = Math.floor((this.y + this.h + 4) / TILE);
    return !L.ground(fx, fy) || L.solid(fx, Math.floor((this.y + this.h - 4) / TILE));
  }
  physics(dt, grav) {
    if (grav !== false) this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    moveBody(this, dt, G.level);
  }
}

class Crawler extends Enemy {
  constructor(d) { super(d, 34, 22); this.hp = 10; this.geo = 2; this.speed = 52; this.blood = '#ffcf8a'; }
  update(dt) {
    this.tick(dt);
    switch (this.currentState) {
      case ST.IDLE: this.setState(ST.PATROL); break;
      case ST.PATROL:
        if (this.onGround) { if (this.edgeAhead(this.face)) this.face *= -1; this.vx = this.face * this.speed; }
        break;
      case ST.RECOIL:
        if (this.onGround) this.vx *= 0.85;
        if (this.stateT > 0.18) this.setState(ST.PATROL);
        break;
    }
    this.physics(dt);
    if (this.hitL) this.face = 1; if (this.hitR) this.face = -1;
  }
}

// A hollow husk from the artist's sprite: shuffles along its patrol, hunts when it sees you, and
// gathers itself for a short leap when you are close.
class Husk extends Enemy {
  constructor(d) { super(d, 34, 40); this.hp = 12; this.geo = 3; this.speed = 48; this.blood = '#9db4e0'; this.lostT = 0; }
  update(dt) {
    this.tick(dt);
    const p = G.player, dist = Math.abs(p.cx - this.cx);
    switch (this.currentState) {
      case ST.IDLE: this.setState(ST.PATROL); break;
      case ST.PATROL:
        if (this.onGround) { if (this.edgeAhead(this.face)) this.face *= -1; this.vx = this.face * this.speed; }
        if (this.seesPlayer(300)) this.setState(ST.CHASE);
        break;
      case ST.CHASE:
        if (this.onGround) {
          this.face = p.cx > this.cx ? 1 : -1;
          this.vx = this.edgeAhead(this.face) ? 0 : this.face * 100;
          if (this.stateT > 0.8 && dist < 170 && Math.abs(p.cy - this.cy) < 90 && this.seesPlayer(220)) this.setState(ST.ANTICIPATION);
        }
        this.lostT = this.seesPlayer(420) ? 0 : this.lostT + dt;
        if (this.lostT > 2) { this.lostT = 0; this.setState(ST.PATROL); }
        break;
      case ST.ANTICIPATION:
        this.vx = 0;
        if (this.stateT > 0.25) { this.vy = -400; this.vx = this.face * 230; this.onGround = false; this.setState(ST.ATTACK); }
        break;
      case ST.ATTACK:
        if (this.onGround && this.stateT > 0.12) { this.vx = 0; this.setState(ST.CHASE); }
        break;
      case ST.RECOIL:
        if (this.onGround) this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState(ST.CHASE);
        break;
    }
    this.physics(dt);
    if (this.hitL) this.face = 1; if (this.hitR) this.face = -1;
  }
}

class Flyer extends Enemy {
  constructor(d) { super(d, 30, 26); this.hp = 10; this.geo = 3; this.kb = 1.2; this.blood = '#e8f6ff'; this.ph = rand(0, 6); this.glowR = 110; }
  steer(tx, ty, sp, acc, dt) {
    const dx = tx - this.cx, dy = ty - this.cy, d = Math.hypot(dx, dy) || 1;
    this.vx = approach(this.vx, dx / d * sp, acc * dt); this.vy = approach(this.vy, dy / d * sp, acc * dt);
    if (Math.abs(this.vx) > 10) this.face = sign(this.vx);
  }
  update(dt) {
    this.tick(dt);
    const p = G.player, sees = this.seesPlayer(300);
    if (sees) this.lastSeen = this.t;
    switch (this.currentState) {
      case ST.IDLE:        // drift around the nest
        this.steer(this.home.x + Math.sin(this.t * 0.8 + this.ph) * 40, this.home.y + Math.sin(this.t * 1.7 + this.ph) * 14, 60, 200, dt);
        if (sees) this.setState(ST.CHASE);
        break;
      case ST.CHASE:
        this.steer(p.cx, p.cy - 6 + Math.sin(this.t * 4) * 18, 135, 420, dt);
        if (p.dead || this.t - this.lastSeen > 2) this.setState(ST.IDLE);
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

class Hopper extends Enemy {
  constructor(d) { super(d, 30, 30); this.hp = 14; this.geo = 4; this.wait = rand(0.6, 1.6); this.blood = '#b8e08a'; }
  update(dt) {
    this.tick(dt);
    const p = G.player;
    switch (this.currentState) {
      case ST.IDLE:
        if (this.onGround) this.vx *= 0.8;
        if (this.onGround && this.stateT > this.wait && this.seesPlayer(380)) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); }
        break;
      case ST.ANTICIPATION:  // crouch before the leap
        this.vx = 0;
        if (this.stateT > 0.28) { this.vy = -540; this.vx = this.face * rand(140, 200); this.onGround = false; this.setState(ST.ATTACK); }
        break;
      case ST.ATTACK:
        if (this.onGround && this.stateT > 0.1) { this.wait = rand(0.9, 1.8); this.setState(ST.IDLE); }
        break;
      case ST.RECOIL:
        if (this.onGround) this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState(ST.IDLE);
        break;
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
  constructor(d) { super(d, 30, 42); this.hp = 15; this.geo = 5; this.cool = rand(1, 2.4); this.tele = 0; this.kb = 0; this.blood = '#ff9bd6'; this.glowR = 150; }
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

class Sentinel extends Enemy {   // Idle -> Patrol (waypoints) -> Chase -> Anticipation -> Attack, Recoil when struck
  constructor(d) {
    super(d, 40, 58); this.hp = 32; this.geo = 14; this.kb = 0.35; this.blood = '#d8c8a0';
    this.range = (d.range || 5) * TILE; this.wp = null; this.wpi = 1; this.melee = null;
  }
  // walk the ground both ways from the spawn to find two waypoints before any ledge or wall
  initWaypoints() {
    const L = G.level, fy = Math.floor((this.y + this.h + 4) / TILE), wy = Math.floor((this.y + this.h - 6) / TILE);
    const ok = x => { const tx = Math.floor(x / TILE); return L.ground(tx, fy) && !L.solid(tx, wy); };
    let a = this.cx, b = this.cx;
    for (let i = 0; i < this.range; i += 8) { if (!ok(this.cx - i - this.w / 2 - 4)) break; a = this.cx - i; }
    for (let i = 0; i < this.range; i += 8) { if (!ok(this.cx + i + this.w / 2 + 4)) break; b = this.cx + i; }
    this.wp = [a, b];
  }
  onHurt(dir) {
    if (this.currentState === ST.ANTICIPATION || this.currentState === ST.ATTACK) { this.vx += dir * 60; return; }   // armour holds mid-swing
    super.onHurt(dir);
  }
  update(dt) {
    this.tick(dt);
    if (!this.wp && this.onGround) this.initWaypoints();
    const p = G.player, sees = this.seesPlayer(320) && Math.abs(p.cy - this.cy) < 120;
    if (sees) this.lastSeen = this.t;
    this.melee = null;
    switch (this.currentState) {
      case ST.IDLE:
        this.vx = 0;
        if (sees) this.setState(ST.CHASE);
        else if (this.stateT > 0.8) this.setState(ST.PATROL);
        break;
      case ST.PATROL: {
        if (!this.wp) { this.vx = 0; break; }
        const tx = this.wp[this.wpi];
        this.face = tx > this.cx ? 1 : -1; this.vx = this.face * 42;
        if (Math.abs(tx - this.cx) < 4 || this.edgeAhead(this.face)) { this.wpi ^= 1; this.setState(ST.IDLE); }
        if (sees) this.setState(ST.CHASE);
        break;
      }
      case ST.CHASE:
        this.face = p.cx > this.cx ? 1 : -1;
        this.vx = this.edgeAhead(this.face) ? 0 : this.face * 150;
        if (Math.abs(p.cx - this.cx) < 95 && Math.abs(p.cy - this.cy) < 70) { this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (this.t - this.lastSeen > 1.3) this.setState(ST.PATROL);
        break;
      case ST.ANTICIPATION:   // raise the blade, readable warning
        this.vx = 0;
        if (this.stateT >= 0.45) this.setState(ST.ATTACK);
        break;
      case ST.ATTACK:         // short lunge with a live hitbox
        this.vx = this.edgeAhead(this.face) ? 0 : this.face * 380;
        this.melee = { x: this.face > 0 ? this.x + this.w - 6 : this.x - 44, y: this.y + 10, w: 50, h: 40 };
        if (!p.dead && overlap(p.hurtbox(), this.melee)) p.hurt(1, this.cx);
        if (this.stateT >= 0.28) { this.vx = 0; this.setState(ST.IDLE); }
        break;
      case ST.RECOIL:
        this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState(ST.CHASE);
        break;
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

class Diver extends Enemy {     // mosquito: hovers, locks on, then spears in a straight line
  constructor(d) { super(d, 28, 24); this.hp = 12; this.geo = 4; this.kb = 1; this.blood = '#ffb070'; this.glowR = 90; this.ph = rand(0, 6); this.cool = rand(0.5, 1.5); }
  update(dt) {
    this.tick(dt);
    const p = G.player, sees = this.seesPlayer(330);
    switch (this.currentState) {
      case ST.IDLE: {
        const tx = this.home.x + Math.sin(this.t * 0.9 + this.ph) * 50, ty = this.home.y + Math.sin(this.t * 2 + this.ph) * 16;
        this.vx = approach(this.vx, (tx - this.cx) * 2, 300 * dt); this.vy = approach(this.vy, (ty - this.cy) * 2, 300 * dt);
        this.face = sign(p.cx - this.cx) || this.face;
        this.cool -= dt;
        if (sees && this.cool <= 0) { this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        break;
      }
      case ST.ANTICIPATION: {   // shiver while aiming
        this.vx *= 0.8; this.vy *= 0.8;
        const a = Math.atan2(p.cy - this.cy, p.cx - this.cx); this.aim = a; this.face = Math.cos(a) >= 0 ? 1 : -1;
        if (this.stateT > 0.45) this.setState(ST.ATTACK);
        break;
      }
      case ST.ATTACK:
        this.vx = Math.cos(this.aim) * 560; this.vy = Math.sin(this.aim) * 560;
        if (this.stateT > 0.7 || this.hitL || this.hitR || this.hitU || this.onGround) { this.vx *= 0.2; this.vy *= 0.2; this.cool = 1.3; this.home = { x: this.cx, y: this.cy - 40 }; this.setState(ST.IDLE); }
        break;
      case ST.RECOIL:
        this.vx *= 0.92; this.vy *= 0.92;
        if (this.stateT > 0.2) { this.cool = 0.8; this.setState(ST.IDLE); }
        break;
    }
    this.physics(dt, false);
  }
}

class Spider extends Enemy {    // hangs on a thread, drops on the player, then chases along the floor
  constructor(d) {
    super(d, 34, 24); this.hp = 14; this.geo = 5; this.kb = 0.8; this.blood = '#c8a8ff';
    this.hanging = !d.ground; if (!this.hanging) this.currentState = ST.CHASE;
    this.anchorY = null;
  }
  update(dt) {
    this.tick(dt);
    const p = G.player;
    if (this.anchorY === null) { let ty = Math.floor(this.y / TILE); while (ty > 0 && !G.level.solid(Math.floor(this.cx / TILE), ty)) ty--; this.anchorY = (ty + 1) * TILE; }
    switch (this.currentState) {
      case ST.IDLE:     // hanging
        if (this.hanging) {
          this.vx = 0; this.vy = 0; this.y += Math.sin(this.t * 2) * 0.2;
          if (!p.dead && Math.abs(p.cx - this.cx) < 80 && p.cy > this.cy && p.cy - this.cy < 460 && this.seesPlayer(480)) { this.hanging = false; this.setState(ST.ATTACK); Sound.play('tele'); }
          this.physics(0, false);
          return;
        }
        this.setState(ST.CHASE);
        break;
      case ST.ATTACK:   // falling
        if (this.onGround) { G.shake(3, 0.1); G.burst(this.cx, this.y + this.h, 8, { color: '#8a8aa0', speed: 120, life: 0.4, size: 3 }); this.setState(ST.CHASE); }
        break;
      case ST.CHASE:
        if (this.onGround) {
          this.face = p.cx > this.cx ? 1 : -1;
          this.vx = this.edgeAhead(this.face) ? 0 : this.face * 115;
          if (Math.abs(p.cx - this.cx) < 70 && Math.abs(p.cy - this.cy) < 50 && this.stateT > 0.6) this.setState(ST.ANTICIPATION);
        }
        break;
      case ST.ANTICIPATION:
        this.vx = 0;
        if (this.stateT > 0.3) { this.vy = -380; this.vx = this.face * 260; this.onGround = false; this.setState(ST.RECOIL); }
        break;
      case ST.RECOIL:
        if (this.onGround && this.stateT > 0.15) { this.vx *= 0.8; if (this.stateT > 0.35) this.setState(ST.CHASE); }
        break;
    }
    this.physics(dt);
  }
}

class Shroom extends Enemy {    // slow walker that breathes out a cloud of spores
  constructor(d) { super(d, 30, 36); this.hp = 16; this.geo = 5; this.kb = 0.6; this.blood = '#ffcf70'; this.cool = rand(0.5, 1.5); }
  update(dt) {
    this.tick(dt);
    const p = G.player;
    switch (this.currentState) {
      case ST.IDLE: this.vx = 0; if (this.stateT > 0.6) this.setState(ST.PATROL); break;
      case ST.PATROL:
        if (this.onGround) { if (this.edgeAhead(this.face)) this.face *= -1; this.vx = this.face * 32; }
        this.cool -= dt;
        if (this.cool <= 0 && this.seesPlayer(210) && Math.abs(p.cy - this.cy) < 80) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        break;
      case ST.ANTICIPATION: this.vx = 0; if (this.stateT > 0.5) this.setState(ST.ATTACK); break;
      case ST.ATTACK:
        G.projs.push(new Proj({ kind: 'cloud', x: this.cx + this.face * 46, y: this.cy - 4, w: 84, h: 64, vx: this.face * 30, vy: -12, dmg: 1, life: 1.5, pierce: true, passWalls: true, color: '#e8d070' }));
        Sound.play('dash'); this.cool = 2; this.setState(ST.IDLE);
        break;
      case ST.RECOIL: if (this.onGround) this.vx *= 0.85; if (this.stateT > 0.2) this.setState(ST.PATROL); break;
    }
    this.physics(dt);
  }
}

class Jelly extends Enemy {     // drifting jellyfish that bursts into sparks when popped
  constructor(d) { super(d, 30, 32); this.hp = 8; this.geo = 3; this.kb = 0.6; this.blood = '#ffc890'; this.glowR = 130; this.ph = rand(0, 6); }
  update(dt) {
    this.tick(dt);
    switch (this.currentState) {
      case ST.RECOIL: this.vx *= 0.9; this.vy *= 0.9; if (this.stateT > 0.25) this.setState(ST.IDLE); break;
      default: {
        const tx = this.home.x + Math.sin(this.t * 0.5 + this.ph) * 60, ty = this.home.y + Math.sin(this.t * 0.9 + this.ph) * 30;
        this.vx = approach(this.vx, (tx - this.cx) * 0.8, 60 * dt); this.vy = approach(this.vy, (ty - this.cy) * 0.8, 60 * dt);
      }
    }
    this.physics(dt, false);
  }
  kill() {
    super.kill();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; G.projs.push(new Proj({ kind: 'orb', x: this.cx, y: this.cy, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 7, dmg: 1, life: 1.4, color: '#ffc890' })); }
  }
}

const ENEMY_TYPES = { husk: Husk, crawler: Crawler, flyer: Flyer, hopper: Hopper, spitter: Spitter, shard: Shard, sentinel: Sentinel, diver: Diver, spider: Spider, shroom: Shroom, jelly: Jelly };
