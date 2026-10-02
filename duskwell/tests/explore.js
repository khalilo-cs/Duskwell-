// Reachability explorer. It drives the game's real Player physics with scripted input (runs, jumps of
// several heights, dashes, double jumps, wall-jump climbs) from every spot the player can reach, and
// records every standing cell, door and item it can touch. It is sound (what it reaches is reachable)
// but not complete, so a room that passes is playable; a room that fails needs a look.
//   const { install, run } = require('./explore'); await install(page); const r = await run(page, 'fr1', {...abilities}, { door: 'w' });
// Moving platforms, crumbling floors and enemies are not simulated: use rooms without them for the check.
// Wind zones are real physics (Level.winds): pass { neutral: true } to add programs that ride a lift straight up before steering.
const SRC = `(() => {
  const DT = 1 / 60;
  function run(roomId, abilities, spawn, opt) {
    opt = opt || {};
    const { G, P, enterRoom } = DW;
    const saved = { burst: G.burst, ring: G.ring, shake: G.shake, hitstop: G.hitstop, slashFx: G.slashFx, play: Sound.play, pressed: Input.pressed, down: Input.down, released: Input.released, axisX: Input.axisX, axisY: Input.axisY };
    const held = {}, edge = {};
    Input.down = a => !!held[a]; Input.pressed = a => !!edge[a]; Input.released = () => false;
    Input.axisX = () => (held.right ? 1 : 0) - (held.left ? 1 : 0); Input.axisY = () => (held.down ? 1 : 0) - (held.up ? 1 : 0);
    G.burst = G.ring = G.shake = G.hitstop = G.slashFx = () => {}; Sound.play = () => {};
    try {
      enterRoom(roomId, spawn || { bench: true }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; G.projs = [];
      const L = G.level;
      if (opt.breakAll) for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) { const v = L.get(tx, ty); if (v === T_BREAK || (v === T_CRACK && abilities && abilities.dive)) L.set(tx, ty, T_AIR); }
      const ab = Object.assign({ dash: false, wall: false, double: false, dive: false, superdash: false }, abilities || {});
      const stand = (tx, ty) => !L.solid(tx, ty) && !L.solid(tx, ty - 1) && !L.hazard(tx, ty) && L.get(tx, ty + 1) !== T_BOUNCE && L.ground(tx, ty + 1) && L.get(tx, ty + 1) !== T_CRUMBLE;
      const key = (tx, ty) => tx + ',' + ty;
      const start = { x: P.cx, y: P.y + P.h };
      const reached = new Map(), doors = new Set(), items = new Set();
      const q = [];
      const add = (tx, ty, x) => { const k = key(tx, ty); if (!reached.has(k)) { reached.set(k, { tx, ty, x }); q.push(k); } };
      // programs: direction, where the run starts, how long jump is held, dash time, second-jump time, wall-climb policy
      const progs = [];
      const holds = [0, 0.06, 0.12, 0.2, 0.45], dashes = ab.dash ? [null, 0.04, 0.16, 0.34] : [null], djs = ab.double ? [null, 0.2, 0.38] : [null];
      for (const dir of [-1, 1]) for (const st of ['edge', 'center']) for (const h of holds) for (const d of dashes) for (const j of djs) {
        if (h === 0 && (j != null)) continue;
        progs.push({ dir, st, h, d, j, wall: false });
      }
      if (ab.wall) for (const dir of [-1, 1]) for (const st of ['edge', 'center']) for (const h of [0.2, 0.45]) for (const flip of [false, true]) for (const d of dashes) progs.push({ dir, st, h, d, j: null, wall: true, flip });
      // wind: ride a lift straight up for a while, then steer (lag = seconds before any direction is held)
      if (opt.neutral) for (const dir of [-1, 1]) for (const h of [0, 0.45]) for (const lag of [0.3, 0.6, 0.9, 1.2, 1.6, 2.0]) for (const j of ab.double ? [null, 0.5] : [null]) progs.push({ dir, st: 'center', h, d: null, j, lag, wall: false, long: true });
      if (opt.neutral) for (const dir of [-1, 1]) for (const st of ['edge', 'center']) for (const h of [0.2, 0.45]) for (const a of [0.12, 0.22, 0.34]) for (const b of [0.9, 1.3, 1.7, 2.1, 2.6]) for (const j of ab.double ? [null, 0.9] : [null]) progs.push({ dir, st, h, d: null, j, win: [a, b], wall: false, long: true });
      const touch = () => {
        const cx = P.cx, cy = P.cy;
        for (const d of L.def.doors) if (cx > d.x * TILE && cx < (d.x + d.w) * TILE && cy > d.y * TILE && cy < (d.y + d.h) * TILE) doors.add(d.id);
        for (const it of G.items) if (Math.abs(cx - it.x) < 30 && Math.abs(cy - it.y) < 40) items.add(it.id);
      };
      const sim = (x, y, p) => {
        for (const k of Object.keys(held)) delete held[k];
        P.place(x, y, p.dir); P.ab = Object.assign({}, ab); P.hp = P.maxHp = 5; P.invuln = 1e9; P.hurtT = 0; P.dead = false; P.sitting = null; P.onGround = true;
        let air = 0, dir = p.dir, wallT = -1, lands = [], wj = 0;
        for (let f = 0; f < (p.wall ? 480 : p.long ? 300 : 150); f++) {
          const t = f * DT;
          for (const k of Object.keys(edge)) delete edge[k];
          if (p.wall && P.sliding && (wallT < 0 || t > wallT + 0.2) && wj < 16) { edge.jump = true; wallT = t; wj++; if (p.flip) dir = -dir; }   // the key is already down on the frame of the press
          const on = p.win ? (t < p.win[0] || t >= p.win[1]) : t >= (p.lag || 0);
          held.left = dir < 0 && on; held.right = dir > 0 && on;
          if (f === 0 && p.h > 0) edge.jump = true;
          held.jump = (p.h > 0 && t < p.h) || (p.j != null && t >= p.j && t < p.j + 0.3) || (wallT >= 0 && t < wallT + 0.3);
          if (p.d != null && Math.abs(t - p.d) < DT / 2) edge.dash = true;
          if (p.j != null && Math.abs(t - p.j) < DT / 2) edge.jump = true;
          P.update(DT); touch();
          if (P.y > L.ph + 60) break;
          if (!P.onGround) air++;
          else if (air > 2 || (f > 3 && P.vy === 0 && air > 0)) { lands.push({ tx: Math.floor(P.cx / TILE), ty: Math.floor((P.y + P.h - 1) / TILE), x: P.cx }); break; }
          else if (f > 20 && p.h === 0 && air === 0 && !held.left && !held.right) break;
        }
        return lands;
      };
      // the start: wherever enterRoom put the hero, on the floor
      const sx = Math.floor(start.x / TILE), sy = Math.floor((start.y - 1) / TILE);
      let sy2 = sy; while (sy2 < L.h - 1 && !stand(sx, sy2)) sy2++;
      for (const fromPos of [start]) { P.place(fromPos.x, fromPos.y, 1); for (let i = 0; i < 90; i++) { P.update(DT); touch(); if (P.onGround && i > 10) break; } }
      add(Math.floor(P.cx / TILE), Math.floor((P.y + P.h - 1) / TILE), P.cx);
      let steps = 0;
      while (q.length && reached.size < (opt.max || 2500)) {
        const c = reached.get(q.shift());
        const baseX = [c.tx * TILE + TILE / 2];
        for (const p of progs) {
          const x = p.st === 'center' ? c.tx * TILE + TILE / 2 : (p.dir > 0 ? (c.tx + 1) * TILE - 8 : c.tx * TILE + 8);
          const y = (c.ty + 1) * TILE;
          for (const ld of sim(x, y, p)) if (stand(ld.tx, ld.ty)) add(ld.tx, ld.ty, ld.x);
          steps++;
        }
      }
      let total = 0; for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) if (stand(tx, ty)) total++;
      return { reached: reached.size, standable: total, doors: [...doors], items: [...items], allDoors: L.def.doors.map(d => d.id), allItems: G.items.map(i => i.id), cells: opt.cells ? [...reached.values()] : undefined };
    } finally {
      Object.assign(G, { burst: saved.burst, ring: saved.ring, shake: saved.shake, hitstop: saved.hitstop, slashFx: saved.slashFx }); Sound.play = saved.play;
      Object.assign(Input, { pressed: saved.pressed, down: saved.down, released: saved.released, axisX: saved.axisX, axisY: saved.axisY });
    }
  }
  window.Explorer = { run };
})();`;
exports.install = page => page.evaluate(SRC);
exports.run = (page, room, abilities, spawn, opt) => page.evaluate(([r, a, s, o]) => Explorer.run(r, a, s, o), [room, abilities, spawn, opt]);
