'use strict';
// Painted hills and outcrops: on the long flat floors of the rooms, worked out once from each room's id, a low hill (two steps
// of ground, the lower one wide) or a rocky outcrop is raised, and the painted hill or rock of the area is laid over it
// (js/art_decor.js), so the ground rises and falls in painted shapes; under a way up through a ceiling an overhang of the
// area's rock hangs. Nothing is raised near doors, benches, stations, signs, people, pickups or machinery, on ice or under a
// low roof, so every way stays open.
(function hills() {
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; };
  for (const id of Object.keys(WORLD.rooms)) {
    const r = WORLD.rooms[id]; r.hills = [];
    if (r.arena || id === 'town') continue;
    const R = hash('hills_' + id), at = (x, y) => (x < 0 || y < 0 || x >= r.w || y >= r.h ? T_SOLID : r.t[y * r.w + x]);
    const busy = [].concat(r.doors, r.items, r.benches, r.stations, r.signs, r.npcs, r.mech, r.leverGates || []);
    const near = (x, y) => busy.some(q => Math.abs((q.x || 0) - x) < 8 && Math.abs((q.y || 0) - y) < 6);
    for (let y = 7; y < r.h - 1; y++) {
      let run = 0;
      for (let x = 1; x < r.w - 1; x++) {
        const flat = at(x, y + 1) === T_SOLID && !r.iceCells.has((y + 1) * r.w + x) && [0, 1, 2, 3, 4, 5, 6].every(k => at(x, y - k) === T_AIR);
        run = flat ? run + 1 : 0;
        if (run >= 16 && R() < 0.2) {
          const rock = R() < 0.35, w = rock ? 4 : 7 + Math.floor(R() * 3), x0 = x - run + 5 + Math.floor(R() * Math.max(1, run - w - 10));
          let ok = !near(x0 + w / 2, y);
          for (let i = x0 - 1; i <= x0 + w && ok; i++) if (at(i, y + 1) !== T_SOLID || at(i, y) !== T_AIR) ok = false;
          if (!ok) continue;
          if (rock) r.solid(x0, y - 1, w, 2); else { r.solid(x0, y, w, 1); r.solid(x0 + 2, y - 1, w - 4, 1); }
          r.hills.push({ k: rock ? 'rock' : 'hill', x: x0, y: y + 1, w });
          run = 0;
        }
      }
    }
    for (const d of r.doors) if (d.y === 0 && d.h === 1) r.hills.push({ k: 'over', x: d.x - 3, y: 0, w: d.w + 6 });
  }
})();
