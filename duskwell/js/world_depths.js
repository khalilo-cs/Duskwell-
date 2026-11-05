'use strict';
// The Depths of every area: under the biggest room of each area a shaft drops into a wide maze of chambers (8 by 6 of them),
// carved the same way every time from the area's name. Its passages loop; some ways are hidden behind breakable walls, a few
// floors carry spikes (or lava and acid where the area has them), and in the farthest chamber a treasure waits behind a gate that
// a lever in another far chamber opens. The area's own creatures roam it; the way back up is a ladder of ledges under the shaft.
(function build() {
  const CW = 12, CH = 8, NX = 8, NY = 6, W = NX * CW + 2, H = NY * CH + 2;
  function rng(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; }
  function findHole(host) {
    const at = (x, y) => host.t[y * host.w + x];
    const busy = [].concat(host.doors, host.items, host.benches, host.stations, host.npcs, host.signs, host.mech);
    let hole = null;
    for (let x = Math.floor(host.w * 0.55); x < host.w - 5 && !hole; x++) for (let k = 0; k < 2 && !hole; k++) {
      const xx = k ? host.w - x : x;
      let y = host.h - 1; while (y > 1 && at(xx, y) === T_SOLID) y--; y++;          // the lowest floor of this column
      if (y >= host.h - 1 || y < 4) continue;
      let ok = true;
      for (let i = 0; i < 3; i++) { for (let j = y; j < host.h; j++) if (at(xx + i, j) !== T_SOLID) ok = false; if (at(xx + i, y - 1) !== T_AIR) ok = false; }
      if (!ok || busy.some(q => Math.abs((q.x || 0) - xx) < 6)) continue;
      hole = { x: xx, y };
    }
    return hole;
  }
  const areas = {};
  for (const id of Object.keys(WORLD.rooms)) { const r = WORLD.rooms[id]; if (!r.area || r.arena) continue; (areas[r.area] = areas[r.area] || []).push(r); }
  for (const area of Object.keys(areas)) {
    const rooms = areas[area], R = rng('depths_' + area);
    // the host: the biggest room of the area with a stretch of thick floor clear of doors and things
    let host = null, hole = null;
    for (const cand of rooms.slice().sort((p, q) => q.w * q.h - p.w * p.h).filter(q => q.w >= 30 && q.h >= 14)) {
      host = cand; hole = findHole(cand); if (hole) break;
    }
    if (!hole) continue;
    const id = 'deep_' + area;
    host.air(hole.x, hole.y, 3, host.h - hole.y).door('deep', hole.x, host.h - 1, 3, 1, id, 'top');

    // the maze: a spanning tree of the chambers (depth first), then a few more ways to make loops
    const r = room(id, W, H, { area, theme: host.theme, bg: host.bg, map: host.map });
    r.solid(0, 0, W, H);
    const cell = (cx, cy) => [1 + cx * CW, 1 + cy * CH];
    for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) { const [x0, y0] = cell(cx, cy); r.air(x0, y0, CW - 2, CH - 2); }
    const seen = new Set(), depth = {}, links = [];
    const startX = Math.min(NX - 1, Math.floor((hole.x / host.w) * NX));
    const stack = [[startX, 0]]; seen.add(startX + ',0'); depth[startX + ',0'] = 0;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < NX && b < NY && !seen.has(a + ',' + b));
      if (!nb.length) { stack.pop(); continue; }
      const [a, b] = nb[Math.floor(R() * nb.length)];
      seen.add(a + ',' + b); depth[a + ',' + b] = depth[cx + ',' + cy] + 1; links.push([cx, cy, a, b, false]); stack.push([a, b]);
    }
    for (let i = 0; i < 9; i++) {                                                   // loops, some of them behind walls that break
      const cx = Math.floor(R() * (NX - 1)), cy = Math.floor(R() * NY);
      if (!links.some(l => (l[0] === cx && l[1] === cy && l[2] === cx + 1 && l[3] === cy) || (l[2] === cx && l[3] === cy && l[0] === cx + 1 && l[1] === cy))) links.push([cx, cy, cx + 1, cy, R() < 0.5]);
    }
    for (const [ax, ay, bx, by, secret] of links) {
      const lx = Math.min(ax, bx), ly = Math.min(ay, by), [x0, y0] = cell(lx, ly);
      if (ay === by) {                                                               // side by side: an opening in the wall, at floor level
        if (secret) r.breakable(x0 + CW - 2, y0 + 2, 2, 4); else r.air(x0 + CW - 2, y0 + 2, 2, 4);
      } else {                                                                       // one above the other: a hole in the floor, ledges to climb
        const sx = x0 + 4; r.air(sx, y0 + CH - 2, 3, 2);
        r.plat(sx, y0 + CH - 2, 3).plat(sx, y0 + CH + 1, 3).plat(sx, y0 + CH + 4, 3);
      }
    }
    // the way in: the shaft from the room above, with ledges back up to it
    const [ex] = cell(startX, 0), dx = ex + 4;
    r.air(dx, 0, 3, 2).plat(dx, 2, 3).plat(dx, 4, 3).door('top', dx, 0, 3, 1, host.id, 'deep');
    // the farthest chamber holds the treasure behind a gate; the lever is in the second farthest
    const far = Object.keys(depth).sort((a, b) => depth[b] - depth[a]);
    const [tx, ty] = far[0].split(',').map(Number), [lx2, ly2] = far[Math.min(3, far.length - 1)].split(',').map(Number);
    const [t0x, t0y] = cell(tx, ty), [l0x, l0y] = cell(lx2, ly2);
    r.solid(t0x + 4, t0y + 1, 5, 5).air(t0x + 5, t0y + 3, 3, 3);              // a small vault, its door a gate
    r.item('cache_' + id, t0x + 6, t0y + 5, 'cache', { amount: 150 });
    r.lever(id, l0x + 5, l0y + 5, [{ x: t0x + 4, y: t0y + 3, w: 1, h: 3 }]);
    if (far.length > 6) {                                          // a second vault, its lever elsewhere
      const [ux, uy] = far[2].split(',').map(Number), [vx, vy] = far[5].split(',').map(Number), [u0x, u0y] = cell(ux, uy), [v0x, v0y] = cell(vx, vy);
      r.solid(u0x + 4, u0y + 1, 5, 5).air(u0x + 5, u0y + 3, 3, 3);
      r.item('cache2_' + id, u0x + 6, u0y + 5, 'cache', { amount: 90 });
      r.lever(id + '_b', v0x + 2, v0y + 5, [{ x: u0x + 4, y: u0y + 3, w: 1, h: 3 }]);
    }
    // hazards on some floors, the area's own creatures in some chambers
    const kinds = [...new Set(rooms.flatMap(q => q.enemies.map(e => e.type)))].filter(k => typeof ENEMY_TYPES === 'undefined' || ENEMY_TYPES[k]);
    const liquid = /ember|aqueduct|spore|mirror/.test(host.theme);
    for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) {
      if ((cx === tx && cy === ty) || (cx === lx2 && cy === ly2) || (cx === startX && cy === 0)) continue;
      const [x0, y0] = cell(cx, cy), v = R();
      if (v >= 0.22 && v < 0.34 && cx > 0 && cx < NX - 1) {                     // a pit of spikes under a bridge that crumbles
        r.air(x0 + 3, y0 + CH - 2, 4, 2).hazard(x0 + 3, y0 + CH - 1, 4, 1).crumble(x0 + 3, y0 + CH - 2, 4);
      } else if (v >= 0.34 && v < 0.42 && /spore|moss/.test(host.theme)) r.bounce(x0 + 6, y0 + CH - 3, 2);   // a springing cap
      if (v < 0.22) { if (liquid && R() < 0.5) r.lava(x0 + 6, y0 + CH - 2, 3, 1); else r.hazard(x0 + 6, y0 + CH - 3, 3, 1); }
      if (kinds.length && R() < 0.42) r.enemy(kinds[Math.floor(R() * kinds.length)], x0 + 2 + Math.floor(R() * 3), y0 + CH - 3);
    }
  }
})();
