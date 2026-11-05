'use strict';
// Rolling ground: the long flat floors of the hand-built rooms get low mounds and steps (one tile high, three to six wide),
// worked out once from each room's id, so the ground rises and falls instead of running dead flat. Nothing is raised near a
// door, bench, station, sign, person, pickup or machine, on ice, or where the headroom is low, so every way stays open.
(function rough() {
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; };
  for (const id of Object.keys(WORLD.rooms)) {
    const r = WORLD.rooms[id]; if (r.arena || id === 'town') continue;
    const R = hash('rough_' + id), at = (x, y) => (x < 0 || y < 0 || x >= r.w || y >= r.h ? T_SOLID : r.t[y * r.w + x]);
    const busy = [].concat(r.doors, r.items, r.benches, r.stations, r.signs, r.npcs, r.mech, r.leverGates || []);
    const near = (x, y) => busy.some(q => Math.abs((q.x || 0) - x) < 7 && Math.abs((q.y || 0) - y) < 6);
    for (let y = 6; y < r.h - 1; y++) {
      let run = 0;
      for (let x = 1; x < r.w - 1; x++) {
        const flat = at(x, y + 1) === T_SOLID && !r.iceCells.has((y + 1) * r.w + x) && [0, 1, 2, 3, 4, 5].every(k => at(x, y - k) === T_AIR);
        run = flat ? run + 1 : 0;
        if (run >= 14 && R() < 0.22) {                         // a mound inside this flat run, behind the point just reached
          const w = 3 + Math.floor(R() * 4), x0 = x - run + 4 + Math.floor(R() * Math.max(1, run - w - 8));
          let ok = !near(x0 + w / 2, y);
          for (let i = x0 - 1; i <= x0 + w && ok; i++) if (at(i, y + 1) !== T_SOLID || at(i, y) !== T_AIR) ok = false;
          if (ok) { r.solid(x0, y, w, 1); if (w >= 5 && R() < 0.4) r.solid(x0 + 1, y - 1, w - 2, 1); run = 0; }
        }
      }
    }
  }
})();
