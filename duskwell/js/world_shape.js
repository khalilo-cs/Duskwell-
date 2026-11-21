'use strict';
// Rooms that are not boxes: the long flat ceilings and the straight side walls of every room are broken into jagged shapes,
// worked out once from each room's id. A ceiling steps down and up in teeth and hanging rock (one to three tiles), a side wall
// juts out and falls back in ledges, so each room's outline zigzags and no two rooms have the same shape. Only flat stretches
// are touched (a way up or out through a ceiling or a wall is never closed), always with open air under and beside what is added,
// and never near doors, benches, stations, signs, people, pickups, creatures, machinery, winds or the boss halls.
(function shape() {
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; };
  for (const id of Object.keys(WORLD.rooms)) {
    const r = WORLD.rooms[id];
    if (r.arena || id === 'town' || r.w < 14 || r.h < 12) continue;
    const R = hash('shape_' + id), at = (x, y) => (x < 0 || y < 0 || x >= r.w || y >= r.h ? T_SOLID : r.t[y * r.w + x]);
    const busy = [].concat(r.doors, r.items, r.benches, r.stations, r.signs, r.npcs, r.enemies, r.mech, r.leverGates || [],
      r.mech.filter(m => m.to).map(m => m.to), r.start ? [r.start] : []);
    const zones = [].concat(r.winds, r.gravs);
    const free = (x, y, pad) => !busy.some(q => Math.abs((q.x || 0) + (q.w || 0) / 2 - x) < pad + (q.w || 0) / 2 && Math.abs((q.y || 0) + (q.h || 0) / 2 - y) < pad + (q.h || 0) / 2)
      && !zones.some(z => x >= z.x - 2 && x <= z.x + z.w + 2 && y >= z.y - 2 && y <= z.y + z.h + 2);
    const airRun = (x, y0, n, dx, dy) => { for (let k = 0; k < n; k++) if (at(x + dx * k, y0 + dy * k) !== T_AIR) return false; return true; };
    // the ceiling: the first air from the top in each column
    const top = []; for (let x = 0; x < r.w; x++) { let y = 0; while (y < r.h - 1 && at(x, y) !== T_AIR) y++; top.push(y); }
    let x = 2;
    while (x < r.w - 2) {
      let e = x; while (e + 1 < r.w - 1 && top[e + 1] === top[x]) e++;                // a flat stretch of ceiling, x..e
      if (e - x + 1 >= 10) {
        const y0 = top[x]; let d = 0;
        for (let i = x + 2; i <= e - 2; i++) {
          if (R() < 0.45) d = Math.max(0, Math.min(3, d + (R() < 0.5 ? -1 : 1) * (R() < 0.3 ? 2 : 1)));   // the teeth: a walk up and down
          if (i === x + 2 || i === e - 2) d = Math.min(d, 1);
          if (!d || !free(i, y0 + 1, 6) || !airRun(i, y0, d + 7, 0, 1)) continue;
          r.solid(i, y0, 1, d); r.shaped = (r.shaped || 0) + d;
        }
      }
      x = e + 1;
    }
    // the side walls: the first air from each side in each row, broken into ledges and hollows
    for (const side of [1, -1]) {
      const edge = []; for (let y = 0; y < r.h; y++) { let x = side > 0 ? 0 : r.w - 1; while (x > 0 && x < r.w - 1 && at(x, y) !== T_AIR) x += side; edge.push(x); }
      let y = 2;
      while (y < r.h - 2) {
        let e = y; while (e + 1 < r.h - 1 && edge[e + 1] === edge[y]) e++;
        if (e - y + 1 >= 8) {
          const x0 = edge[y]; let d = 0;
          for (let j = y + 2; j <= e - 3; j++) {
            if (R() < 0.4) d = Math.max(0, Math.min(2, d + (R() < 0.5 ? -1 : 1)));
            if (!d || !free(x0 + side, j, 5) || !airRun(x0, j, d + 6, side, 0) || at(x0, j + 1) !== T_AIR && at(x0, j + 1) !== T_SOLID) continue;
            r.solid(side > 0 ? x0 : x0 - d + 1, j, d, 1); r.shaped = (r.shaped || 0) + d;
          }
        }
        y = e + 1;
      }
    }
  }
})();
