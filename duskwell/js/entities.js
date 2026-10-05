'use strict';
// Physics, the player, regular enemies, projectiles and pickups.
// Everything talks to the running game through the global G (set in game.js).

// a room in play: the tile grid plus its gravity fields, wind zones and ice
class Level {
  constructor(def) {
    this.def = def; this.id = def.id; this.w = def.w; this.h = def.h;
    this.t = Uint8Array.from(def.t);
    this.pw = def.w * TILE; this.ph = def.h * TILE;
    this.ice = def.iceCells || new Set();
    this.gravs = (def.gravs || []).map(z => ({ x: z.x * TILE, y: z.y * TILE, w: z.w * TILE, h: z.h * TILE, k: z.k }));
    this.winds = (def.winds || []).map(w => ({ x: w.x * TILE, y: w.y * TILE, w: w.w * TILE, h: w.h * TILE, wx: w.wx, wy: w.wy }));
  }
  // gravity field / wind zone at a pixel, or null
  gravAt(px, py) { for (const z of this.gravs) if (px >= z.x && px < z.x + z.w && py >= z.y && py < z.y + z.h) return z; return null; }
  windAt(px, py) { for (const w of this.winds) if (px >= w.x && px < w.x + w.w && py >= w.y && py < w.y + w.h) return w; return null; }
  // is this tile slippery ice
  isIce(tx, ty) { return this.ice.size > 0 && tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.ice.has(ty * this.w + tx); }
  // tile at tx, ty (outside the room counts as solid)
  get(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return T_SOLID;
    return this.t[ty * this.w + tx];
  }
  // change a tile
  set(tx, ty, v) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
    const rock = a => a === T_SOLID || a === T_BREAK || a === T_GATE || a === T_CRACK, old = this.t[ty * this.w + tx];
    this.t[ty * this.w + tx] = v;
    if (rock(old) !== rock(v)) Lumen.invalidate();          // the baked relief of the rock is out of date
  }
  // tile queries: blocks the body, hurts, or can be stood on
  solid(tx, ty) { const v = this.get(tx, ty); return v === T_SOLID || v === T_BREAK || v === T_GATE || v === T_CRACK || v === T_CRUMBLE; }
  hazard(tx, ty) { const v = this.get(tx, ty); return v === T_HAZARD || v === T_ACID; }
  // the same queries by pixel position
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

// gravity, fastest fall and the extra weight when falling
const GRAV = 2200, MAXFALL = 900, FALL_MULT = 1.25;
// Comet Heart (super dash): seconds of charge, top speed, and the damage it does on contact
const SD_CHARGE = 0.8, SD_SPEED = 1050, SD_DMG = 13;

// ============================== PLAYER ==============================
class Player {
  // start values: size, health, soul, geo, abilities
  constructor() {
    this.w = 22; this.h = 38;
    this.ab = { dash: false, wall: false, double: false, dive: false, superdash: false, wail: false };
    this.maxHp = 5; this.hp = 5; this.soul = 0; this.maxSoul = Diff.soulMax; this.geo = 0;
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
    this.sd = null; this.riding = null; this.turnT = 0; this.airT = 0; this.wailT = 0; this.wailTick = 0; this.wailTop = 0;
    this.rendT = 0; this.rendHold = false; this.rendReady = false; this.rushT = 0; this.rushCD = 0; this.rushTick = 0; this.novaT = 0; this.novaFired = false; this.dashStruck = new Set();
  }
  // smaller box that enemies hurt
  hurtbox() { return { x: this.x + 4, y: this.y + 6, w: this.w - 8, h: this.h - 8 }; }

  // standing on ice
  onIce() { const L = G.level, ty = Math.floor((this.y + this.h + 2) / TILE); return L.isIce(Math.floor((this.x + 4) / TILE), ty) || L.isIce(Math.floor((this.x + this.w - 4) / TILE), ty); }
  // ---- numbers the charms change (see charms.js) ----
  // every gain of soul comes through here: the vessel is large, and each blow fills only part of what it used to
  gainSoul(n) { this.soul = Math.min(this.maxSoul, this.soul + n * Diff.soulFill); }
  spellCost() { return (Charms.has('thrift') ? 24 : 33) - (G.flags.buy_rune ? 5 : 0); }          // the wizard's rune takes five off
  // numbers that charms and gear change: heal time, damage, spell power, strike gap, reach
  focusTime() { return 0.9 * (Charms.has('focus') ? 0.62 : 1) * (Charms.has('deep') ? 1.6 : 1) * Gear.focusK(); }
  nailDamage() { return Math.max(1, Math.round(this.nail * Gear.dmgK() * (Charms.has('fury') && this.hp <= 1 && this.maxHp > 1 ? 1.75 : 1))); }
  spellDmg(base) { return Math.round(base * (Charms.has('mage') ? 1.4 : 1) * (G.flags.buy_ink ? 1.25 : 1) * Quests.spellK()); }          // the wizard's ink adds a quarter
  strikeGap() { const c = Gear.atkCD(); return Charms.has('swift') ? Math.min(0.21, c * 0.62) : c; }
  reachK() { return (Charms.has('reach') ? 1.35 : 1) * Gear.reachK(); }

  // is there a wall on this side
  touchWall(dir) {
    const L = G.level, x = dir > 0 ? this.x + this.w + 1 : this.x - 1;
    return L.solidAtPx(x, this.y + 8) || L.solidAtPx(x, this.y + this.h - 8);
  }

