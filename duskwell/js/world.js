'use strict';
// World data: rooms are built from tile rectangles. All coordinates are in tiles, y grows downward.
// Entities are placed by the tile their feet stand in (flyers by their centre tile).
const T_AIR = 0, T_SOLID = 1, T_ONEWAY = 2, T_HAZARD = 3, T_BREAK = 4, T_GATE = 5;

class RoomBuilder {
  constructor(id, w, h, opt) {
    this.id = id; this.w = w; this.h = h;
    this.area = opt.area; this.theme = opt.theme; this.map = opt.map;
    this.t = new Uint8Array(w * h);
    this.doors = []; this.enemies = []; this.items = []; this.npcs = []; this.benches = []; this.deco = [];
    this.signs = []; this.arena = null; this.start = null;
    this.solid(0, 0, w, 1); this.solid(0, h - 1, w, 1); this.solid(0, 0, 1, h); this.solid(w - 1, 0, 1, h);
  }
  fill(x, y, w, h, v) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.t[j * this.w + i] = v;
    }
    return this;
  }
  solid(x, y, w, h) { return this.fill(x, y, w, h, T_SOLID); }
  air(x, y, w, h) { return this.fill(x, y, w, h, T_AIR); }
  plat(x, y, w) { return this.fill(x, y, w, 1, T_ONEWAY); }
  hazard(x, y, w, h) { return this.fill(x, y, w, h || 1, T_HAZARD); }
  breakable(x, y, w, h) { return this.fill(x, y, w, h, T_BREAK); }
  door(id, x, y, w, h, to, toDoor) { this.doors.push({ id, x, y, w, h, to, toDoor }); return this; }
  enemy(type, x, y, o) { this.enemies.push(Object.assign({ type, x, y }, o || {})); return this; }
  item(id, x, y, kind, o) { this.items.push(Object.assign({ id, x, y, kind }, o || {})); return this; }
  npc(type, x, y) { this.npcs.push({ type, x, y }); return this; }
  bench(x, y) { this.benches.push({ x, y }); return this; }
  sign(x, y, text) { this.signs.push({ x, y, text }); return this; }
  decor(type, x, y, o) { this.deco.push(Object.assign({ type, x, y }, o || {})); return this; }
  at(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? T_SOLID : this.t[y * this.w + x]; }
  finish() {
    // doors are cut last so they always open the frame
    for (const d of this.doors) this.air(d.x, d.y, d.w, d.h);
    return this;
  }
}

const WORLD = { rooms: {}, startRoom: 'town', startPos: { x: 9, y: 17 } };
function room(id, w, h, opt) { const r = new RoomBuilder(id, w, h, opt); WORLD.rooms[id] = r; return r; }

