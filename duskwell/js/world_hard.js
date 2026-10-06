'use strict';
// Rougher rooms. Every room off the beaten start gets, worked out once from its own id, a few extras laid on its long
// flat floors: strips of spikes to be jumped, on the longest floors a blade rolling to and fro, a stalactite where a low
// ceiling hangs over the way, and a copy of one of the room's own creatures. How many of them stand depends on the setting
// (Diff.hazard): none on Easy, the first set on Normal, both sets (and wider strips) on Hard. Nothing is put near doors, benches, pickups, people or the machinery already there, and every strip has three
// free tiles above it, so what could be crossed before can still be crossed.
const Hard = (function () {
  const plans = {};
  // a small seeded generator so a room is the same on every visit
  function rng(id) {
    let s = 2166136261;
    for (let i = 0; i < id.length; i++) { s ^= id.charCodeAt(i); s = Math.imul(s, 16777619); }
    return () => { s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 | 0; return ((s >>> 0) % 100000) / 100000; };
  }
  // rooms that keep their own rules
  function skip(r) {
    if (r.arena || r.winds.length || r.gravs.length || r.start) return true;
    if (r.area === 'hushvale' || r.bg === 'townb' || r.theme === 'town') return true;
    return r.w < 30 || r.id === 'start';
  }
  // rectangles (x, y, w, h in tiles) the extras stay out of
  function keepOut(r) {
    const bad = [];
    for (const d of r.doors) bad.push([d.x - 4, d.y - 4, d.w + 8, d.h + 8]);
    for (const q of [].concat(r.benches, r.stations, r.signs, r.npcs, r.items)) bad.push([q.x - 3, q.y - 5, 7, 7]);
    for (const m of r.mech) bad.push(m.type === 'mover' ? [Math.min(m.x, m.to.x) - 2, Math.min(m.y, m.to.y) - 5, Math.abs(m.to.x - m.x) + m.w + 4, Math.abs(m.to.y - m.y) + 8] : [m.x - 3, m.y - 5, 7, 8]);
    for (const e of r.enemies) bad.push([e.x - 1, e.y - 2, 3, 3]);
    return bad;
  }
  function plan(id) {
    if (plans[id]) return plans[id];
    const r = WORLD.rooms[id], out = plans[id] = { spikes: [], saws: [], drips: [], foes: [] };
    if (!r || skip(r)) return out;
    const rnd = rng(id), bad = keepOut(r), at = (x, y) => (x < 0 || y < 0 || x >= r.w || y >= r.h) ? T_SOLID : r.t[y * r.w + x];
    const inBad = (x, y) => bad.some(b => x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3]);
    // runs of floor: air with three free tiles over it and plain rock under it, not ice, not in a keep-out
    const runs = [];
    for (let y = 5; y < r.h - 1; y++) {
      let a = -1;
      for (let x = 1; x <= r.w - 1; x++) {
        let ok = x < r.w - 1 && at(x, y) === T_AIR && at(x, y + 1) === T_SOLID && !r.iceCells.has((y + 1) * r.w + x) && !inBad(x, y);
        for (let j = 1; j <= 3 && ok; j++) if (at(x, y - j) !== T_AIR) ok = false;
        if (ok && a < 0) a = x;
        if (!ok && a >= 0) { if (x - a >= 7) runs.push({ x: a, y, n: x - a }); a = -1; }
      }
    }
    runs.sort((p, q) => q.n - p.n || p.y - q.y || p.x - q.x);
    const taken = [];                                                      // [x from, x to, y] stretches of floor given to a strip or a blade
    runs.slice(0, 6).forEach((run, i) => {
      const lo = run.x + 2, hi = run.x + run.n - 2 - 3;                      // room to run up and to land, whatever the strip's width
      if (hi < lo) return;
      const x1 = lo + Math.floor(rnd() * (hi - lo + 1));
      out.spikes.push({ x: x1, y: run.y, w: 2, lv: i < 2 ? 1 : 2 }); taken.push([x1, x1 + 3, run.y]);
      if (run.n >= 16) {                                                   // a blade on a rail along the longer side of the strip
        const left = [run.x + 1, x1 - 3], right = [x1 + 6, run.x + run.n - 2];
        const side = left[1] - left[0] >= right[1] - right[0] ? left : right;
        if (side[1] - side[0] >= 4) { out.saws.push({ x: side[0], to: side[1], y: run.y, lv: 2 }); taken.push([side[0] - 1, side[1] + 1, run.y]); }
      } else if (run.n >= 15 && i < 2) {                                   // or a second strip, well away from the first
        const far = x1 - lo >= hi - x1 ? lo + Math.floor(rnd() * Math.max(1, (x1 - lo) - 6)) : x1 + 7 + Math.floor(rnd() * Math.max(1, hi - x1 - 6));
        if (far >= lo && far <= hi && Math.abs(far - x1) >= 7) { out.spikes.push({ x: far, y: run.y, w: 2, lv: 2 }); taken.push([far, far + 3, run.y]); }
      }
    });
    // a stalactite where there is a ceiling five to thirteen tiles over a floor run, over one of the floor runs
    const drips = [];
    for (const run of runs.slice(0, 4)) for (let x = run.x + 4; x < run.x + run.n - 4; x++) {
      for (let cy = run.y - 5; cy >= Math.max(1, run.y - 13); cy--) {
        if (at(x, cy) === T_SOLID && at(x, cy + 1) === T_AIR && at(x - 1, cy + 1) === T_AIR && at(x + 1, cy + 1) === T_AIR) {
          let clear = true; for (let y = cy + 1; y < run.y && clear; y++) if (at(x, y) !== T_AIR) clear = false;
          if (clear && !inBad(x, cy + 1) && !taken.some(t => x >= t[0] - 3 && x <= t[1] + 3 && Math.abs(t[2] - run.y) < 2)) drips.push({ x, y: cy + 1 });
          break;
        }
        if (at(x, cy) !== T_AIR) break;
      }
    }
    for (let i = 0, lv = 1; i < drips.length && out.drips.length < 2; i++) {
      const k = Math.floor(rnd() * drips.length), d = drips[k];
      if (out.drips.some(o => Math.abs(o.x - d.x) < 8)) continue;
      out.drips.push(Object.assign({ lv }, d)); lv = 2;
    }
    // copies of the room's own creatures: ground ones on a floor spot, flyers a couple of tiles above one
    if (r.enemies.length && WORLD.freeSpots) {
      const solid = (x, y) => { const v = at(x, y); return v === T_SOLID || v === T_ONEWAY; };
      const spots = WORLD.freeSpots(r).filter(s => !taken.some(t => s.x >= t[0] - 3 && s.x <= t[1] + 3 && Math.abs(t[2] - s.y) < 3) && !out.drips.some(d => Math.abs(d.x - s.x) < 3));
      for (let lv = 1; lv <= 2 && spots.length; lv++) {
        const src = r.enemies[Math.floor(rnd() * r.enemies.length)], flyer = !solid(src.x, src.y + 1);
        const k = Math.floor(rnd() * spots.length), s = spots.splice(k, 1)[0];
        for (let i = spots.length - 1; i >= 0; i--) if (Math.abs(spots[i].x - s.x) < 6 && Math.abs(spots[i].y - s.y) < 3) spots.splice(i, 1);
        out.foes.push({ type: src.type, x: s.x, y: flyer ? s.y - 2 : s.y, lv });
      }
    }
    return out;
  }
  const level = () => Diff.hazard <= 0 ? 0 : Diff.hazard > 1 ? 2 : 1;           // Easy 0, Normal 1, Hard 2
  return {
    plan,
    // lay the spikes of the room on its tiles (a fresh copy of the tile grid each visit)
    spikes(L, def) {
      const lv = level(); if (!lv) return 0;
      let n = 0;
      for (const s of plan(def.id).spikes) {
        if (s.lv > lv) continue;
        const w = lv >= 2 ? 3 : s.w;
        for (let i = 0; i < w; i++) if (L.get(s.x + i, s.y) === T_AIR) { L.set(s.x + i, s.y, T_HAZARD); n++; }
      }
      return n;
    },
    // the stalactites and the blades on their rails, in the shape Mech.init takes
    drips(def) {
      const lv = level(); if (!lv) return [];
      const p = plan(def.id), out = p.drips.filter(d => d.lv <= lv).map(d => ({ type: 'drip', x: d.x, y: d.y }));
      for (const b of p.saws) if (b.lv <= lv) out.push({ type: 'saw', x: b.x + 0.5, y: b.y + 0.38, to: { x: b.to + 0.5, y: b.y + 0.38 }, speed: 96, phase: (b.x % 5) / 10 });
      return out;
    },
    // the extra creatures, in the shape RoomBuilder.enemy makes
    foes(def) { const lv = level(); return lv ? plan(def.id).foes.filter(f => f.lv <= lv).map(f => ({ type: f.type, x: f.x, y: f.y })) : []; },
  };
})();
