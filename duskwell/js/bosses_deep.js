'use strict';
// The four bosses of the Ossuary and the Lunar Observatory (see enemies_deep.js for their palettes and the ray):
// the Bonewright and the Marrow Tyrant below, the Stargazer and the Eclipse Regent above.

// ---------------------------------------------------------------- the Bonewright
// The mid-boss of the Ossuary: a tall sculptor of bone who builds what he fights with. He sweeps with a long arm,
// throws chisels, raises pillars of bone under your feet and, angered, assembles heaps that stand up to help him.
class Bonewright extends Boss {
  constructor(d) { super(d, 64, 118, { key: 'bonewright', hp: 200, geo: 190, phases: [0.5], blood: '#efe6d0' }); this.last = ''; this.slashing = 0; this.casting = false; this.lunging = false; }
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.7 : 0.45);
    const opts = ['sweep', 'chisels', 'pillars'];
    if (this.phase >= 2) opts.push('summon', 'leapSlam');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  *sweep() {                                     // a long arm swings low across the floor
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.62 * this.spd);
    this.tele = 0; Sound.play('slash'); this.slashing = 1;
    this.doMelee(18, 50, 170, 62, 1, 0.24);
    let t = 0.24; while (t > 0) { this.vx = this.face * 150; t -= this.dt; if (this.hitL || this.hitR) break; yield; }
    this.vx = 0; this.slashing = 0;
    yield* this.wait(0.65 * this.spd);
  }
  *chisels() {                                   // a fan of thrown chisels, then one aimed
    this.casting = true; this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.45 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const n = this.phase >= 2 ? 5 : 3, a = Math.atan2(G.player.cy - this.cy, G.player.cx - this.cx);
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 0.22; G.projs.push(new Proj({ kind: 'shard', x: this.cx + this.face * 30, y: this.cy - 14, vx: Math.cos(a + o) * 400, vy: Math.sin(a + o) * 400, r: 7, dmg: 1, color: '#efe6d0', life: 2.4, rot: a + o, pal: BONEP, boss: true })); }
    yield* this.wait(0.45);
    this.facePlayer(); Sound.play('shoot');
    G.projs.push(new Proj({ kind: 'shard', x: this.cx + this.face * 30, y: this.cy - 14, vx: this.face * 520, vy: 0, r: 8, dmg: 1, color: '#efe6d0', life: 2.4, rot: this.face > 0 ? 0 : Math.PI, pal: BONEP, boss: true }));
    this.casting = false;
    yield* this.wait(0.6 * this.spd);
  }
  *pillars() {                                   // bone rises under where you stand, and either side of it
    const L = G.level; this.casting = true; this.tele = 1; Sound.play('roar');
    yield* this.wait(0.4);
    const n = this.phase >= 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const x = clamp(G.player.cx + (i === 0 ? 0 : (i % 2 ? 1 : -1) * (80 + 40 * Math.ceil(i / 2))), 3 * TILE, L.pw - 3 * TILE);
      spawnPillar(x, this.floorY, 0.75, 0.42, 230, BONEP);
      yield* this.wait(0.3);
    }
    yield* this.wait(0.9); this.tele = 0; this.casting = false;
  }
  *summon() {                                    // two heaps stand up from the floor
    const L = G.level; this.casting = true; this.tele = 1; Sound.play('roar');
    yield* this.wait(0.6);
    const alive = G.enemies.filter(e => e.kind === 'heap' && !e.dead).length;
    for (let i = alive; i < 2; i++) {
      const tx = clamp(Math.floor((i % 2 ? L.pw - 8 * TILE : 8 * TILE) / TILE), 4, L.w - 5), h = new BoneHeap({ x: tx, y: Math.floor(this.floorY / TILE) - 1 });
      h.kind = 'heap'; h.revived = true; h.setState('rising'); G.enemies.push(h);
      G.burst(h.cx, this.floorY - 10, 14, { color: '#efe6d0', speed: 200, life: 0.5, size: 3, vy: -80 });
    }
    yield* this.wait(0.9); this.tele = 0; this.casting = false;
  }
  *leapSlam() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.5 * this.spd);
    this.tele = 0; this.lunging = true;
    const T = 0.7; this.vy = -760; this.vx = clamp((G.player.cx - this.cx) / T, -440, 440); this.onGround = false;
    yield; yield; yield* this.until(() => this.onGround, 2);
    this.lunging = false; this.vx = 0; Sound.play('slam'); G.shake(9, 0.3);
    spawnShock(this.cx - 30, this.y + this.h, -1, 380, '#efe6d0'); spawnShock(this.cx + 30, this.y + this.h, 1, 380, '#efe6d0');
    for (let i = 0; i < 2; i++) spawnRock(clamp(G.player.cx + rand(-220, 220), 3 * TILE, G.level.pw - 3 * TILE), 0.7 + i * 0.12, BONEP);
    yield* this.wait(0.6 * this.spd);
  }
}

