'use strict';
// Room machinery: crumbling plates, moving platforms that carry the player, saw blades on rails,
// levers that open gates, and stalactites that drop on whoever walks beneath.
// A room lists its pieces in def.mech (see RoomBuilder in world.js); Mech.init builds them on
// entry and the game calls Mech.update before the player moves, so riders are carried first.

const CRUMBLE_DELAY = 0.55;      // seconds a plate shakes under the player before it falls
const CRUMBLE_RETURN = 3.2;      // seconds until it grows back
const DRIP_SHAKE = 0.38;         // stalactite warning time
const DRIP_REGROW = 3.5;

function circleRect(cx, cy, r, b) {
  const nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h);
  return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < r * r;
}
// eases a 0..1 path position so machines slow into their stops
const easeInOut = u => u * u * (3 - 2 * u);

// ------------------------------------------------------------------ crumbling plates
// A horizontal run of T_CRUMBLE tiles that gives way as one piece: idle -> shake -> gone -> idle.
class Crumble {
  constructor(x, y, w) { this.x = x; this.y = y; this.w = w; this.state = 'idle'; this.t = 0; this.fade = 1; this.chunks = []; }
  rect() { return { x: this.x * TILE, y: this.y * TILE, w: this.w * TILE, h: TILE }; }
  // is the player standing on it
  carrying() {
    return P.onGround && !P.riding && Math.abs(P.y + P.h - this.y * TILE) < 1.5 &&
      P.x + P.w > this.x * TILE + 1 && P.x < (this.x + this.w) * TILE - 1;
  }
  update(dt) {
    this.t += dt;
    for (const c of this.chunks) { c.vy += 1800 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; c.life -= dt; }
    this.chunks = this.chunks.filter(c => c.life > 0);
    if (this.state === 'idle') {
      this.fade = Math.min(1, this.fade + dt * 3);
      if (this.carrying()) { this.state = 'shake'; this.t = 0; Sound.play('creak'); }
    } else if (this.state === 'shake') {
      if (Math.random() < 0.35) G.burst(this.x * TILE + Math.random() * this.w * TILE, (this.y + 1) * TILE, 1, { color: '#a0705a', speed: 30, life: 0.5, size: 2, vy: 40 });
      if (this.t >= CRUMBLE_DELAY) this.collapse();
    } else if (this.state === 'gone' && this.t >= CRUMBLE_RETURN) {
      const r = this.rect();
      const blocked = overlap(P, r) || G.enemies.some(e => !e.dead && overlap(e.body(), r));
      if (!blocked) { this.state = 'idle'; this.t = 0; this.fade = 0; for (let i = 0; i < this.w; i++) G.level.set(this.x + i, this.y, T_CRUMBLE); }
    }
  }
  // fall apart into chunks and open the tiles
  collapse() {
    this.state = 'gone'; this.t = 0;
    for (let i = 0; i < this.w; i++) {
      G.level.set(this.x + i, this.y, T_AIR);
      for (let k = 0; k < 2; k++) this.chunks.push({ x: (this.x + i) * TILE + 8 + k * 16, y: this.y * TILE + 8, vx: rand(-60, 60), vy: rand(-80, 40), rot: 0, vr: rand(-6, 6), s: rand(8, 13), life: 1.4 });
    }
    Sound.play('break');
    G.burst((this.x + this.w / 2) * TILE, this.y * TILE + 16, 14, { color: '#8a5a44', speed: 160, life: 0.6, size: 3 });
  }
}