  // one step: input, walking, jumping, strikes, spells, abilities, physics
  update(dt) {
    const L = G.level;
    if (this.dead) return;
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    this.dashCD -= dt; this.atkCD -= dt; this.atkT -= dt; this.lockX -= dt; this.jumpBuf -= dt; this.atkBuf -= dt;
    this.wallCoyote -= dt; this.castT -= dt; this.landT -= dt; this.recoil -= dt; this.turnT -= dt; this.rushCD -= dt;
    this.airT = this.onGround ? 0 : this.airT + dt;

    if (this.sitting) {
      if (Input.pressed('left') || Input.pressed('right') || Input.pressed('jump') || Input.pressed('down') || Input.pressed('attack') || Input.pressed('dash')) {
        this.sitting = null;
      }
      return;
    }
    if (this.diving) { this.updateDive(dt); return; }
    if (this.wailT > 0) { this.updateWail(dt); return; }
    if (this.sd && this.updateSuperdash(dt)) return;
    const ix = Input.axisX(), iy = Input.axisY();
    const stunned = this.hurtT > 0;
    const faceBefore = this.face;

    // ---- Soul Nova: strike and spell together, with the vessel full ----
    if (this.novaT <= 0 && Gear.hasArt('nova') && !stunned && this.dashT <= 0 && this.soul >= Gear.NOVA_COST &&
        ((Input.pressed('cast') && Input.down('attack')) || (Input.pressed('attack') && Input.down('cast')))) { this.startNova(); return; }
    if (this.novaT > 0) { this.updateNova(dt); return; }

    if (Input.pressed('jump')) this.jumpBuf = 0.12;
    if (Input.pressed('attack')) { this.atkBuf = 0.12; this.rendHold = true; this.rendT = 0; this.rendReady = false; }

    // ---- cast / focus ----
    if (Input.pressed('cast')) { this.castHold = 0; this.castDone = false; }
    // Up + cast loosens the Dusk Cry at once; Down + cast plunges at once. Neither waits for the key to be released
    if (Input.pressed('cast') && this.ab.wail && Input.down('up') && this.soul >= this.spellCost() && !stunned && this.dashT <= 0) {
      this.castDone = true; this.startWail(); return;
    }
    if (Input.pressed('cast') && this.ab.dive && Input.down('down') && this.soul >= this.spellCost() && !stunned && this.dashT <= 0) {
      this.castDone = true; this.startDive(); return;
    }
    if (Input.down('cast')) this.castHold += dt;
    const canFocus = this.onGround && this.soul >= this.spellCost() && this.hp < this.maxHp && ix === 0 && this.dashT <= 0 && !stunned && this.atkT <= 0;
    if (Input.down('cast') && canFocus && this.castHold > 0.22 && !this.castDone) {
      if (this.focusT === 0) Sound.play('focus');
      this.focusT += dt;
      if (this.focusT >= this.focusTime()) {
        this.hp = Math.min(this.maxHp, this.hp + (Charms.has('deep') ? 2 : 1)); this.soul -= this.spellCost(); this.focusT = 0; this.castDone = true;
        Sound.play('heal'); G.burst(this.cx, this.cy, 22, { color: '#dff6ff', speed: 220, life: 0.7, size: 3, grav: -80 });
      }
      if (Math.random() < 0.5) G.burst(this.cx + rand(-18, 18), this.y + this.h, 1, { color: '#bfe8ff', speed: 30, life: 0.8, size: 2, grav: -160, vy: -60 });
    } else if (this.focusT > 0) { this.focusT = 0; this.castDone = true; }
    if (Input.released('cast')) {
      if (!this.castDone && this.castHold < 0.3 && this.soul >= this.spellCost() && !stunned && this.dashT <= 0) {
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
      this.dashT = 0.21; this.dashCD = (Charms.has('dashmaster') ? 0.3 : 0.5) * Gear.dashK(); this.dashStruck = new Set();
      if (ix !== 0) this.face = ix;
      if (!this.onGround) this.airDash = false;
      this.atkT = 0; this.vy = 0;
      Sound.play('dash');
      G.burst(this.cx, this.y + this.h - 4, 8, { color: '#9aa9b8', speed: 120, life: 0.4, size: 3, vy: -20 });
    }
    // ---- Dusk Rush: strike while dashing ----
    if (this.rushT <= 0 && this.dashT > 0 && Gear.hasArt('rush') && this.rushCD <= 0 && !stunned && Input.pressed('attack')) this.startRush();
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.face * (this.rushT > 0 ? 880 : 690); this.vy = 0;
      if (this.rushT > 0) this.updateRush(dt);
      else if (Gear.dashHit()) this.dashStrike();
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
        const target = ix * (Charms.has('boots') ? 305 : 250) * Gear.speedK() * (this.rendT > 0.3 ? 0.4 : 1);
        const grip = this.onGround && this.onIce() && !Charms.has('soles') && !Gear.iceGrip() ? 0.14 : 1;          // ice: slow to start, slower to stop
        this.vx = approach(this.vx, target, (ix === 0 ? 4200 : 3600) * dt * (this.onGround ? grip : 0.85));
        if (ix !== 0 && this.atkT <= 0) this.face = ix;
        else if (ix !== 0 && this.atkT > 0 && this.atkDir !== 'side') this.face = ix;
      }
      // ---- gravity ----
      // heavier gravity while falling removes the floaty feel
      const gz = L.gravAt(this.cx, this.cy);
      this.moonK = gz ? gz.k : 1;
      const step = Charms.has('moonstep') && this.vy > 0 ? 0.7 : 1;                  // Moonstep: a slower fall
      this.vy = Math.min(this.vy + GRAV * this.moonK * step * (this.vy > 0 ? FALL_MULT : 1) * dt, MAXFALL * (gz ? 0.6 : 1) * step);
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
        this.vy = Charms.has('gale') ? -770 : -630; this.djAvail = false; this.jumping = true; this.jumpBuf = 0; this.dashT = 0;
        Sound.play('djump'); G.burst(this.cx, this.y + this.h, 12, { color: '#e8f4ff', speed: 140, life: 0.45, size: 3, vy: 40 });
        G.ring(this.cx, this.y + this.h - 4, '#d8ecff');
      }
    }
    if (this.jumping && !Input.down('jump') && this.vy < -360) this.vy = -360;
    if (this.vy >= 0) this.jumping = false;

    // ---- Moon Rend: hold the strike key until the blade gleams, then let go ----
    if (this.rendHold) {
      if (!Gear.hasArt('rend') || stunned || focusing || this.dashT > 0 || this.sd) { this.rendHold = false; this.rendT = 0; this.rendReady = false; }
      else if (Input.down('attack')) {
        this.rendT += dt;
        if (!this.rendReady && this.rendT >= Gear.REND_CHARGE) { this.rendReady = true; Sound.play('rendReady'); G.ring(this.cx, this.cy - 4, '#e8f0ff', 0.6); G.burst(this.cx + this.face * 20, this.cy - 6, 10, { color: '#e8f0ff', speed: 120, life: 0.4, size: 3, grav: -60 }); }
      } else {
        if (this.rendReady && Input.released('attack')) this.rend();
        this.rendHold = false; this.rendT = 0; this.rendReady = false;
      }
    }

    // ---- attack ----
    if (this.atkBuf > 0 && this.atkCD <= 0 && !stunned && !focusing && this.dashT <= 0) {
      this.atkBuf = 0;
      this.atkDir = iy < 0 ? 'up' : (iy > 0 && !this.onGround ? 'down' : 'side');
      this.atkT = Math.min(0.16, Gear.atkCD() * 0.6); this.atkCD = this.strikeGap(); this.atkAlt ^= 1; this.hits = new Set();
      Sound.play('slash');
      if (Charms.has('echo') && this.atkDir === 'side' && (this.echoN = (this.echoN || 0) + 1) % 3 === 0) {     // Blade Echo: every third strike sends a wave
        G.projs.push(new Proj({ kind: 'wave', x: this.cx + this.face * 34, y: this.cy - 4, vx: this.face * 560, vy: 0, r: 17, dmg: Math.max(2, Math.round(this.nailDamage() * 0.6)), friendly: true, pierce: true, life: 0.55, color: '#d8c8ff' }));
        G.burst(this.cx + this.face * 34, this.cy - 4, 8, { color: '#d8c8ff', speed: 140, life: 0.3, size: 3 });
      }
    }
    if (this.atkT > 0) this.attackHits();

    // ---- wind: updrafts lift to their own speed, crosswinds push the hero sideways while airborne ----
    let windPush = 0;
    const wz = this.dashT <= 0 && !this.dead ? L.windAt(this.cx, this.cy) : null;
    if (wz) {
      if (wz.wy < 0 && this.vy > wz.wy) this.vy = Math.max(wz.wy, this.vy - 3600 * dt);
      else if (wz.wy > 0 && this.vy < wz.wy) this.vy = Math.min(wz.wy, this.vy + 3600 * dt);
      if (wz.wx && !this.onGround) windPush = wz.wx * (Charms.has('gale') ? 0.4 : 1);
    }
    this.inWind = !!wz;
    // ---- move ----
    const wasGround = this.onGround, fallV = this.vy, prevBottom = this.y + this.h;
    this.vx += windPush;
    moveBody(this, dt, L);
    if (windPush) this.vx = this.hitL || this.hitR ? 0 : this.vx - windPush;
    Mech.land(this, prevBottom);
    if (this.onGround && this.face !== faceBefore && this.atkT <= 0) this.turnT = 0.1;
    if (this.onGround && !wasGround && fallV > 300) { Sound.play('land'); this.landT = 0.12; G.burst(this.cx, this.y + this.h, 6, { color: '#8d9aa8', speed: 80, life: 0.3, size: 2 }); }
    if (this.onGround) { this.airDash = true; this.djAvail = true; this.wallDir = 0; }
    if (this.bounced) {             // mushroom cap
      this.bounced = false; this.onGround = false; this.vy = -1000; this.jumping = false;
      Sound.play('bounce'); G.burst(this.cx, this.y + this.h, 10, { color: '#ffb070', speed: 160, life: 0.5, size: 3, vy: -60 });
      G.bounceAt = { x: this.cx, y: this.y + this.h, t: G.t };          // the mushroom squashes under the landing
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

  // touching spikes or acid hurts and returns the player to safe ground
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

  // what the nail hits this frame: enemies, breakable walls, levers; pogo and soul gain
  attackHits() {
    const L = G.level;
    let hb;
    const cx = this.cx;
    const rk = this.reachK();
    if (this.atkDir === 'up') hb = { x: cx - 30, y: this.y + 6 - 64 * rk, w: 60, h: 64 * rk };
    else if (this.atkDir === 'down') hb = { x: cx - 28, y: this.y + this.h - 10, w: 56, h: 56 * rk };
    else { const bh = Gear.boxH(); hb = { x: this.face > 0 ? this.x + this.w - 4 : this.x + 4 - 70 * rk, y: this.y + 18 - bh / 2, w: 70 * rk, h: bh }; }
    this.atkBox = hb;
    let connected = false;
    for (const e of G.enemies) {
      if (e.dead || e.ghostly || this.hits.has(e)) continue;
      if (overlap(hb, e.hb())) {
        this.hits.add(e);
        const dir = this.atkDir === 'side' ? this.face : (e.cx > cx ? 1 : -1);
        const kb0 = e.kb; e.kb = kb0 * Gear.kbK();
        const landed = e.hurt(this.nailDamage(), dir, this.atkDir);      // false: a shield turned it aside
        e.kb = kb0;
        if (landed !== false && !e.dummy) {
          this.gainSoul(Math.round((this.soulGain + (Charms.has('siphon') ? 6 : 0) + Gear.soulBonus()) * Gear.soulK()));
          if (Charms.has('cinder') && !e.dead) e.burnT = 0.6;        // Cinder Edge: a burn lands a moment after the blow
          if (Gear.bleeds() && !e.dead) e.bleedT = 1.1;              // Bone Saw: the wound keeps bleeding
        }
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

  // ---- the arts of the nail ----
  // Moon Rend: a great crescent of moonlight that cuts through everything in its way
  rend() {
    const dir = this.face; Coach.did('rend');
    this.atkDir = 'side'; this.atkT = 0.2; this.atkCD = 0.42; this.atkAlt ^= 1; this.hits = new Set(); this.atkBuf = 0;
    G.projs.push(new Proj({ kind: 'moon', x: this.cx + dir * 40, y: this.cy - 2, vx: dir * 800, r: 40, dmg: Math.max(6, Math.round(this.nailDamage() * 2.6)), friendly: true, pierce: true, life: 0.62, color: '#dbe8ff', passWalls: false }));
    this.vx = dir * 240; this.lockX = 0.12;
    Sound.play('rend'); G.hitstop(0.05); G.shake(8, 0.25); G.flash = Math.max(G.flash, 0.18);
    G.ring(this.cx + dir * 30, this.cy - 2, '#dbe8ff', 1.6); G.ring(this.cx + dir * 30, this.cy - 2, '#ffffff', 2.4);
    G.burst(this.cx + dir * 30, this.cy - 2, 22, { color: '#dbe8ff', speed: 340, life: 0.45, size: 4, grav: 0 });
  }
  // Dusk Rush: the dash turns into a charge of blades; the Wanderer cannot be touched while it lasts
  startRush() {
    Coach.did('rush');
    this.rushT = Gear.RUSH_TIME; this.dashT = Math.max(this.dashT, this.rushT + 0.02); this.rushCD = 1.1; this.rushTick = 0; this.atkBuf = 0;
    this.invuln = Math.max(this.invuln, Gear.RUSH_TIME + 0.2); this.rendHold = false;
    Sound.play('rush'); G.shake(6, 0.3); G.flash = Math.max(G.flash, 0.15);
    G.ring(this.cx, this.cy, '#ffc070', 0.7);
    G.burst(this.cx, this.cy, 16, { color: '#ffc070', speed: 280, life: 0.4, size: 3, grav: 0 });
  }
  // keep rushing, slash whatever is crossed
  updateRush(dt) {
    const f = this.face, reach = { x: f > 0 ? this.x - 10 : this.x - 56, y: this.y - 16, w: this.w + 66, h: this.h + 32 };
    this.invuln = Math.max(this.invuln, 0.15);
    this.rushTick -= dt;
    let touching = false;
    for (const e of G.enemies) {
      if (e.dead || e.ghostly || !overlap(reach, e.hb())) continue;
      if (e.isBoss && (e.state === 'intro' || e.state === 'dying')) continue;
      touching = true;
      if (this.rushTick > 0) continue;
      e.hurt(Math.max(2, Math.round(this.nailDamage() * 0.75)), f, 'spell');
      G.fx.push({ type: 'cut', x: e.cx + rand(-10, 10), y: e.cy + rand(-14, 14), a: rand(-0.9, 0.9) + (f > 0 ? 0 : Math.PI), t: 0, life: 0.2, color: '#ffe0a8' });
      if (!e.dummy) this.gainSoul(2);
    }
    if (this.rushTick <= 0) this.rushTick = 0.06;
    // the Wanderer slows among the foes and cuts them again and again, then bursts out the far side
    this.rushT -= dt * (touching ? 0.45 : 1);
    this.vx = f * (touching ? 300 : 880);
    this.dashT = Math.max(this.dashT, this.rushT + 0.02);
    if (Math.random() < 0.9) G.burst(this.cx - f * 14, this.cy + rand(-14, 14), 1, { color: pick(['#ffc070', '#fff0c8']), speed: 60, life: 0.3, size: 3, grav: 0 });
    if (this.rushT <= 0) {            // the last cut: a crescent flies on ahead
      this.rushT = 0;
      G.projs.push(new Proj({ kind: 'wave', x: this.cx + f * 34, y: this.cy - 4, vx: f * 620, vy: 0, r: 20, dmg: Math.max(3, Math.round(this.nailDamage() * 0.9)), friendly: true, pierce: true, life: 0.5, color: '#ffc070' }));
      G.ring(this.cx + f * 30, this.cy, '#ffc070', 1.4); Sound.play('slash');
    }
  }
  // the Embercloak: a plain dash scorches whatever it passes through
  dashStrike() {
    const hb = { x: this.x - 6, y: this.y - 6, w: this.w + 12, h: this.h + 12 };
    for (const e of G.enemies) {
      if (e.dead || e.ghostly || this.dashStruck.has(e) || !overlap(hb, e.hb())) continue;
      this.dashStruck.add(e);
      e.hurt(Math.max(2, Math.round(this.nail * 0.8)), this.face, 'spell'); e.burnT = Math.max(e.burnT || 0, 0.5);
      G.burst(e.cx, e.cy, 10, { color: '#ff9a50', speed: 220, life: 0.4, size: 3 });
    }
  }
  // Soul Nova: the Wanderer gathers the whole vessel, hangs for a breath, then it all goes at once
  startNova() {
    Coach.did('nova');
    this.soul -= Gear.NOVA_COST; this.novaT = 1.0; this.novaFired = false; this.dashT = 0; this.atkT = 0; this.focusT = 0; this.rendHold = false; this.rendT = 0; this.castDone = true;
    this.vx = 0; this.vy = 0; this.invuln = Math.max(this.invuln, 1.4);
    Sound.play('novaCharge'); G.shake(3, 0.5);
  }
  // Soul Nova charge and blast
  updateNova(dt) {
    this.novaT -= dt; this.vx = 0; this.vy = -22;
    const el = 1.0 - this.novaT;
    if (!this.novaFired && el < 0.45 && Math.random() < 0.9) {            // soul light drawn in from all sides
      const a = rand(0, Math.PI * 2), r = rand(90, 190);
      G.burst(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, 1, { color: pick(['#9cf0ff', '#ffffff', '#cfe6ff']), speed: 0, life: 0.3, size: 3, grav: 0, vx: 0 });
      const q = G.parts[G.parts.length - 1]; if (q) { q.vx = -Math.cos(a) * r * 3.2; q.vy = -Math.sin(a) * r * 3.2; }
    }
    if (!this.novaFired && el >= 0.45) {
      this.novaFired = true;
      const R = 340, cx = this.cx, cy = this.cy;
      Sound.play('nova'); G.shake(18, 0.7); G.hitstop(0.1); G.flash = 0.55; G.slowmo = Math.max(G.slowmo, 0.4);
      G.fx.push({ type: 'nova', x: cx, y: cy, t: 0, life: 0.9, R });
      G.ring(cx, cy, '#ffffff', 1); G.ring(cx, cy, '#9cf0ff', 1); G.ring(cx, cy, '#cfe6ff', 0.5);
      G.burst(cx, cy, 70, { color: '#9cf0ff', speed: 560, life: 0.8, size: 5, grav: 0 });
      G.burst(cx, cy, 40, { color: '#ffffff', speed: 380, life: 0.6, size: 4, grav: 0 });
      for (const e of G.enemies) {
        if (e.dead || e.ghostly) continue;
        if (e.isBoss && (e.state === 'intro' || e.state === 'dying')) continue;
        const dx = e.cx - cx, dy = e.cy - cy;
        if (Math.hypot(dx, dy) < R + Math.max(e.w, e.h) / 2) e.hurt(this.spellDmg(30), dx >= 0 ? 1 : -1, 'spell');
      }
      for (const q of G.projs) {                                     // everything hostile in the blast is wiped away
        if (q.friendly || q.kind === 'beam' || q.kind === 'pillar') continue;
        if (Math.hypot(q.x - cx, q.y - cy) < R + 30) { q.dead = true; G.burst(q.x, q.y, 6, { color: '#cfe6ff', speed: 160, life: 0.35, size: 3 }); }
      }
    }
    if (this.novaT <= 0) { this.novaT = 0; this.novaFired = false; this.invuln = Math.max(this.invuln, 0.6); this.vy = 0; }
  }

  // soul bolt: spend soul and fire it
  castBolt() {
    this.soul -= this.spellCost(); this.castT = 0.25;
    Sound.play('cast');
    G.projs.push(new Proj({ x: this.cx + this.face * 24, y: this.cy - 2, vx: this.face * 640, vy: 0, r: 15, dmg: this.spellDmg(14), friendly: true, pierce: true, life: 0.85, kind: 'bolt', color: '#bfe6ff', passWalls: false }));
    this.vx = -this.face * 140; this.recoil = 0.1;
    G.shake(3, 0.12);
  }

  // Dusk Cry: the Wanderer hangs in the air and a column of light stands above, striking everything in it
  startWail() {
    this.soul -= this.spellCost(); this.wailT = 0.55; this.wailTick = 0; this.dashT = 0; this.atkT = 0; this.focusT = 0; this.vx = 0; this.vy = 0;
    Sound.play('cast'); G.shake(5, 0.3); G.ring(this.cx, this.cy, '#dff3ff', 0.4);
    G.burst(this.cx, this.cy, 14, { color: '#dff3ff', speed: 200, life: 0.5, size: 3, grav: -120 });
  }
  // damage inside the column over time
  updateWail(dt) {
    const L = G.level;
    this.wailT -= dt; this.vx = 0; this.vy = 0;
    // the column stops at the first ceiling above
    const tx = Math.floor(this.cx / TILE); let ty = Math.floor(this.y / TILE);
    while (ty > 0 && !L.solid(tx, ty - 1) && this.y - ty * TILE < 250) ty--;
    this.wailTop = Math.max(this.y - 250, ty * TILE);
    this.wailTick -= dt;
    if (this.wailTick <= 0) {
      this.wailTick = 0.13;
      const col = { x: this.cx - 38, y: this.wailTop, w: 76, h: this.y + this.h - this.wailTop };
      for (const e of G.enemies) if (!e.dead && !e.ghostly && overlap(col, e.hb())) { e.hurt(this.spellDmg(6), e.cx > this.cx ? 1 : -1, 'wail'); this.gainSoul(1); }
      G.burst(this.cx + rand(-30, 30), rand(this.wailTop, this.y), 5, { color: '#dff3ff', speed: 60, life: 0.4, size: 3, grav: -260 });
    }
    if (this.wailT <= 0) { this.wailT = 0; this.invuln = Math.max(this.invuln, 0.2); }
  }
  // dive: plunge down from the air
  startDive() {
    Coach.did('dive');
    this.soul -= this.spellCost(); this.diving = true; this.dashT = 0; this.atkT = 0; this.focusT = 0; this.vx = 0; this.vy = 1250;
    Sound.play('cast'); G.burst(this.cx, this.cy, 12, { color: '#dff3ff', speed: 160, life: 0.4, size: 3 });
  }
  // falling dive; breaks cracked floors and hits what is around on landing
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
    Sound.play('slam'); G.shake(10, 0.35); G.ring(this.cx, this.y + this.h - 6, '#dff3ff', 0.35); G.fx.push({ type: 'dive', x: this.cx, y: this.y + this.h, t: 0, life: 0.5 });
    G.burst(this.cx, this.y + this.h, 24, { color: '#dff3ff', speed: 300, life: 0.5, size: 3, vy: -120 });
    const blast = { x: this.cx - 120, y: this.y + this.h - 80, w: 240, h: 90 };
    for (const e of G.enemies) if (!e.dead && !e.ghostly && overlap(blast, e.hb())) e.hurt(this.spellDmg(18), e.cx > this.cx ? 1 : -1, 'spell');
    for (const d of [-1, 1]) G.projs.push(new Proj({ kind: 'shock', x: this.cx + d * 30, y: this.y + this.h, vx: d * 480, dmg: this.spellDmg(8), friendly: true, pierce: true, life: 0.45, color: '#dff3ff', passWalls: true }));
  }

  // take damage from a source at srcX; false while invulnerable
  hurt(dmg, srcX) {
    if (this.invuln > 0 || this.dead || this.diving || G.state !== 'play') return false;
    if (Charms.absorb()) {                    // Shell Ward turns the blow aside, once
      this.invuln = 0.9; this.vx = (this.cx < srcX ? -1 : 1) * 160; this.recoil = 0.1;
      Sound.play('clank'); G.hitstop(0.08); G.shake(4, 0.15); G.ring(this.cx, this.cy, '#d8c8a0', 0.4);
      G.burst(this.cx, this.cy, 14, { color: '#e8dcb8', speed: 220, life: 0.4, size: 3 });
      return true;
    }
    // one wound is always one mask
    this.hp -= 1; this.invuln = Diff.grace * Gear.hurtK(); this.hurtT = 0.28; this.rendT = 0; this.rendHold = false; this.rushT = 0; this.novaT = 0; this.focusT = 0; this.wailT = 0; this.castDone = true; this.dashT = 0; this.atkT = 0; this.sd = null;
    const dir = this.cx < srcX ? -1 : 1;
    this.vx = dir * 300 * Gear.takenKbK(); this.vy = -320 * Gear.takenKbK(); this.onGround = false; this.sitting = null;
    Sound.play('hurt'); G.hitstop(0.14); G.shake(9, 0.3); G.flash = 0.35;
    try { if (navigator.vibrate) navigator.vibrate(45); } catch (e) { /* no vibration here */ }
    G.burst(this.cx, this.cy, 16, { color: '#e9f3ff', speed: 240, life: 0.5, size: 3 });
    G.burst(this.cx, this.cy, 10, { color: '#1a2230', speed: 200, life: 0.5, size: 4 });
    if (this.hp <= 0) { this.hp = 0; this.dead = true; G.onPlayerDeath(); return true; }
    if (Charms.has('spirit')) this.gainSoul(18);
    if (Charms.has('thorn')) this.thornBurst();
    if (Gear.frost()) this.frostBurst();
    return true;
  }
  // Thorn Mantle: the wound makes thorns burst out and strike everything close by
  thornBurst() {
    G.ring(this.cx, this.cy, '#b6ef6a', 0.5);
    G.burst(this.cx, this.cy, 18, { color: '#b6ef6a', speed: 300, life: 0.4, size: 3 });
    for (const e of G.enemies) {
      if (e.dead || e.ghostly) continue;
      if (Math.hypot(e.cx - this.cx, e.cy - this.cy) < 120) e.hurt(this.spellDmg(9), e.cx > this.cx ? 1 : -1, 'spell');
    }
  }
  // Frostfur: the cold bursts out of the wound and holds the foes around you still for a moment
  frostBurst() {
    G.ring(this.cx, this.cy, '#dff3ff', 0.5); G.ring(this.cx, this.cy, '#9fd0ff', 0.7);
    G.burst(this.cx, this.cy, 22, { color: '#dff3ff', speed: 280, life: 0.5, size: 3 });
    for (const e of G.enemies) {
      if (e.dead || e.ghostly || e.isBoss) continue;
      if (Math.hypot(e.cx - this.cx, e.cy - this.cy) < 170) { e.stun = Math.max(e.stun, 1.1); e.frozenT = 1.1; }
    }
  }
  // fell on spikes: one mask and back to the last safe ground
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
        Sound.play('sdlaunch'); G.shake(6, 0.2); Coach.did('comet');
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
      this.gainSoul(6);
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
  // sit on a bench: rest, heal and save
  sit(bench) {
    this.sitting = bench; this.vx = 0; this.vy = 0; this.x = bench.px - this.w / 2; this.y = bench.py - this.h;
    this.hp = this.maxHp; this.soul = this.maxSoul;
    Charms.rest();
  }
}

// ============================== PROJECTILES ==============================
class Proj {
  // o: values that override the defaults
  constructor(o) {
    Object.assign(this, { vx: 0, vy: 0, r: 8, dmg: 1, grav: 0, life: 3, friendly: false, pierce: false, kind: 'orb', color: '#ff9bd6', passWalls: false, t: 0, hitSet: new Set() }, o);
    if (this.kind === 'shock') { this.w = this.w || 44; this.h = this.h || 34; }
  }
  // hit box of the projectile (shape depends on its kind)
  rect() {
    if (this.kind === 'shock') return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
    if (this.kind === 'beam') return { x: this.x - this.bw / 2, y: 0, w: this.bw, h: G.level.ph };
    if (this.kind === 'pillar') return { x: this.x - this.bw / 2, y: this.y - this.ph, w: this.bw, h: this.ph };
    if (this.kind === 'moon') return { x: this.x - 30, y: this.y - this.r * 1.25, w: 60, h: this.r * 2.5 };
    if (this.kind === 'cloud') { const k = clamp(this.t / 0.25, 0.3, 1); return { x: this.x - this.w * k / 2, y: this.y - this.h * k / 2, w: this.w * k, h: this.h * k }; }
    return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 };
  }
  // move, expire, and hit the player or the enemies
  update(dt) {
    const L = G.level;
    this.t += dt; this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.kind === 'beam' || this.kind === 'pillar') {
      // telegraph, then a short damaging window
      this.active = this.t >= this.tele && this.t < this.tele + this.dur;
      if (this.t >= this.tele + this.dur) this.dead = true;
      if (this.t >= this.tele && !this.fired) { this.fired = true; Sound.play('slam'); G.shake(4, 0.15); }
      if (this.active && !G.player.dead && overlap(G.player.hurtbox(), this.rect()) && G.player.hurt(this.dmg, this.x)) Mind.wounded(this.owner);
      return;
    }
    if (this.kind === 'ray') {                // a thin warning line, then a short window of light that wounds whatever it crosses
      this.active = this.t >= this.tele && this.t < this.tele + this.dur;
      if (this.t >= this.tele + this.dur) this.dead = true;
      if (this.t >= this.tele && !this.fired) { this.fired = true; Sound.play('rend'); G.shake(3, 0.12); }
      if (this.active && !G.player.dead) {
        const hb = G.player.hurtbox(), px = hb.x + hb.w / 2, py = hb.y + hb.h / 2, x1 = this.x + Math.cos(this.a) * this.len, y1 = this.y + Math.sin(this.a) * this.len;
        const dx = x1 - this.x, dy = y1 - this.y, l2 = dx * dx + dy * dy || 1, u = clamp(((px - this.x) * dx + (py - this.y) * dy) / l2, 0, 1);
        if (Math.hypot(px - (this.x + dx * u), py - (this.y + dy * u)) < this.rw / 2 + Math.min(hb.w, hb.h) / 2 && G.player.hurt(this.dmg, this.x)) Mind.wounded(this.owner);
      }
      return;
    }
    if (this.kind === 'blast') {              // an expanding ring of fire that wounds once
      this.r = this.r0 * (0.45 + 0.8 * clamp(this.t / 0.18, 0, 1));
      const pl = G.player;
      if (!this.hurtDone && !pl.dead && this.t < 0.3 && overlap(pl.hurtbox(), this.rect())) { this.hurtDone = true; if (pl.hurt(this.dmg, this.x)) Mind.wounded(this.owner); }
      return;
    }
    if (this.kind === 'bomb') {               // lobbed: bursts on touching the ground or a wall, on the hero, or when the fuse ends
      this.vy += this.grav * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      const pl = G.player;
      if (L.solidAtPx(this.x, this.y + this.r) || L.solidAtPx(this.x + sign(this.vx) * this.r, this.y) || this.t > this.fuse || (!pl.dead && overlap(pl.hurtbox(), this.rect()))) {
        this.dead = true; Sound.play('slam'); G.shake(4, 0.15);
        G.projs.push(new Proj({ kind: 'blast', x: this.x, y: this.y, r: 20, r0: this.blastR || 66, dmg: 1, life: 0.45, pierce: true, passWalls: true, color: this.color, owner: this.owner }));
        G.burst(this.x, this.y, 16, { color: this.color, speed: 260, life: 0.5, size: 4 });
      }
      return;
    }
    this.vy += this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.kind === 'cloud') {
      if (this.life < 0.3) return;      // fading puff no longer hurts
      if (!G.player.dead && overlap(G.player.hurtbox(), this.rect()) && G.player.hurt(this.dmg, this.x)) Mind.wounded(this.owner);
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
      if (G.player.hurt(this.dmg, this.x)) { Mind.wounded(this.owner); if (!this.pierce) this.dead = true; }
    }
  }
}

