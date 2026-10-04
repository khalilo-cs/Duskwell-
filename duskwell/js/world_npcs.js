'use strict';
// Merchants and wizards standing in rooms all over the world. A person is set on a flat piece of floor that is clear
// overhead, away from doors, benches, pickups and enemies, as near to a chosen share of the room's width as one can be found.
(function place() {
  // free standing spots of a room: the tile above a three-wide floor with four tiles of air over it
  function spots(r) {
    const bad = [];
    for (const d of r.doors) bad.push([d.x - 3, d.y - 3, d.w + 6, d.h + 6]);
    for (const q of [].concat(r.benches, r.stations, r.signs, r.npcs, r.items, r.mech)) bad.push([q.x - 3, q.y - 5, 7, 7]);
    const at = (x, y) => r.t[y * r.w + x], out = [];
    for (let x = 4; x < r.w - 4; x++) for (let y = 4; y < r.h - 1; y++) {
      let ok = true;
      for (let i = -1; i <= 1 && ok; i++) {
        if (at(x + i, y + 1) !== T_SOLID) ok = false;
        for (let j = 0; j <= 3 && ok; j++) if (at(x + i, y - j) !== T_AIR) ok = false;
      }
      if (!ok || bad.some(b => x > b[0] && x < b[0] + b[2] && y > b[1] && y < b[1] + b[3])) continue;
      if (r.enemies.some(e => Math.abs(e.x - x) < 5 && Math.abs(e.y - y) < 4)) continue;
      out.push({ x, y });
    }
    return out;
  }
  // put a person of the given type in the room, on its lowest floor (the one the way runs along), as near as possible to the
  // bench if there is one, else to share f of the room's width
  function put(id, type, f, shop) {
    const r = WORLD.rooms[id]; if (!r) return;
    let list = spots(r); if (!list.length) return;
    const low = Math.max(...list.map(s => s.y)); list = list.filter(s => s.y >= low - 2);
    const want = r.benches.length ? r.benches[0].x : r.w * f;
    list.sort((a, b) => Math.abs(a.x - want) - Math.abs(b.x - want));
    r.npc(type, list[0].x, list[0].y, shop);
  }
  // the strange merchant (the town's stock, so the geo bought there can be spent on the road) beside benches in thirteen rooms
  for (const [id, f] of [['cx1', 0.35], ['mg2', 0.5], ['sp2', 0.5], ['mg5', 0.5], ['cs1', 0.5], ['wd1', 0.5], ['fd2', 0.5], ['ht3', 0.5], ['fr3', 0.5], ['em7', 0.45],
    ['mv3', 0.4], ['os3', 0.4], ['lo3', 0.4]]) put(id, 'merchant', f, 'general');
  // the wizard in six quiet rooms, one in every second area from the crossroads on
  for (const [id, f] of [['cx3', 0.6], ['sp4', 0.6], ['aq4', 0.55], ['fr8', 0.55], ['mv4', 0.55], ['lo4', 0.55]]) put(id, 'wizard', f, 'wizard');
})();