// ------------------------------------------------------------------ moving platforms
// Travels A <-> B and waits at each end. "needs" names a flag (a lever) that powers it.
class Mover {
  constructor(o) {
    this.ax = o.x * TILE; this.ay = o.y * TILE; this.bx = o.to.x * TILE; this.by = o.to.y * TILE;
    this.w = o.w * TILE; this.h = 16; this.speed = o.speed || 110; this.wait = o.wait == null ? 0.8 : o.wait; this.needs = o.needs || null;
    this.len = Math.max(1, Math.hypot(this.bx - this.ax, this.by - this.ay));
    this.s = 0; this.dir = 1; this.waitT = this.wait; this.x = this.ax; this.y = this.ay; this.dx = 0; this.dy = 0; this.t = 0;
  }
  // true when it needs no lever, or the lever has been pulled
  powered() { return !this.needs || !!G.flags[this.needs]; }
  update(dt) {
    const ox = this.x, oy = this.y;
    this.t += dt;
    if (this.powered()) {
      if (this.waitT > 0) this.waitT -= dt;
      else {
        // s advances steadily; the easing below slows the deck into each stop
        this.s += this.dir * this.speed * dt / this.len;
        if (this.s >= 1) { this.s = 1; this.dir = -1; this.waitT = this.wait; Sound.play('clunk'); }
        else if (this.s <= 0) { this.s = 0; this.dir = 1; this.waitT = this.wait; Sound.play('clunk'); }
      }
    }
    const k = easeInOut(this.s);
    this.x = lerp(this.ax, this.bx, k); this.y = lerp(this.ay, this.by, k);
    this.dx = this.x - ox; this.dy = this.y - oy;
  }
}

// ------------------------------------------------------------------ saw blades
// Either rides a rail A <-> B (ping-pong) or orbits a pivot. Touching one is like touching
// spikes; striking down on one bounces you off it, a side strike just clangs.
class Saw {
  constructor(o) {
    this.r = o.r || 22; this.spin = 0; this.spark = 0;
    if (o.orbit) { this.cx = o.x * TILE; this.cy = o.y * TILE; this.R = o.orbit * TILE; this.a = (o.phase || 0) * Math.PI * 2; this.speed = o.speed || 140; }
    else {
      this.ax = o.x * TILE; this.ay = o.y * TILE; this.bx = (o.to ? o.to.x : o.x) * TILE; this.by = (o.to ? o.to.y : o.y) * TILE;
      this.len = Math.max(1, Math.hypot(this.bx - this.ax, this.by - this.ay)); this.speed = o.speed || 120;
      this.u = (o.phase || 0) * 2;           // 0..2 covers there and back
    }
    this.place();
  }
  // put the platform at its place on the path
  place() {
    if (this.R) { this.x = this.cx + Math.cos(this.a) * this.R; this.y = this.cy + Math.sin(this.a) * this.R; return; }
    const k = easeInOut(this.u <= 1 ? this.u : 2 - this.u);
    this.x = lerp(this.ax, this.bx, k); this.y = lerp(this.ay, this.by, k);
  }
  update(dt) {
    this.spin += dt * 16; this.spark -= dt;
    if (this.R) this.a += dt * this.speed / this.R;
    else this.u = (this.u + dt * this.speed / this.len) % 2;
    this.place();
    if (!P.dead && P.invuln <= 0 && G.state === 'play' && circleRect(this.x, this.y, this.r - 4, P.hurtbox())) {
      G.burst(P.cx, P.cy, 10, { color: '#ffd8a0', speed: 260, life: 0.35, size: 2 });
      P.spikeHurt();
    }
  }
}

// ------------------------------------------------------------------ levers
// Strike it once: it flips, saves a flag, and its gates sink row by row.
class Lever {
  constructor(o) {
    this.x = o.x * TILE + 16; this.y = (o.y + 1) * TILE; this.flag = 'lever_' + o.id; this.gates = o.gates || [];
    this.on = !!G.flags[this.flag]; this.flip = this.on ? 1 : 0; this.opening = -1; this.rows = [];
  }
  // box the nail can hit
  hb() { return { x: this.x - 16, y: this.y - 48, w: 32, h: 48 }; }
  // struck by the nail: toggle and open or close the gates
  hit() {
    G.burst(this.x, this.y - 34, 8, { color: '#ffd8a0', speed: 200, life: 0.3, size: 2 });
    if (this.on) { Sound.play('clank'); return; }
    this.on = true; G.flags[this.flag] = true;
    Sound.play('lever'); G.shake(4, 0.25);
    // gates open from the bottom row up
    this.rows = [];
    for (const gt of this.gates) for (let y = gt.y + gt.h - 1; y >= gt.y; y--) this.rows.push({ gt, y });
    this.opening = 0;
    if (this.gates.length) G.toastMsg(tr('gate_opened'), 2.4);
  }
  update(dt) {
    this.flip = approach(this.flip, this.on ? 1 : 0, dt * 7);
    if (this.opening < 0 || !this.rows.length) return;
    this.opening += dt;
    while (this.rows.length && this.opening > 0.35) {
      const { gt, y } = this.rows.shift();
      for (let x = gt.x; x < gt.x + gt.w; x++) {
        G.level.set(x, y, T_AIR);
        G.burst(x * TILE + 16, y * TILE + 16, 5, { color: '#8a7a6a', speed: 140, life: 0.5, size: 3 });
      }
      this.opening = 0.22;
      Sound.play(this.rows.length ? 'clunk' : 'door');
    }
  }
}

