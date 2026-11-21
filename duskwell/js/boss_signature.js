'use strict';
// Every boss's signature move. Once a boss reaches its second phase (and more often when it rages) it adds, between its own
// attacks, a great move of its kind: the heavy ones shake the hall (a slam, then rings of pillars rolling outward with gaps
// to slip through), the casters turn spirals of light around themselves, the swift ones cut across the hall three times in a
// row, the sky-dwellers bring light down on the hero, step after step. Each is shown clearly before it strikes and can be dodged.
(function () {
  if (typeof Boss === 'undefined') return;
  const KIND = {
    guardian: 'quake', colossus: 'quake', king: 'quake', thunderhoof: 'quake', marrow: 'quake', regent: 'quake', bonewright: 'quake',
    weaver: 'spiral', wraith: 'spiral', queen: 'spiral', spore: 'spiral', brood: 'spiral',
    duelist: 'dash', twin: 'dash',
    roc: 'rain', stargazer: 'rain', drowned: 'rain',
  };
  const palOf = () => ({ frost: ICE, storm: BOLT, mirror: GLASS, ember: SLAG }[G.level && G.level.def.theme]);
  const P = {
    *quake() {
      if (!this.onGround && this.grav !== false) yield* this.until(() => this.onGround, 1.5);
      this.vx = 0; this.facePlayer(); this.tele = 1; this.setAct('slam', 'wind', 0.8); Sound.play('roar'); G.shake(4, 0.8);
      yield* this.wait(0.8 * this.spd);
      this.tele = 0; this.setAct('slam', 'hit', 0.9); Sound.play('slam'); G.shake(14, 0.5); G.flash = Math.max(G.flash, 0.2);
      spawnShock(this.cx - 30, this.y + this.h, -1, 420); spawnShock(this.cx + 30, this.y + this.h, 1, 420);
      G.ring(this.cx, this.y + this.h, '#ffffff');
      const pal = palOf(), L = G.level, gap = Math.floor(Math.random() * 3);
      for (let k = 1; k <= 5; k++) {                                     // rings rolling outward, one pair left out each time
        for (const s of [-1, 1]) {
          if ((k + (s > 0 ? 0 : 1) + gap) % 3 === 0) continue;
          const x = this.cx + s * k * 90; if (x < 2 * TILE || x > L.pw - 2 * TILE) continue;
          spawnPillar(x, this.floorY, 0.55, 0.35, 200 + k * 10, pal);
        }
        yield* this.wait(0.22);
      }
      yield* this.wait(0.5 * this.spd); this.setAct('', '');
    },
    *spiral() {
      this.vx = 0; this.vy = 0; this.tele = 1; this.setAct('roar', '', 1.0); Sound.play('roar'); G.ring(this.cx, this.cy, '#ffffff');
      const was = this.grav; this.grav = false;
      yield* this.wait(0.6 * this.spd);
      this.tele = 0; const pal = palOf(), a0 = Math.random() * Math.PI, n = this.enraged ? 9 : 7;
      for (let w = 0; w < 3; w++) {
        for (let i = 0; i < n; i++) spawnRay(this.cx, this.cy, a0 + w * 0.32 + i * Math.PI * 2 / n, { tele: 0.6, dur: 0.22, pal, color: pal && pal.glow });
        Sound.play('tele'); yield* this.wait(0.55);
      }
      this.grav = was; yield* this.wait(0.4 * this.spd); this.setAct('', '');
    },
    *dash() {
      for (let k = 0; k < 3; k++) {
        this.facePlayer(); this.tele = 1; this.setAct('dash', 'wind', 0.35); Sound.play('tele');
        yield* this.wait((k ? 0.3 : 0.5) * this.spd);
        this.tele = 0; this.setAct('dash', 'dash'); Sound.play('slash'); G.shake(5, 0.2);
        let t = 0.32; const x0 = this.cx;
        while (t > 0) {
          this.vx = this.face * 1050; this.doMelee(0, 6, this.w * 0.6, this.h - 10, 1, 0.05);
          if (Math.random() < 0.8) G.burst(this.cx - this.face * 20, this.cy + rand(-20, 20), 1, { color: this.blood, speed: 30, life: 0.35, size: 5 });
          t -= this.dt; if (this.hitL || this.hitR) break; yield;
        }
        this.vx = 0; spawnShock(x0, this.y + this.h, this.face, 300, this.blood, 0.9);
        yield* this.wait(0.18);
      }
      this.setAct('', ''); yield* this.wait(0.5 * this.spd);
    },
    *rain() {
      this.tele = 1; this.setAct('roar', '', 0.8); Sound.play('roar'); this.vx = 0;
      yield* this.wait(0.5 * this.spd); this.tele = 0;
      const pal = palOf(), L = G.level, n = this.enraged ? 7 : 5;
      for (let i = 0; i < n; i++) {                                     // light falls where the hero stands, step after step
        spawnBeam(clamp(G.player.cx + rand(-20, 20), 2 * TILE, L.pw - 2 * TILE), 0.6, 0.28, 52, pal);
        yield* this.wait(0.38);
      }
      yield* this.wait(0.6 * this.spd); this.setAct('', '');
    },
  };
  Boss.prototype.signature = function* () {
    const k = KIND[this.bossKey]; if (!k) return;
    this._sigN = (this._sigN || 0) + 1; this.melee = null;
    yield* P[k].call(this);
  };
  const brain = Boss.prototype.brain;
  Boss.prototype.brain = function* () {
    if (!KIND[this.bossKey]) { yield* brain.call(this); return; }
    let n = 0;
    while (true) {
      yield* this.chooseAttack(); n++;
      if (this.state !== 'fight' || G.player.dead) continue;
      const due = this.phase >= 2 ? (this.enraged ? 2 : 3) : 0;               // every few attacks once it is hurt enough
      if (due && n >= due) { n = 0; yield* this.signature(); }
    }
  };
})();