(function buildWorld() {
  // ===================== HUSHVALE (hub) =====================
  const town = room('town', 64, 22, { area: 'hushvale', theme: 'town', map: { x: 0, y: 0 } });
  town.solid(0, 18, 64, 4);
  town.air(54, 18, 4, 4);
  town.door('well', 54, 21, 4, 1, 'cx1', 'top');
  town.decor('well', 54, 18, { w: 4 });
  town.decor('lamp', 12, 17).decor('lamp', 27, 17).decor('lamp', 46, 17).decor('lamp', 60, 17);
  town.decor('house', 4, 17, { w: 6, h: 5 }).decor('house', 20, 17, { w: 5, h: 4 }).decor('house', 48, 17, { w: 5, h: 6 });
  town.bench(31, 17);
  town.npc('elder', 17, 17).npc('merchant', 40, 17);
  town.sign(7, 17, 'sign_controls');
  town.plat(24, 14, 5).plat(34, 13, 4);

  // ===================== SUNKEN CROSSROADS =====================
  const cx1 = room('cx1', 40, 44, { area: 'crossroads', theme: 'cave', map: { x: 5, y: 3 } });
  cx1.solid(0, 40, 40, 4);
  cx1.solid(1, 9, 6, 3).solid(33, 15, 6, 3).solid(1, 22, 8, 3).solid(30, 30, 8, 3);
  cx1.plat(11, 13, 6).plat(24, 20, 7).plat(10, 30, 7);
  cx1.door('top', 16, 0, 4, 1, 'town', 'well');
  cx1.door('r', 39, 37, 1, 3, 'cx2', 'l');
  cx1.bench(5, 39);
  cx1.enemy('crawler', 2, 8).enemy('crawler', 14, 12).enemy('flyer', 22, 25).enemy('crawler', 34, 14)
    .enemy('crawler', 13, 29).enemy('crawler', 32, 29).enemy('flyer', 12, 18).enemy('crawler', 22, 39).enemy('crawler', 29, 39);

  const cx2 = room('cx2', 72, 24, { area: 'crossroads', theme: 'cave', map: { x: 10, y: 6 } });
  cx2.solid(0, 20, 72, 4);
  cx2.air(27, 20, 4, 4).hazard(27, 23, 4, 1);
  cx2.solid(34, 18, 2, 2).solid(36, 16, 10, 4).solid(46, 18, 2, 2);
  cx2.plat(3, 15, 7);                                  // needs double jump
  cx2.solid(50, 14, 8, 6).air(52, 17, 4, 3).breakable(50, 17, 2, 3);   // hidden cache
  cx2.door('l', 0, 17, 1, 3, 'cx1', 'r');
  cx2.door('r', 71, 17, 1, 3, 'cx3', 'l');
  cx2.bench(68, 19);
  cx2.item('seed_cx2', 6, 14, 'seed');
  cx2.item('cache_cx2', 53, 19, 'cache', { amount: 60 });
  cx2.enemy('crawler', 10, 19).enemy('crawler', 20, 19).enemy('crawler', 40, 15).enemy('flyer', 30, 10)
    .enemy('flyer', 58, 9).enemy('sentinel', 62, 19).enemy('crawler', 14, 19);
  cx2.decor('pillar', 12, 19, { h: 12 }).decor('pillar', 48, 19, { h: 10 });

  const cx3 = room('cx3', 40, 22, { area: 'crossroads', theme: 'cave', map: { x: 19, y: 6 } });
  cx3.solid(0, 18, 40, 4);
  cx3.plat(5, 15, 5).plat(30, 15, 5);
  cx3.door('l', 0, 15, 1, 3, 'cx2', 'r');
  cx3.door('r', 39, 15, 1, 3, 'mg1', 'l');
  cx3.arena = {
    boss: 'guardian', flag: 'boss_guardian', trigger: 9, spawn: { x: 30, y: 17 },
    gates: [{ x: 0, y: 15, w: 1, h: 3, close: 'start' }, { x: 39, y: 15, w: 1, h: 3, close: 'always' }],
    reward: { id: 'ability_dash', kind: 'ability', ability: 'dash', x: 20, y: 16 },
  };
  cx3.decor('pillar', 6, 17, { h: 14 }).decor('pillar', 34, 17, { h: 14 });

  // ===================== MOSSGROVE =====================
  const mg1 = room('mg1', 72, 24, { area: 'mossgrove', theme: 'moss', map: { x: 24, y: 6 } });
  mg1.solid(0, 20, 72, 4);
  mg1.air(26, 20, 7, 4).hazard(26, 23, 7, 1);                 // dash gap
  mg1.solid(16, 17, 4, 3);
  mg1.hazard(8, 19, 2, 1);
  mg1.solid(46, 1, 3, 16).solid(53, 1, 3, 16);                // claw shaft
  mg1.air(46, 2, 3, 3);                                       // seed alcove
  mg1.door('l', 0, 17, 1, 3, 'cx3', 'r');
  mg1.door('r', 71, 17, 1, 3, 'mg2', 'l');
  mg1.bench(4, 19);
  mg1.item('seed_mg1', 47, 4, 'seed');
  mg1.enemy('hopper', 12, 19).enemy('hopper', 22, 19).enemy('spitter', 18, 16).enemy('crawler', 38, 19)
    .enemy('crawler', 42, 19).enemy('flyer', 40, 10).enemy('hopper', 60, 19).enemy('hopper', 66, 19).enemy('flyer', 62, 11);

  const mg2 = room('mg2', 36, 40, { area: 'mossgrove', theme: 'moss', map: { x: 33, y: 4 } });
  mg2.solid(0, 37, 36, 3);
  mg2.plat(3, 34, 7).plat(8, 31, 6).plat(13, 28, 6).plat(18, 25, 6).plat(23, 22, 6).plat(28, 19, 6)
    .plat(23, 16, 6).plat(18, 13, 6).plat(13, 10, 6).plat(8, 7, 6).plat(9, 4, 26);
  mg2.solid(1, 26, 4, 2).solid(31, 29, 4, 2).solid(1, 14, 3, 2);
  mg2.door('l', 0, 34, 1, 3, 'mg1', 'r');
  mg2.door('r', 35, 1, 1, 3, 'mg3', 'l');
  mg2.bench(30, 3);
  mg2.enemy('hopper', 11, 30).enemy('crawler', 15, 27).enemy('flyer', 20, 18).enemy('hopper', 25, 21)
    .enemy('spitter', 32, 28).enemy('crawler', 24, 15).enemy('flyer', 10, 8).enemy('hopper', 18, 12).enemy('spitter', 2, 25);

  const mg3 = room('mg3', 40, 22, { area: 'mossgrove', theme: 'moss', map: { x: 38, y: 2 } });
  mg3.solid(0, 18, 40, 4);
  mg3.plat(5, 15, 5).plat(30, 15, 5);
  mg3.door('l', 0, 15, 1, 3, 'mg2', 'r');
  mg3.door('r', 39, 15, 1, 3, 'cs1', 'l');
  mg3.arena = {
    boss: 'weaver', flag: 'boss_weaver', trigger: 9, spawn: { x: 30, y: 17 },
    gates: [{ x: 0, y: 15, w: 1, h: 3, close: 'start' }, { x: 39, y: 15, w: 1, h: 3, close: 'always' }],
    reward: { id: 'ability_wall', kind: 'ability', ability: 'wall', x: 20, y: 16 },
  };

  // ===================== CRYSTAL SPIRES =====================
  const cs1 = room('cs1', 30, 44, { area: 'crystal', theme: 'crystal', map: { x: 43, y: -1 } });
  cs1.solid(0, 41, 30, 3);
  cs1.solid(1, 6, 10, 32);
  cs1.solid(15, 6, 14, 35);
  cs1.hazard(11, 30, 1, 2).hazard(14, 22, 1, 2).hazard(11, 14, 1, 2);
  cs1.door('l', 0, 38, 1, 3, 'mg3', 'r');
  cs1.door('r', 29, 3, 1, 3, 'cs2', 'l');
  cs1.bench(4, 40);
  cs1.enemy('flyer', 12, 24).enemy('flyer', 13, 10).enemy('shard', 10, 5).enemy('crawler', 7, 40);

  const cs2 = room('cs2', 72, 26, { area: 'crystal', theme: 'crystal', map: { x: 47, y: -3 } });
  cs2.solid(0, 23, 72, 3);
  cs2.air(20, 23, 7, 3).hazard(20, 25, 7, 1);
  cs2.solid(30, 8, 2, 15).air(30, 19, 2, 4);
  cs2.solid(36, 8, 2, 15);
  cs2.air(52, 23, 7, 3).hazard(52, 25, 7, 1);
  cs2.plat(41, 17, 5);
  cs2.door('l', 0, 20, 1, 3, 'cs1', 'r');
  cs2.door('r', 71, 20, 1, 3, 'cs3', 'l');
  cs2.bench(67, 22);
  cs2.enemy('shard', 10, 22).enemy('flyer', 14, 12).enemy('flyer', 33, 4).enemy('shard', 42, 22).enemy('shard', 47, 22)
    .enemy('flyer', 48, 12).enemy('crawler', 40, 22).enemy('flyer', 62, 14).enemy('shard', 64, 22).enemy('crawler', 16, 22);

  const cs3 = room('cs3', 40, 24, { area: 'crystal', theme: 'crystal', map: { x: 56, y: -3 } });
  cs3.solid(0, 20, 40, 4);
  cs3.plat(5, 17, 5).plat(30, 17, 5);
  cs3.door('l', 0, 17, 1, 3, 'cs2', 'r');
  cs3.door('r', 39, 17, 1, 3, 'ht1', 'l');
  cs3.arena = {
    boss: 'wraith', flag: 'boss_wraith', trigger: 9, spawn: { x: 28, y: 9 },
    gates: [{ x: 0, y: 17, w: 1, h: 3, close: 'start' }, { x: 39, y: 17, w: 1, h: 3, close: 'always' }],
    reward: { id: 'ability_double', kind: 'ability', ability: 'double', x: 20, y: 18 },
  };

  // ===================== HOLLOW THRONE =====================
  const ht1 = room('ht1', 80, 30, { area: 'throne', theme: 'throne', map: { x: 61, y: -4 } });
  ht1.solid(0, 27, 80, 3);
  ht1.solid(9, 22, 3, 5);                                     // five tiles high: double jump
  ht1.plat(3, 17, 5);
  ht1.solid(21, 22, 4, 5);
  ht1.air(25, 27, 9, 3).hazard(25, 29, 9, 1);
  ht1.solid(34, 22, 4, 5);
  ht1.air(62, 27, 6, 3).hazard(62, 29, 6, 1);
  ht1.door('l', 0, 24, 1, 3, 'cs3', 'r');
  ht1.door('r', 79, 24, 1, 3, 'ht2', 'l');
  ht1.bench(4, 26).bench(74, 26);
  ht1.item('seed_ht1', 5, 16, 'seed');
  ht1.enemy('sentinel', 16, 26).enemy('flyer', 14, 14).enemy('sentinel', 44, 26).enemy('sentinel', 52, 26)
    .enemy('shard', 57, 26).enemy('flyer', 48, 14).enemy('flyer', 60, 12).enemy('shard', 70, 26);
  ht1.decor('pillar', 16, 26, { h: 20 }).decor('pillar', 48, 26, { h: 20 }).decor('pillar', 72, 26, { h: 20 });

  const ht2 = room('ht2', 44, 26, { area: 'throne', theme: 'throne', map: { x: 71, y: -4 } });
  ht2.solid(0, 23, 44, 3);
  ht2.plat(5, 20, 5).plat(34, 20, 5).plat(12, 17, 5).plat(27, 17, 5);
  ht2.door('l', 0, 20, 1, 3, 'ht1', 'r');
  ht2.arena = {
    boss: 'king', flag: 'boss_king', trigger: 9, spawn: { x: 32, y: 22 },
    gates: [{ x: 0, y: 20, w: 1, h: 3, close: 'start' }],
    reward: null, ending: true,
  };
  ht2.decor('pillar', 8, 22, { h: 18 }).decor('pillar', 36, 22, { h: 18 });

  WORLD.order = Object.keys(WORLD.rooms);
  for (const id of WORLD.order) WORLD.rooms[id].finish();
})();