// ------------------------------------------------------------------ stalactites
class Drip {
  constructor(o) { this.hx = o.x * TILE + 16; this.hy = o.y * TILE; this.len = o.len || 44; this.reset(); this.grow = 1; }
  reset() { this.state = 'hang'; this.x = this.hx; this.y = this.hy; this.vy = 0; this.t = 0; }
  body() { return { x: this.x - 9, y: this.y, w: 18, h: this.len }; }
  // start falling (with a creak)
  drop() { if (this.state === 'hang' || this.state === 'shake') { this.state = 'fall'; this.vy = 120; Sound.play('creak'); } }
  update(dt) {
    this.t += dt;
    const L = G.level;
    if (this.state === 'grow') { this.grow = Math.min(1, this.t / 0.6); if (this.grow >= 1) this.reset(); return; }
    if (this.state === 'hang') {
      const below = Math.abs(P.cx - this.x) < 56 && P.y > this.y && P.y - this.y < 14 * TILE && !P.dead;
      if (below && L.lineOfSight(this.x, this.y + this.len + 4, P.cx, P.y)) { this.state = 'shake'; this.t = 0; Sound.play('creak'); }
    } else if (this.state === 'shake') {
      if (Math.random() < 0.3) G.burst(this.x + rand(-6, 6), this.y + 2, 1, { color: '#9a8070', speed: 20, life: 0.6, size: 2, vy: 60 });
      if (this.t >= DRIP_SHAKE) this.drop();
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 2600 * dt, 1300); this.y += this.vy * dt;
      const tip = this.y + this.len;
      if (!P.dead && overlap(this.body(), P.hurtbox()) && P.hurt(1, this.x)) return this.shatter();
      for (const e of G.enemies) if (!e.dead && !e.isBoss && overlap(this.body(), e.hb())) { e.hurt(12, e.cx > this.x ? 1 : -1, 'spell'); return this.shatter(); }
      if (L.solidAtPx(this.x, tip) || tip > L.ph) return this.shatter();
    } else if (this.state === 'gone' && this.t >= DRIP_REGROW) { this.state = 'grow'; this.t = 0; this.grow = 0; this.x = this.hx; this.y = this.hy; }
  }
  // break on the floor
  shatter() {
    this.state = 'gone'; this.t = 0;
    Sound.play('break'); G.shake(4, 0.15);
    G.burst(this.x, this.y + this.len - 6, 14, { color: '#9a8576', speed: 220, life: 0.6, size: 3, vy: -80 });
  }
}