// ---------------------------------------------------------------- the Marrow Tyrant
// The last of the Ossuary: every bone of the dead gathered into one body with a crown of skulls and a glowing heart
// of marrow. It stamps, rains ribs, smashes with a fist, spits marrow that bursts, calls hands up from the floor
// and, wounded, rattles apart in rings of green light.
class Marrow extends Boss {
  constructor(d) { super(d, 128, 150, { key: 'marrow', hp: 380, geo: 450, phases: [0.66, 0.33], blood: '#efe6d0' }); this.last = ''; this.slashing = 0; this.casting = false; this.rattling = false; }
  *chooseAttack() {
    this.facePlayer();
    yield* this.wait(this.phase === 1 ? 0.8 : this.phase === 2 ? 0.55 : 0.4);
    const opts = ['stomp', 'ribs', 'crush'];
    if (this.phase >= 2) opts.push('spit', 'hands');
    if (this.phase >= 3) opts.push('rattle');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  *stomp() {
    this.facePlayer(); this.tele = 1; Sound.play('tele');
    yield* this.wait(0.8 * this.spd);
    this.tele = 0; Sound.play('slam'); G.shake(11, 0.4); this.slashing = 2;
    spawnShock(this.cx - 60, this.y + this.h, -1, 420, '#efe6d0'); spawnShock(this.cx + 60, this.y + this.h, 1, 420, '#efe6d0');
    this.doMelee(0, this.h - 60, 190, 60, 1, 0.2);
    if (this.phase >= 2) for (let i = 0; i < 3; i++) spawnRock(clamp(G.player.cx + rand(-240, 240), 3 * TILE, G.level.pw - 3 * TILE), 0.7 + i * 0.12, BONEP);
    yield* this.wait(0.3); this.slashing = 0;
    yield* this.wait(0.55 * this.spd);
  }
  *ribs() {                                      // a shower of ribs, from above the whole hall
    const L = G.level; this.casting = true; this.tele = 1; Sound.play('roar');
    const n = 5 + this.phase * 2;
    for (let i = 0; i < n; i++) { spawnRock(clamp(G.player.cx + rand(-300, 300), 3 * TILE, L.pw - 3 * TILE), 0.85, BONEP); yield* this.wait(0.2); }
    yield* this.wait(0.9); this.tele = 0; this.casting = false;
  }
  *crush() {                                     // the great fist, raised and brought down
    this.facePlayer(); this.tele = 1; Sound.play('tele'); this.slashing = 1;
    yield* this.wait(0.95 * this.spd);
    this.tele = 0; Sound.play('slam'); G.shake(10, 0.35); this.slashing = 2;
    this.doMelee(28, 10, 150, 130, 2, 0.28);
    spawnShock(this.cx + this.face * 120, this.y + this.h, this.face, 380, '#efe6d0');
    yield* this.wait(0.4); this.slashing = 0;
    yield* this.wait(0.7 * this.spd);
  }
  *spit() {                                      // three blobs of marrow, lobbed, that burst on landing
    this.facePlayer(); this.casting = true; this.tele = 1; Sound.play('tele');
    yield* this.wait(0.55 * this.spd);
    this.tele = 0;
    for (let i = 0; i < 3; i++) {
      this.facePlayer(); Sound.play('shoot');
      const sx = this.cx + this.face * 36, sy = this.y + 40, T = 0.95, g = 900, px = G.player.cx + rand(-60, 60);
      G.projs.push(new Proj({ kind: 'bomb', x: sx, y: sy, vx: (px - sx) / T, vy: (G.player.cy - sy - 0.5 * g * T * T) / T, grav: g, r: 11, dmg: 1, color: '#bfe8d0', life: 3, fuse: 1.6, blastR: 74 }));
      yield* this.wait(0.42);
    }
    this.casting = false;
    yield* this.wait(0.55 * this.spd);
  }
  *hands() {                                     // a wave of skeleton hands bursts from the floor toward you
    const L = G.level, dir = G.player.cx > this.cx ? 1 : -1; this.casting = true; this.tele = 1; Sound.play('roar');
    yield* this.wait(0.5);
    let x = this.cx + dir * 110;
    for (let i = 0; i < 9; i++) {
      if (x < 3 * TILE || x > L.pw - 3 * TILE) break;
      spawnPillar(x, this.floorY, 0.55, 0.36, 130, BONEP); x += dir * 76;
      yield* this.wait(0.13);
    }
    yield* this.wait(0.8); this.tele = 0; this.casting = false;
  }
  *rattle() {                                    // the body shakes apart, and rings of marrow-light leave the heart
    this.tele = 1; this.rattling = true; Sound.play('roar'); G.shake(8, 1.0);
    yield* this.wait(0.8);
    this.tele = 0; Sound.play('shoot');
    const rings = 3, n = 12;
    for (let r = 0; r < rings; r++) {
      const off = r * Math.PI / n + this.t;
      for (let i = 0; i < n; i++) { const a = off + i * Math.PI * 2 / n; G.projs.push(new Proj({ kind: 'orb', x: this.cx, y: this.y + 62, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 9, dmg: 1, color: '#9fe8c0', life: 3.2, pal: WISPP })); }
      yield* this.wait(0.55);
    }
    this.rattling = false;
    yield* this.wait(0.7);
  }
}

// ---------------------------------------------------------------- the Stargazer
// The mid-boss of the Observatory: a robed astronomer who hangs in the air with a long brass telescope. He aims thin
// rays at you, calls down meteors, spins rings of stars and, angered, blinks across the hall and opens a field
// of weak gravity that lets you leap up to him.
class Stargazer extends Boss {
  constructor(d) { super(d, 56, 96, { key: 'stargazer', hp: 220, geo: 200, phases: [0.5], blood: '#dfe6ff' }); this.grav = false; this.last = ''; this.casting = false; this.aimA = 0; this.moonZone = null; }
  get hoverY() { return this.floorY - 4.2 * TILE; }
  *chooseAttack() {
    yield* this.wait(this.phase === 1 ? 0.55 : 0.38);
    const opts = ['rays', 'starfall', 'orbit'];
    if (this.phase >= 2) opts.push('blink', 'lowgrav');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  scope() { return { x: this.cx + this.face * 34, y: this.cy - 8 }; }
  *aimRay(spread) {                              // lock the line, warn, fire
    this.facePlayer(); const s = this.scope(), a = Math.atan2(G.player.cy - s.y, G.player.cx - s.x); this.aimA = a; this.tele = 1; this.casting = true; Sound.play('tele');
    for (const o of spread) spawnRay(s.x, s.y, a + o, { tele: 0.7, dur: 0.26, rw: 16, pal: STARP });
    yield* this.hover(0.95 * this.spd);
    this.tele = 0;
  }
  *rays() {
    const L = G.level;
    yield* this.flyTo(clamp(G.player.cx + pick([-1, 1]) * rand(170, 300), 4 * TILE, L.pw - 4 * TILE), this.hoverY, 380);
    const rounds = this.phase >= 2 ? 3 : 2;
    for (let r = 0; r < rounds; r++) { yield* this.aimRay(this.phase >= 2 ? [-0.34, 0, 0.34] : [0]); yield* this.hover(0.3); }
    this.casting = false;
    yield* this.wait(0.3);
  }
  *starfall() {
    const L = G.level;
    yield* this.flyTo(L.pw / 2, this.hoverY - 40, 380);
    this.tele = 1; this.casting = true; Sound.play('roar');
    const n = this.phase >= 2 ? 9 : 6;
    for (let i = 0; i < n; i++) { spawnRock(clamp(G.player.cx + rand(-280, 280), 3 * TILE, L.pw - 3 * TILE), 0.85, STARP); yield* this.hover(0.2); }
    yield* this.hover(0.9); this.tele = 0; this.casting = false;
  }
  *orbit() {                                     // a spiral of stars from the lens
    yield* this.flyTo(clamp(G.level.pw / 2 + rand(-100, 100), 5 * TILE, G.level.pw - 5 * TILE), this.hoverY - 20, 360);
    this.tele = 1; this.casting = true; Sound.play('tele');
    yield* this.hover(0.55 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const n = this.phase >= 2 ? 24 : 16, arms = this.phase >= 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < arms; k++) { const a = i * 0.34 + k * Math.PI * 2 / arms; G.projs.push(new Proj({ kind: 'orb', x: this.cx, y: this.cy, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 9, dmg: 1, color: '#dfe6ff', life: 3.2, pal: STARP })); }
      yield* this.hover(0.1);
    }
    this.casting = false;
    yield* this.hover(0.5);
  }
  *blink() {                                     // out here, in there, and a ray from the new place
    const L = G.level; this.ghostly = true;
    for (let a = 1; a > 0; a -= 0.1) { this.alpha = a; yield; }
    this.alpha = 0; yield* this.wait(0.25);
    const side = G.player.cx > L.pw / 2 ? -1 : 1;
    this.x = (L.pw / 2 + side * rand(200, 360)) - this.w / 2; this.y = this.hoverY - this.h / 2;
    for (let a = 0; a < 1; a += 0.12) { this.alpha = a; yield; }
    this.alpha = 1; this.ghostly = false;
    yield* this.aimRay([-0.2, 0.2]);
    this.casting = false;
    yield* this.hover(0.3);
  }
  *lowgrav() {                                   // the room's gravity falls: leap, and strike him, while stars rain slowly
    const L = G.level; this.tele = 1; this.casting = true; Sound.play('roar');
    yield* this.flyTo(L.pw / 2, this.hoverY, 380);
    yield* this.hover(0.5);
    this.tele = 0; this.endField();
    this.moonZone = { x: 0, y: 0, w: L.pw, h: L.ph, k: 0.38 }; L.gravs.push(this.moonZone);
    let t = 6.5;
    while (t > 0) { spawnRock(clamp(G.player.cx + rand(-260, 260), 3 * TILE, L.pw - 3 * TILE), 1.0, STARP); const w = 0.55; yield* this.hover(w); t -= w; }
    this.endField(); this.casting = false;
    yield* this.hover(0.3);
  }
  endField() { if (this.moonZone) { const L = G.level; L.gravs = L.gravs.filter(z => z !== this.moonZone); this.moonZone = null; } }
  shiftRoutine() { this.endField(); return super.shiftRoutine(); }
  kill() { this.endField(); super.kill(); }
}

// ---------------------------------------------------------------- the Eclipse Regent
// The last of the Observatory: the one who hid the moon behind his own disc. Each attack is a phase of the moon:
// crescents that sweep the floor, the full moon's ring of orbs, the beams of the eclipse, the dark of the new moon
// (the hall goes black and only the rays show), the tide (gravity falls) and, last, the corona: a searchlight of rays.
class Regent extends Boss {
  constructor(d) { super(d, 100, 140, { key: 'regent', hp: 420, geo: 520, phases: [0.66, 0.33], blood: '#cfd8ff' }); this.grav = false; this.last = ''; this.casting = false; this.moonZone = null; }
  get hoverY() { return this.floorY - 4.6 * TILE; }
  *chooseAttack() {
    yield* this.wait(this.phase === 1 ? 0.6 : this.phase === 2 ? 0.42 : 0.3);
    const opts = ['crescents', 'fullmoon', 'beams'];
    if (this.phase >= 2) opts.push('newmoon', 'tide');
    if (this.phase >= 3) opts.push('totality');
    this.last = pick(opts.filter(o => o !== this.last));
    yield* this[this.last]();
  }
  crescent(dir, y, speed) {
    G.projs.push(new Proj({ kind: 'wave', x: this.cx + dir * 40, y, vx: dir * speed, vy: 0, r: 19, dmg: 1, color: '#dbe4ff', life: 3.2, pierce: true }));
  }
  *crescents() {                                 // alternating low and high: jump the first, stand under the second
    const L = G.level, side = this.cx < L.pw / 2 ? 1 : -1;
    yield* this.flyTo(side > 0 ? 4 * TILE : L.pw - 4 * TILE, this.hoverY, 400);
    this.face = side; this.tele = 1; this.casting = true; Sound.play('tele');
    yield* this.hover(0.55 * this.spd);
    this.tele = 0;
    const n = this.phase >= 3 ? 5 : this.phase >= 2 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      Sound.play('slash'); this.crescent(side, i % 2 ? this.floorY - 112 : this.floorY - 18, 330 + this.phase * 20);
      yield* this.hover(0.62);
    }
    this.casting = false;
    yield* this.flyTo(L.pw / 2, this.hoverY, 380);
  }
  *fullmoon() {
    const L = G.level;
    yield* this.flyTo(clamp(L.pw / 2 + rand(-120, 120), 5 * TILE, L.pw - 5 * TILE), this.hoverY - 10, 360);
    this.tele = 1; this.casting = true; Sound.play('tele');
    yield* this.hover(0.6 * this.spd);
    this.tele = 0; Sound.play('shoot');
    const rings = this.phase >= 2 ? 3 : 2, n = this.phase >= 3 ? 16 : 12;
    for (let r = 0; r < rings; r++) {
      const off = r * Math.PI / n + this.t * 0.5;
      for (let i = 0; i < n; i++) { const a = off + i * Math.PI * 2 / n; G.projs.push(new Proj({ kind: 'orb', x: this.cx, y: this.cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 10, dmg: 1, color: '#dfe6ff', life: 3.4, pal: STARP })); }
      yield* this.hover(0.6);
    }
    this.casting = false;
    yield* this.hover(0.4);
  }
  *beams() {                                     // columns of the eclipse, walking toward you
    const L = G.level; this.tele = 1; this.casting = true; Sound.play('roar');
    yield* this.flyTo(L.pw / 2, this.hoverY - 30, 380);
    const n = this.phase >= 2 ? 6 : 4;
    for (let i = 0; i < n; i++) { spawnBeam(clamp(G.player.cx + (i ? rand(-170, 170) : 0), 3 * TILE, L.pw - 3 * TILE), 0.95 - this.phase * 0.08, 0.3, 46, STARP); yield* this.hover(0.45); }
    yield* this.hover(0.8); this.tele = 0; this.casting = false;
  }
  *newmoon() {                                   // the hall goes dark; the rays still show
    const L = G.level; this.tele = 1; this.casting = true; Sound.play('roar');
    yield* this.flyTo(L.pw / 2, this.hoverY - 20, 380);
    G.eclipseT = 1;
    yield* this.hover(0.9);
    this.tele = 0;
    const rounds = this.phase >= 3 ? 5 : 4;
    for (let r = 0; r < rounds; r++) {
      const s = { x: this.cx, y: this.cy }, a = Math.atan2(G.player.cy - s.y, G.player.cx - s.x);
      for (const o of (r % 2 ? [-0.32, 0.32] : [0])) spawnRay(s.x, s.y, a + o, { tele: 0.8, dur: 0.26, rw: 18, pal: STARP });
      Sound.play('tele');
      yield* this.hover(1.05);
    }
    G.eclipseT = 0; this.casting = false;
    yield* this.hover(0.6);
  }
  *tide() {                                      // gravity falls, and the crescents come in pairs
    const L = G.level; this.tele = 1; this.casting = true; Sound.play('roar');
    yield* this.flyTo(L.pw / 2, this.hoverY, 380);
    yield* this.hover(0.5); this.tele = 0; this.endField();
    this.moonZone = { x: 0, y: 0, w: L.pw, h: L.ph, k: 0.36 }; L.gravs.push(this.moonZone);
    for (let i = 0; i < 5; i++) {
      const side = i % 2 ? 1 : -1; Sound.play('slash');
      this.crescent(side, this.floorY - 22 - (i % 3) * 52, 300);
      this.crescent(-side, this.floorY - 90 + (i % 2) * 40, 260);
      yield* this.hover(1.1);
    }
    this.endField(); this.casting = false;
    yield* this.hover(0.3);
  }
  *totality() {                                  // the corona: a searchlight of rays around the black disc
    const L = G.level; this.tele = 1; this.casting = true; Sound.play('roar');
    yield* this.flyTo(L.pw / 2, this.hoverY - 10, 380);
    yield* this.hover(0.6); this.tele = 0;
    const a0 = pick([2.95, 0.19]), a1 = 3.14 - a0, n = 13;
    for (let i = 0; i < n; i++) {
      spawnRay(this.cx, this.cy, lerp(a0, a1, i / (n - 1)), { tele: 0.6, dur: 0.24, rw: 18, pal: STARP }); Sound.play('tele');
      yield* this.hover(0.19);
    }
    yield* this.hover(1.0); this.casting = false;
  }
  endField() { if (this.moonZone) { const L = G.level; L.gravs = L.gravs.filter(z => z !== this.moonZone); this.moonZone = null; } }
  shiftRoutine() { this.endField(); G.eclipseT = 0; return super.shiftRoutine(); }
  kill() { this.endField(); G.eclipseT = 0; super.kill(); }
}

Object.assign(BOSS_TYPES, { bonewright: Bonewright, marrow: Marrow, stargazer: Stargazer, regent: Regent });