// ============================== PICKUPS ==============================
class Geo {
  constructor(x, y, v) {
    this.x = x; this.y = y; this.v = v; this.w = v >= 25 ? 14 : v >= 5 ? 11 : 8; this.h = this.w;
    this.vx = rand(-140, 140); this.vy = rand(-420, -220); this.age = 0; this.onGround = false; this.noOneway = false;
  }
  // fall, bounce, get picked up
  update(dt) {
    this.age += dt;
    this.vy = Math.min(this.vy + GRAV * 0.8 * dt, 700);
    if (this.onGround) this.vx *= 0.9;
    if (Charms.has('magnet') && this.age > 0.4 && !G.player.dead) {      // Geo Magnet draws it in
      const mx = G.player.cx - (this.x + this.w / 2), my = G.player.cy - (this.y + this.h / 2), md = Math.hypot(mx, my);
      if (md < 190 && md > 1) { this.vx = mx / md * 520; this.vy = my / md * 520; }
    }
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

// an item lying in the world: ability, mask seed, charm or cache
class Item {
  // kind: ability | seed | cache | charm; def.guard = { type, n } puts guards on the thing
  constructor(def) {
    this.def = def; this.x = def.x * TILE + TILE / 2; this.y = def.y * TILE + TILE / 2; this.t = 0; this.id = def.id; this.kind = def.kind;
    this.guards = null; this.locked = false;
  }
  // pick up when the player touches it
  update(dt) {
    this.t += dt;
    const p = G.player;
    if (p.dead || G.state !== 'play') return;
    if (this.def.guard) {
      // a guarded charm: the guards wake when the hero stands near it, and it can be taken once they are gone
      if (!this.guards && p.onGround && Math.hypot(p.cx - this.x, p.cy - this.y) < 200) this.wakeGuards();
      this.locked = !!this.guards && this.guards.some(e => !e.dead);
      if (this.locked) return;
    }
    if (Math.abs(p.cx - this.x) < 30 && Math.abs(p.cy - this.y) < 40) { this.dead = true; G.collectItem(this); }
  }
  // put the guards on the floor the hero stands on, a few tiles to each side, so they can always be reached
  wakeGuards() {
    const L = G.level, p = G.player, g = this.def.guard, want = g.n || 1, spots = [];
    const col = Math.floor(p.cx / TILE), row = Math.floor((p.y + p.h - 1) / TILE);
    const floor = c => L.solid(c, row + 1) && !L.solid(c, row) && !L.solid(c, row - 1) && !L.solid(c, row - 2);
    for (const s of [1, -1]) {
      let last = null;
      for (let d = 1; d <= 9 && floor(col + s * d); d++) if (d >= 4) last = col + s * d;
      if (last !== null) spots.push(last);
    }
    this.guards = [];
    const add = (type, c, r) => {
      const en = new ENEMY_TYPES[type]({ x: c, y: r }); en.kind = type;
      en.hp = Math.round(en.hp * Diff.enemyHp(L.def.area)); Mind.prepare(en, L.def.area); G.enemies.push(en); this.guards.push(en);
    };
    for (const c of spots.slice(0, want)) add(g.type || 'warden', c, row);
    // a ledge too small for a walker: two flyers come instead
    if (!this.guards.length) for (const s of [-3, 3]) if (!L.solid(col + s, row - 3)) add('flyer', col + s, row - 3);
    if (this.guards.length) { G.toastMsg(tr('guardWake'), 3); Sound.play('clank'); G.ring(this.x, this.y, '#ff8a8a', 0.6); }
  }
}

// ============================== ENEMIES ==============================
// Enemy brains mirror a PlayMaker FSM: each enemy runs one switch over this.currentState.
const ST = { IDLE: 'idle', PATROL: 'patrol', CHASE: 'chase', ANTICIPATION: 'anticipation', ATTACK: 'attack', RECOIL: 'recoil' };
// base enemy: health, state machine, knockback, hit flash and shared physics
class Enemy {
  // def: placement from the room, w / h: size
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
  // hit box and the box the nail can hit
  hb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  body() { return this.hb(); }
  // change state and restart its timer
  setState(s) { this.currentState = s; this.stateT = 0; }
  // advance the clocks
  tick(dt) { this.t += dt; this.flash -= dt; this.stun -= dt; this.stateT += dt; }
  // take a hit: damage, knockback, flash, souls for the player
  hurt(dmg, dir, how) {
    if (this.dead) return;
    this.lastHow = how;                                       // how the last blow came (Mind counts the kills spells make)
    if (how === 'burn') {                                     // a burn: no flinch, no stop, just the wound
      this.hp -= dmg; this.flash = 0.1; Sound.play('hit');
      G.burst(this.cx, this.cy, 10, { color: pick(['#ff8a3a', '#ffd070']), speed: 150, life: 0.45, size: 3, vy: -60 });
      if (this.hp <= 0) this.kill();
      return;
    }
    this.hp -= dmg; this.flash = 0.12; Sound.play('hit'); G.hitstop(how === 'spell' ? 0.03 : 0.06);
    G.burst(this.cx, this.cy, 8, { color: this.blood || '#ffd59a', speed: 220, life: 0.35, size: 3 });
    G.burst(this.cx, this.cy, 3, { color: '#ffffff', speed: 260, life: 0.15, size: 2 });
    G.slashFx(this.cx, this.cy, dir);
    this.onHurt(dir, how);
    if (this.hp <= 0) this.kill();
  }
  // knockback pushes the enemy away from the strike and puts it in the Recoil state
  // the Dusk Cry holds enemies in its column instead of throwing them out of it
  onHurt(dir, how) { if (this.kb && how === 'wail') { this.vx *= 0.3; this.vy = -30 * this.kb; this.stun = 0.1; } else if (this.kb) { this.vx = dir * 220 * this.kb; this.vy = -140 * this.kb; this.stun = 0.18; this.setState(ST.RECOIL); } }
  // die: drop geo, burst, count the kill
  kill() {
    this.dead = true; Sound.play('enemyDie'); G.shake(4, 0.15); Mind.killed(this, this.lastHow); Quests.killed(this);
    if (Charms.has('grave') && !G.player.dead) { G.player.gainSoul(8); G.burst(this.cx, this.cy, 6, { color: '#bfe8d0', speed: 120, life: 0.5, size: 3, grav: -120 }); }
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
  // gravity and tile collision for walkers
  physics(dt, grav) {
    if (grav !== false) this.vy = Math.min(this.vy + GRAV * dt, MAXFALL);
    moveBody(this, dt, G.level);
  }
}

// beetle that patrols along the ground and turns at edges and walls
class Crawler extends Enemy {
  constructor(d) { super(d, 34, 22); this.hp = 10; this.geo = 2; this.speed = 52; this.blood = '#ffcf8a'; }
  // walk back and forth, turn at edges and walls, bite
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

// pale larva that hovers around its home and dives at the player
class Flyer extends Enemy {
  constructor(d) { super(d, 30, 26); this.hp = 10; this.geo = 3; this.kb = 1.2; this.blood = '#e8f6ff'; this.ph = rand(0, 6); this.glowR = 110; }
  // accelerate toward a point
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

// waits, crouches, then leaps at the player
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

// flower that turns to the player and lobs acid globs
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
  // throw a glob at the player's predicted position
  fire() {
    const p = G.player, g = 900, T = clamp(Math.abs(p.cx - this.cx) / 360 + 0.45, 0.5, 1.1);
    const sx = this.cx, sy = this.y + 6;
    const vx = (p.cx - sx) / T, vy = (p.cy - sy - 0.5 * g * T * T) / T;
    Sound.play('shoot');
    G.projs.push(new Proj({ x: sx, y: sy, vx, vy, grav: g, r: 8, dmg: 1, kind: 'glob', color: '#b6ef6a', life: 3 }));
  }
}

// crystal turret: charges, then fires a spread of shards
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

// armoured guard with the full state machine
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
  onHurt(dir, how) {
    if (this.currentState === ST.ANTICIPATION || this.currentState === ST.ATTACK) { this.vx += dir * 60; return; }   // armour holds mid-swing
    super.onHurt(dir, how);
  }
  // state machine: idle, patrol, chase, anticipation, attack, recoil
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

// the shade that keeps your geo after a death
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

// mosquito: hovers, locks on, then spears in a straight line
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

// hangs on a thread, drops on the player, then chases along the floor
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

// slow walker that breathes out a cloud of spores
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

// drifting jellyfish that bursts into sparks when popped
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

// Shield Warden: a slow guard with a tall shield. A strike from the side it faces is blocked; its
// back, the air above it and spells are open. It turns toward the player only every 0.8 s, so
// slipping past gives a moment to strike its back.  Idle -> Patrol -> Chase -> Anticipation -> Attack (shield bash) -> Recoil
class Warden extends Enemy {
  constructor(d) { super(d, 38, 56); this.hp = 28; this.geo = 9; this.kb = 0.3; this.blood = '#c9b88a'; this.turnCD = 0; this.blocked = 0; }
  hurt(dmg, dir, how) {
    if (this.dead) return;
    if (how === 'side' && dir === -this.face) {            // the strike travels against the way it faces: shield
      this.blocked = 0.18; this.flash = 0;
      Sound.play('clank'); G.hitstop(0.04);
      G.burst(this.cx + this.face * 24, this.cy - 6, 8, { color: '#fff3c4', speed: 220, life: 0.25, size: 2 });
      if (this.currentState !== ST.ATTACK) this.vx += -dir * 40;
      return false;
    }
    return super.hurt(dmg, dir, how);
  }
  update(dt) {
    this.tick(dt); this.turnCD -= dt; this.blocked -= dt;
    const p = G.player, sees = this.seesPlayer(300) && Math.abs(p.cy - this.cy) < 110;
    if (sees) this.lastSeen = this.t;
    switch (this.currentState) {
      case ST.IDLE:
        this.vx = 0;
        if (sees) this.setState(ST.CHASE);
        else if (this.stateT > 1) this.setState(ST.PATROL);
        break;
      case ST.PATROL:
        this.vx = this.face * 34;
        if (this.edgeAhead(this.face)) { this.face = -this.face; this.setState(ST.IDLE); }
        if (sees) this.setState(ST.CHASE);
        break;
      case ST.CHASE:
        if (this.turnCD <= 0) { this.face = p.cx > this.cx ? 1 : -1; this.turnCD = 0.8; }
        this.vx = this.edgeAhead(this.face) ? 0 : this.face * 58;
        if (Math.abs(p.cx - this.cx) < 78 && Math.abs(p.cy - this.cy) < 70 && (p.cx - this.cx) * this.face > 0) { this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (this.t - this.lastSeen > 1.5) this.setState(ST.PATROL);
        break;
      case ST.ANTICIPATION:           // the shield is drawn back
        this.vx = 0;
        if (this.stateT >= 0.55) this.setState(ST.ATTACK);
        break;
      case ST.ATTACK:                 // shield bash
        this.vx = this.edgeAhead(this.face) ? 0 : this.face * 300;
        if (this.stateT >= 0.3) { this.vx = 0; this.setState(ST.RECOIL); }
        break;
      case ST.RECOIL:
        this.vx *= 0.85;
        if (this.stateT > 0.35) this.setState(ST.CHASE);
        break;
    }
    this.physics(dt);
  }
}

// Ram: paws the ground, charges in a straight line, and is left dazed when it runs into a wall.
// Patrol -> Anticipation (pawing) -> Attack (charge) -> Recoil (dazed after a crash)
class Ram extends Enemy {
  constructor(d) { super(d, 52, 34); this.hp = 26; this.geo = 7; this.kb = 0.25; this.blood = '#d4b79a'; this.crashed = false; }
  onHurt(dir, how) { if (this.currentState === ST.ATTACK) return; super.onHurt(dir, how); }     // nothing stops a charge
  update(dt) {
    this.tick(dt);
    const p = G.player, sees = this.seesPlayer(430) && Math.abs(p.cy - this.cy) < 90;
    switch (this.currentState) {
      case ST.IDLE:
        this.vx = 0;
        if (sees && this.stateT > 0.4) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (this.stateT > 1.2) this.setState(ST.PATROL);
        break;
      case ST.PATROL:
        this.vx = this.face * 36;
        if (this.edgeAhead(this.face)) { this.face = -this.face; this.setState(ST.IDLE); }
        if (sees) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        break;
      case ST.ANTICIPATION:           // paws the ground: dust, a readable warning
        this.vx = 0;
        if (Math.random() < 0.5) G.burst(this.cx + this.face * 26, this.y + this.h, 1, { color: '#8d9aa8', speed: 60, life: 0.4, size: 3, vy: -40 });
        if (this.stateT >= 0.75) this.setState(ST.ATTACK);
        break;
      case ST.ATTACK: {
        const wall = this.face > 0 ? this.hitR : this.hitL;
        this.vx = this.face * 430;
        if (Math.random() < 0.6) G.burst(this.cx - this.face * 26, this.y + this.h, 1, { color: '#8d9aa8', speed: 50, life: 0.35, size: 3, vy: -30 });
        if (wall) { this.crashed = true; this.vx = -this.face * 90; this.vy = -180; G.shake(6, 0.2); Sound.play('slam'); G.burst(this.cx + this.face * 26, this.cy, 12, { color: '#cfd8e0', speed: 200, life: 0.4, size: 3 }); this.setState(ST.RECOIL); }
        else if (this.edgeAhead(this.face) || this.stateT > 1.6) { this.vx = 0; this.setState(ST.RECOIL); }
        break;
      }
      case ST.RECOIL:
        this.vx *= 0.85;
        if (this.stateT > (this.crashed ? 1.1 : 0.35)) { this.crashed = false; this.setState(ST.IDLE); }
        break;
    }
    this.physics(dt);
  }
}

// ============================== CREATURES OF RIMECREST AND CINDERDEEP ==============================
// Burrower: lies buried under the floor, tracks the hero by the dust it raises, erupts, then digs back in.
class Burrower extends Enemy {
  constructor(d) {
    super(d, 36, 30); this.hp = 16; this.geo = 5; this.kb = 0.5; this.type = d.type; this.blood = d.type === 'lavaworm' ? '#ff9a50' : '#d8e6f0';
    this.buried = true; this.ghostly = true; this.dust = d.type === 'lavaworm' ? '#ff9a50' : '#cfe0ee';
  }
  body() { return this.buried ? { x: this.cx - 1, y: this.y + this.h - 2, w: 2, h: 2 } : this.hb(); }
  update(dt) {
    this.tick(dt);
    const p = G.player, dx = p.cx - this.cx, near = Math.abs(dx) < 240 && Math.abs(p.cy - this.cy) < 110 && !p.dead;
    switch (this.currentState) {
      case ST.IDLE:
        this.buried = true; this.ghostly = true; this.vx = 0;
        if (near && this.stateT > 0.6) this.setState(ST.CHASE);
        break;
      case ST.CHASE:                // shuffles under the floor toward the hero
        this.face = dx > 0 ? 1 : -1;
        this.vx = this.edgeAhead(this.face) ? 0 : this.face * 120;
        if (Math.random() < 0.5) G.burst(this.cx, this.y + this.h, 1, { color: this.dust, speed: 40, life: 0.4, size: 3, vy: -30 });
        if (Math.abs(dx) < 64) this.setState(ST.ANTICIPATION);
        else if (!near && this.stateT > 1.2) this.setState(ST.IDLE);
        break;
      case ST.ANTICIPATION:         // the ground trembles
        this.vx = 0;
        if (Math.random() < 0.8) G.burst(this.cx + rand(-14, 14), this.y + this.h, 1, { color: this.dust, speed: 70, life: 0.35, size: 3, vy: -60 });
        if (this.stateT >= 0.55) {
          this.buried = false; this.ghostly = false; this.vy = -560; this.vx = this.face * 90; this.onGround = false;
          Sound.play('break'); G.shake(3, 0.12); G.burst(this.cx, this.y + this.h, 14, { color: this.dust, speed: 220, life: 0.5, size: 4, vy: -80 });
          this.setState(ST.ATTACK);
        }
        break;
      case ST.ATTACK:               // out of the ground: wounds on touch until it lands
        if (this.onGround && this.stateT > 0.15) { this.vx = 0; this.setState('emerged'); }
        break;
      case 'emerged':               // out in the open and slow: the time to strike
        this.face = dx > 0 ? 1 : -1; this.vx = this.edgeAhead(this.face) ? 0 : this.face * 56;
        if (this.stateT > 1.4) this.setState('digging');
        break;
      case 'digging':
        this.vx = 0;
        if (Math.random() < 0.6) G.burst(this.cx, this.y + this.h, 1, { color: this.dust, speed: 60, life: 0.4, size: 3, vy: -50 });
        if (this.stateT > 0.45) { this.buried = true; this.ghostly = true; this.setState(ST.IDLE); }
        break;
      case ST.RECOIL:
        this.vx *= 0.85;
        if (this.stateT > 0.22) this.setState('emerged');
        break;
    }
    this.physics(dt);
    if (this.hitL || this.hitR) this.vx = 0;
  }
}

// Bomber: an imp that keeps its distance and lobs bombs that burst in a ring of fire.
class Bomber extends Enemy {
  constructor(d) { super(d, 28, 34); this.hp = 14; this.geo = 5; this.kb = 0.9; this.blood = '#ff9a50'; this.cool = rand(0.8, 1.8); this.glowR = 80; }
  update(dt) {
    this.tick(dt); this.cool -= dt;
    const p = G.player, dx = p.cx - this.cx, ad = Math.abs(dx), sees = this.seesPlayer(440) && Math.abs(p.cy - this.cy) < 220;
    if (sees) this.lastSeen = this.t;
    switch (this.currentState) {
      case ST.IDLE:
        this.vx = 0;
        if (sees) this.setState(ST.CHASE);
        break;
      case ST.CHASE: {              // holds the hero at bomb range
        this.face = dx > 0 ? 1 : -1;
        const want = ad < 170 ? -this.face : ad > 330 ? this.face : 0;
        this.vx = want && !this.edgeAhead(want) ? want * 95 : 0;
        if (this.cool <= 0 && sees && ad < 400) { this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (this.t - this.lastSeen > 2.5) this.setState(ST.IDLE);
        break;
      }
      case ST.ANTICIPATION:         // the arm goes up with a lit bomb
        this.vx = 0; this.face = dx > 0 ? 1 : -1;
        if (this.stateT >= 0.5) {
          const x = this.cx + this.face * 10, y = this.y + 6, T = clamp(ad / 320, 0.45, 1.1), g = 1100;
          G.projs.push(new Proj({ kind: 'bomb', x, y, r: 9, vx: clamp(dx / T, -380, 380), vy: (p.cy - y - 0.5 * g * T * T) / T, grav: g, fuse: 1.7, life: 4, dmg: 1, color: '#ff9a50' }));
          Sound.play('shoot'); this.cool = rand(1.6, 2.6); this.setState('throw');
        }
        break;
      case 'throw':
        this.vx = 0;
        if (this.stateT > 0.4) this.setState(ST.CHASE);
        break;
      case ST.RECOIL:
        this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState(ST.CHASE);
        break;
    }
    this.physics(dt);
    if (this.hitL || this.hitR) this.vx = 0;
  }
}

// Blinker: a half-faded wraith. It fades out, appears beside the hero, slashes, and can be struck only while solid.
class Blinker extends Enemy {
  constructor(d) { super(d, 30, 50); this.hp = 18; this.geo = 6; this.kb = 0.6; this.blood = '#bfe6ff'; this.alpha = 0.5; this.ghostly = true; this.glowR = 90; this.ph = rand(0, 6); this.melee = null; this.y -= 14; this.home = { x: this.cx, y: this.cy }; }
  // find a free spot next to the player
  placeBeside() {
    const L = G.level, p = G.player;
    for (const side of [-p.face, p.face]) for (const dy of [-10, -24, 0]) {          // beside the hero, a little above the floor
      const x = p.cx + side * 86, y = p.cy + dy;
      let free = true; for (let k = -1; k <= 1; k++) if (L.solidAtPx(x, y + k * 24) || L.solidAtPx(x + side * 16, y + k * 24)) free = false;
      if (free) { this.x = x - this.w / 2; this.y = y - this.h / 2; this.face = -side; this.vx = this.vy = 0; return true; }
    }
    return false;
  }
  update(dt) {
    this.tick(dt);
    const p = G.player, sees = this.seesPlayer(400);
    this.melee = null;
    switch (this.currentState) {
      case ST.IDLE: {               // drifting, faint, harmless
        this.alpha = approach(this.alpha, 0.5 + 0.08 * Math.sin(this.t * 3), 2 * dt); this.ghostly = true;
        const tx = this.home.x + Math.sin(this.t * 0.7 + this.ph) * 50, ty = this.home.y + Math.sin(this.t * 1.3 + this.ph) * 16;
        this.vx = approach(this.vx, clamp(tx - this.cx, -1, 1) * 50, 200 * dt); this.vy = approach(this.vy, clamp(ty - this.cy, -1, 1) * 30, 200 * dt);
        if (sees && this.stateT > 1.1 && !p.dead) this.setState('fadeout');
        break;
      }
      case 'fadeout':
        this.vx = this.vy = 0; this.alpha = Math.max(0, 0.5 - this.stateT / 0.3 * 0.5); this.ghostly = true;
        if (this.stateT >= 0.3) { if (this.placeBeside()) this.setState('appear'); else this.setState(ST.IDLE); }
        break;
      case 'appear':                // eyes first, then the body: a readable warning
        this.vx = this.vy = 0; this.alpha = clamp(this.stateT / 0.5, 0, 1); this.ghostly = this.alpha < 0.6;
        this.face = p.cx > this.cx ? 1 : -1;
        if (this.stateT >= 0.5) { this.setState(ST.ATTACK); Sound.play('slash'); }
        break;
      case ST.ATTACK:               // the slash
        this.alpha = 1; this.ghostly = false;
        this.melee = { x: this.face > 0 ? this.cx : this.cx - 80, y: this.y + 2, w: 80, h: 52 };
        if (!p.dead && overlap(p.hurtbox(), this.melee)) p.hurt(1, this.cx);
        if (this.stateT >= 0.22) this.setState('vulnerable');
        break;
      case 'vulnerable':            // solid for a moment: the time to strike back
        this.alpha = 1; this.ghostly = false; this.vx = this.vy = 0;
        if (this.stateT >= 0.9) this.setState('fadeback');
        break;
      case 'fadeback':
        this.alpha = Math.max(0.5, 1 - this.stateT / 0.4 * 0.5); this.ghostly = this.alpha < 0.6;
        if (this.stateT >= 0.4) { this.home = { x: this.cx, y: this.cy }; this.setState(ST.IDLE); }
        break;
      case ST.RECOIL:
        this.vx *= 0.9; this.vy *= 0.9;
        if (this.stateT > 0.2) this.setState('vulnerable');
        break;
    }
    this.physics(dt, false);
    if (this.hitL || this.hitR) this.vx = 0; if (this.hitU || this.onGround) this.vy = 0;
  }
}

// Roller: patrols, then curls into a ball and rolls from wall to wall. Armoured while rolling (jump on it); dazed afterwards.
class Roller extends Enemy {
  constructor(d) { super(d, 40, 30); this.hp = 24; this.geo = 8; this.kb = 0.3; this.blood = '#e0c89a'; this.rolls = 0; }
  hurt(dmg, dir, how) {
    if (this.dead) return;
    if (this.currentState === ST.ATTACK && (how === 'side' || how === 'up')) {            // the curled shell turns blades aside
      Sound.play('clank'); G.hitstop(0.04); G.burst(this.cx, this.cy - 6, 8, { color: '#fff3c4', speed: 220, life: 0.25, size: 2 });
      return false;
    }
    return super.hurt(dmg, dir, how);
  }
  onHurt(dir, how) { if (this.currentState === ST.ATTACK) return; super.onHurt(dir, how); }
  update(dt) {
    this.tick(dt);
    const p = G.player, sees = this.seesPlayer(440) && Math.abs(p.cy - this.cy) < 90;
    switch (this.currentState) {
      case ST.IDLE:
        this.vx = 0;
        if (sees && this.stateT > 0.4) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (this.stateT > 1) this.setState(ST.PATROL);
        break;
      case ST.PATROL:
        this.vx = this.face * 38;
        if (this.edgeAhead(this.face)) { this.face = -this.face; this.setState(ST.IDLE); }
        if (sees) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        break;
      case ST.ANTICIPATION:         // curls up and shivers
        this.vx = 0;
        if (this.stateT >= 0.55) { this.rolls = 0; this.setState(ST.ATTACK); }
        break;
      case ST.ATTACK: {
        this.vx = this.face * 400;
        const wall = this.face > 0 ? this.hitR : this.hitL;
        if (wall || this.edgeAhead(this.face)) { this.face = -this.face; this.rolls++; this.vx = this.face * 400; G.shake(3, 0.1); Sound.play('clunk'); }
        if (this.rolls >= 3 || this.stateT > 3.2) { this.vx = 0; this.setState('dizzy'); }
        break;
      }
      case 'dizzy':
        this.vx = 0;
        if (this.stateT > 1.2) this.setState(ST.IDLE);
        break;
      case ST.RECOIL:
        this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState(ST.IDLE);
        break;
    }
    this.physics(dt);
  }
}

// Slime: hops toward the hero and splits into two small slimes when it dies.
class Slime extends Enemy {
  constructor(d) {
    super(d, d.small ? 22 : 40, d.small ? 18 : 32); this.small = !!d.small;
    this.hp = this.small ? 6 : 20; this.geo = this.small ? 1 : 6; this.kb = this.small ? 1.2 : 0.6; this.blood = '#9fd8ff'; this.wait = rand(0.5, 1.4); this.born = 0.3;
    if (this.small) this.ghostly = true;                // a newborn cannot be struck for a moment, so the blow that split its parent is not spent on it
  }
  kill() {
    super.kill();
    if (this.small) return;
    for (const dir of [-1, 1]) {
      const s = new Slime({ x: 0, y: 0, small: true }); s.kind = 'slimelet';
      s.x = this.cx - s.w / 2; s.y = this.y + this.h - s.h; s.vx = dir * 170; s.vy = -300; s.face = dir;
      G.enemies.push(s);
    }
  }
  update(dt) {
    this.tick(dt);
    if (this.small && this.born > 0) { this.born -= dt; if (this.born <= 0) this.ghostly = false; }
    const p = G.player;
    switch (this.currentState) {
      case ST.IDLE:
        if (this.onGround) this.vx *= 0.8;
        if (this.onGround && this.stateT > this.wait && this.seesPlayer(360)) { this.face = p.cx > this.cx ? 1 : -1; this.setState(ST.ANTICIPATION); }
        break;
      case ST.ANTICIPATION:         // squashes down
        this.vx = 0;
        if (this.stateT > (this.small ? 0.18 : 0.32)) { this.vy = this.small ? -430 : -470; this.vx = this.face * (this.small ? 190 : 150); this.onGround = false; this.setState(ST.ATTACK); }
        break;
      case ST.ATTACK:
        if (this.onGround && this.stateT > 0.1) { this.wait = rand(0.5, 1.2); this.setState(ST.IDLE); }
        break;
      case ST.RECOIL:
        if (this.onGround) this.vx *= 0.85;
        if (this.stateT > 0.2) this.setState(ST.IDLE);
        break;
    }
    this.physics(dt);
    if (this.hitL || this.hitR) this.vx = -this.vx * 0.4;
  }
}

// Chainman: swings a spiked ball on a chain in a wide circle. The ball wounds; the man can be struck while it retracts.
class Chainman extends Enemy {
  constructor(d) { super(d, 38, 56); this.hp = 30; this.geo = 12; this.kb = 0.2; this.blood = '#d8c8a0'; this.ang = 0; this.reach = 36; this.ball = null; this.wp = null; }
  update(dt) {
    this.tick(dt);
    const p = G.player, sees = this.seesPlayer(300) && Math.abs(p.cy - this.cy) < 120;
    if (sees) this.lastSeen = this.t;
    let spin = 1.5, reach = 36;
    switch (this.currentState) {
      case ST.IDLE:
        this.vx = 0;
        if (sees) this.setState(ST.CHASE);
        else if (this.stateT > 1) this.setState(ST.PATROL);
        break;
      case ST.PATROL:
        this.vx = this.face * 30;
        if (this.edgeAhead(this.face)) { this.face = -this.face; this.setState(ST.IDLE); }
        if (sees) this.setState(ST.CHASE);
        break;
      case ST.CHASE:
        this.face = p.cx > this.cx ? 1 : -1; this.vx = this.edgeAhead(this.face) ? 0 : this.face * 52;
        if (Math.abs(p.cx - this.cx) < 150) { this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (this.t - this.lastSeen > 1.6) this.setState(ST.PATROL);
        break;
      case ST.ANTICIPATION:         // the ball starts to spin
        this.vx = 0; spin = 3 + this.stateT * 6; reach = 36 + this.stateT / 0.7 * 60;
        if (this.stateT >= 0.7) this.setState(ST.ATTACK);
        break;
      case ST.ATTACK:               // full swing, creeping toward the hero
        spin = 7.5; reach = 112; this.face = p.cx > this.cx ? 1 : -1; this.vx = this.edgeAhead(this.face) ? 0 : this.face * 46;
        if (this.stateT >= 1.7) this.setState(ST.RECOIL);
        break;
      case ST.RECOIL:               // the chain winds back in: struck freely now
        this.vx *= 0.8; spin = 2.5; reach = Math.max(36, 112 - this.stateT * 130);
        if (this.stateT > 0.85) this.setState(ST.CHASE);
        break;
    }
    this.ang += spin * dt; this.reach = approach(this.reach, reach, 220 * dt);
    this.ball = { x: this.cx + Math.cos(this.ang) * this.reach, y: this.cy - 6 + Math.sin(this.ang) * this.reach * 0.75, r: 13 };
    if (this.reach > 60 && !p.dead && overlap(p.hurtbox(), { x: this.ball.x - 13, y: this.ball.y - 13, w: 26, h: 26 })) p.hurt(1, this.ball.x);
    this.physics(dt);
    if (this.hitL || this.hitR) { this.vx = 0; if (this.currentState === ST.PATROL) this.face = -this.face; }
  }
}

// Moth: drawn to the hero's light; it circles, then dives. It carries a little light of its own.
class Moth extends Enemy {
  constructor(d) { super(d, 26, 22); this.hp = 12; this.geo = 4; this.kb = 1.4; this.blood = '#ffe7a0'; this.glowR = 130; this.ph = rand(0, 6); this.orbit = rand(0, 6); this.diveCD = rand(1.4, 2.4); }
  steer(tx, ty, sp, acc, dt) {
    const dx = tx - this.cx, dy = ty - this.cy, d = Math.hypot(dx, dy) || 1;
    this.vx = approach(this.vx, dx / d * sp, acc * dt); this.vy = approach(this.vy, dy / d * sp, acc * dt);
    if (Math.abs(this.vx) > 10) this.face = sign(this.vx);
  }
  update(dt) {
    this.tick(dt); this.diveCD -= dt;
    const p = G.player, sees = this.seesPlayer(340);
    if (sees) this.lastSeen = this.t;
    switch (this.currentState) {
      case ST.IDLE:
        this.steer(this.home.x + Math.sin(this.t * 0.9 + this.ph) * 50, this.home.y + Math.sin(this.t * 2.1 + this.ph) * 18, 55, 220, dt);
        if (sees) this.setState(ST.CHASE);
        break;
      case ST.CHASE:                // flutters around the light
        this.orbit += dt * 1.7;
        this.steer(p.cx + Math.cos(this.orbit) * 120, p.cy - 30 + Math.sin(this.orbit * 1.3) * 50, 140, 420, dt);
        if (this.diveCD <= 0 && sees) { this.setState(ST.ANTICIPATION); Sound.play('tele'); }
        else if (p.dead || this.t - this.lastSeen > 2.2) this.setState(ST.IDLE);
        break;
      case ST.ANTICIPATION:         // wings up, glow brightens
        this.vx *= 0.9; this.vy *= 0.9; this.face = p.cx > this.cx ? 1 : -1;
        if (this.stateT >= 0.4) { const d = Math.hypot(p.cx - this.cx, p.cy - this.cy) || 1; this.vx = (p.cx - this.cx) / d * 380; this.vy = (p.cy - this.cy) / d * 380; this.setState(ST.ATTACK); }
        break;
      case ST.ATTACK:
        if (this.stateT > 0.55 || this.hitL || this.hitR || this.hitU || this.onGround) { this.diveCD = rand(1.6, 2.8); this.setState(ST.CHASE); }
        break;
      case ST.RECOIL:
        this.vx *= 0.94; this.vy *= 0.94;
        if (this.stateT > 0.2) this.setState(ST.CHASE);
        break;
    }
    this.glowR = this.currentState === ST.ANTICIPATION ? 130 + this.stateT * 160 : 130;
    this.physics(dt, false);
    if (this.hitL || this.hitR) this.vx = 0; if (this.hitU || this.onGround) this.vy = 0;
  }
}

// Icicle: hangs from the ceiling, shakes when the hero passes under it, falls, shatters, and grows back.
class Icicle extends Enemy {
  constructor(d) { super(d, 18, 44); this.y = d.y * TILE; this.hp = 5; this.geo = 0; this.kb = 0; this.type = d.type; this.blood = '#dff4ff'; this.ox = this.x; this.oy = this.y; this.gone = false; }
  // break into pieces
  shatter() {
    G.burst(this.cx, this.cy, 14, { color: this.blood, speed: 240, life: 0.5, size: 3 }); Sound.play('break');
    this.gone = true; this.ghostly = true; this.vx = this.vy = 0; this.setState('gone');
  }
  kill() { this.shatter(); }                    // struck: it breaks (and grows back)
  update(dt) {
    this.tick(dt);
    const p = G.player, under = Math.abs(p.cx - this.cx) < 38 && p.cy > this.cy && p.cy < this.y + 460 && !p.dead && G.level.lineOfSight(this.cx, this.y + this.h, this.cx, p.cy);
    switch (this.currentState) {
      case ST.IDLE:
        this.x = this.ox; this.y = this.oy; this.vx = this.vy = 0; this.ghostly = false; this.gone = false; this.dmg = 0;
        if (under) { this.setState(ST.ANTICIPATION); Sound.play('creak'); }
        return;
      case ST.ANTICIPATION:         // a tremor, then it lets go
        this.x = this.ox + Math.sin(this.stateT * 70) * 1.6;
        if (this.stateT >= 0.55) { this.dmg = 1; this.setState(ST.ATTACK); }
        return;
      case ST.ATTACK:
        this.vy = Math.min(this.vy + 2000 * dt, 820);
        this.y += this.vy * dt;
        if (G.level.solidAtPx(this.cx, this.y + this.h)) { this.y = Math.floor((this.y + this.h) / TILE) * TILE - this.h; this.shatter(); }
        return;
      case 'gone':                  // grows back after a few seconds, if the hero is not right under it
        this.ghostly = true; this.dmg = 0;
        if (this.stateT > 4 && !under) this.setState(ST.IDLE);
        return;
      case ST.RECOIL: this.setState(ST.IDLE); return;
    }
  }
  body() { return this.gone ? { x: -999, y: -999, w: 1, h: 1 } : this.hb(); }
}

// enemy kind -> class (used when a room is built)
const ENEMY_TYPES = { husk: Husk, crawler: Crawler, flyer: Flyer, hopper: Hopper, spitter: Spitter, shard: Shard, sentinel: Sentinel, diver: Diver, spider: Spider, shroom: Shroom, jelly: Jelly, warden: Warden, ram: Ram, mole: Burrower, lavaworm: Burrower, imp: Bomber, veil: Blinker, roller: Roller, slime: Slime, chainman: Chainman, moth: Moth, icicle: Icicle };