// ------------------------------------------------------------------ registry
const Mech = {
  // build the machines of a room when it is entered
  init(def) {
    const L = G.level, m = { crumbles: [], movers: [], saws: [], levers: [], drips: [] };
    G.mech = m;
    for (const o of def.mech || []) {
      if (o.type === 'mover') m.movers.push(new Mover(o));
      else if (o.type === 'saw') m.saws.push(new Saw(o));
      else if (o.type === 'drip') m.drips.push(new Drip(o));
      else if (o.type === 'lever') {
        const lv = new Lever(o); m.levers.push(lv);
        if (lv.on) for (const gt of lv.gates) for (let y = gt.y; y < gt.y + gt.h; y++) for (let x = gt.x; x < gt.x + gt.w; x++) L.set(x, y, T_AIR);
      }
    }
    // each horizontal run of crumble tiles becomes one plate
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (L.get(x, y) !== T_CRUMBLE || (x > 0 && L.get(x - 1, y) === T_CRUMBLE)) continue;
      let w = 1; while (L.get(x + w, y) === T_CRUMBLE) w++;
      m.crumbles.push(new Crumble(x, y, w));
    }
    P.riding = null;
  },
  // runs before the player: platforms move and carry whoever stands on them
  update(dt) {
    const m = G.mech; if (!m) return;
    for (const mv of m.movers) {
      mv.update(dt);
      if (P.riding === mv && !P.dead) {
        Mech.nudgeX(P, mv.dx);
        if (P.x + P.w > mv.x && P.x < mv.x + mv.w) P.y = mv.y - P.h; else P.riding = null;
      }
    }
    for (const c of m.crumbles) c.update(dt);
    for (const s of m.saws) s.update(dt);
    for (const l of m.levers) l.update(dt);
    for (const d of m.drips) d.update(dt);
  },
  // horizontal push with tile collision (used to carry riders)
  nudgeX(b, dx) {
    if (!dx) return;
    const L = G.level, top = Math.floor((b.y + 0.5) / TILE), bot = Math.floor((b.y + b.h - 0.5) / TILE);
    b.x += dx;
    const tx = Math.floor(dx > 0 ? (b.x + b.w) / TILE : b.x / TILE);
    for (let ty = top; ty <= bot; ty++) if (L.solid(tx, ty)) { b.x = dx > 0 ? tx * TILE - b.w - 0.001 : (tx + 1) * TILE + 0.001; break; }
  },
  // after a body has moved: lands it on a platform deck it fell onto this frame
  land(b, prevBottom) {
    b.riding = null;
    const m = G.mech;
    if (!m || b.vy < 0 || b.onGround) return;
    for (const mv of m.movers) {
      if (b.x + b.w <= mv.x + 2 || b.x >= mv.x + mv.w - 2) continue;
      const tol = Math.max(0, -mv.dy) + 2;
      if (prevBottom <= mv.y + tol && b.y + b.h >= mv.y) { b.y = mv.y - b.h; b.vy = 0; b.onGround = true; b.riding = mv; return; }
    }
  },
  // the nail met machinery: returns what the swing should do to the player
  attack(hb, p) {
    const out = { pogo: false, clank: false };
    const m = G.mech; if (!m) return out;
    for (const s of m.saws) {
      if (p.hits.has(s) || !circleRect(s.x, s.y, s.r + 4, hb)) continue;
      p.hits.add(s); s.spark = 0.25;
      if (p.atkDir === 'down') out.pogo = true; else out.clank = true;
      Sound.play('clank'); G.burst(s.x, s.y, 8, { color: '#ffe0b0', speed: 240, life: 0.3, size: 2 });
    }
    for (const l of m.levers) if (!p.hits.has(l) && overlap(hb, l.hb())) { p.hits.add(l); l.hit(); out.clank = true; }
    for (const d of m.drips) if (!p.hits.has(d) && (d.state === 'hang' || d.state === 'shake') && overlap(hb, d.body())) { p.hits.add(d); d.drop(); }
    return out;
  },
  // pieces that must never be stood on as a safe respawn point
  unsafe(tx, ty) { return G.level.get(tx, ty) === T_CRUMBLE; },
  // report the lit parts (lever lamps, saw sparks) to the lighting pass
  lights(add, th) {
    const m = G.mech; if (!m) return;
    for (const mv of m.movers) add(mv.x + mv.w / 2, mv.y + 22, 150, mv.powered() ? 0.8 : 0.35, th.glow);
    for (const l of m.levers) add(l.x, l.y - 40, 110, l.on ? 0.85 : 0.5, l.on ? '#9dffc8' : '#ffb070');
    for (const s of m.saws) if (s.spark > 0) add(s.x, s.y, 120, 0.7, '#ffd8a0');
  },
};
