'use strict';
// World data: rooms are built from tile rectangles. All coordinates are in tiles, y grows downward.
// Entities are placed by the tile their feet stand in (flyers by their centre tile).
const T_AIR = 0, T_SOLID = 1, T_ONEWAY = 2, T_HAZARD = 3, T_BREAK = 4, T_GATE = 5, T_BOUNCE = 6, T_CRACK = 7, T_ACID = 8, T_CRUMBLE = 9;
// bosses whose seals open the throne gate
const SEAL_FLAGS = ['boss_guardian', 'boss_spore', 'boss_weaver', 'boss_drowned', 'boss_wraith', 'boss_brood'];

class RoomBuilder {
  constructor(id, w, h, opt) {
    this.id = id; this.w = w; this.h = h;
    this.area = opt.area; this.theme = opt.theme; this.map = opt.map;
    this.t = new Uint8Array(w * h);
    this.doors = []; this.enemies = []; this.items = []; this.npcs = []; this.benches = []; this.deco = []; this.stations = [];
    this.signs = []; this.arena = null; this.start = null; this.sealGate = null; this.mech = []; this.leverGates = [];
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
  bounce(x, y, w) { return this.fill(x, y, w, 1, T_BOUNCE); }          // mushroom cap: launches the player
  crack(x, y, w, h) { return this.fill(x, y, w, h || 1, T_CRACK); }    // only a dive breaks it
  acid(x, y, w, h) { return this.fill(x, y, w, h || 1, T_ACID); }
  crumble(x, y, w) { return this.fill(x, y, w, 1, T_CRUMBLE); }          // gives way soon after it is stood on
  // machinery (see mechanics.js): coordinates in tiles; saws are placed by their centre
  mover(x, y, w, tx, ty, o) { this.mech.push(Object.assign({ type: 'mover', x, y, w, to: { x: tx, y: ty } }, o || {})); return this; }
  saw(x, y, o) { this.mech.push(Object.assign({ type: 'saw', x, y }, o || {})); return this; }
  drip(x, y, o) { this.mech.push(Object.assign({ type: 'drip', x, y }, o || {})); return this; }
  lever(id, x, y, gates) { this.mech.push({ type: 'lever', id, x, y, gates }); this.leverGates.push(...gates); return this; }
  door(id, x, y, w, h, to, toDoor) { this.doors.push({ id, x, y, w, h, to, toDoor }); return this; }
  enemy(type, x, y, o) { this.enemies.push(Object.assign({ type, x, y }, o || {})); return this; }
  item(id, x, y, kind, o) { this.items.push(Object.assign({ id, x, y, kind }, o || {})); return this; }
  npc(type, x, y) { this.npcs.push({ type, x, y }); return this; }
  bench(x, y) { this.benches.push({ x, y }); return this; }
  station(x, y) { this.stations.push({ x, y }); return this; }          // lantern station: fast travel between lit stations
  sign(x, y, text) { this.signs.push({ x, y, text }); return this; }
  decor(type, x, y, o) { this.deco.push(Object.assign({ type, x, y }, o || {})); return this; }
  at(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? T_SOLID : this.t[y * this.w + x]; }
  finish() {
    // doors are cut last so they always open the frame
    for (const d of this.doors) this.air(d.x, d.y, d.w, d.h);
    // lever gates may stand in a doorway, so they go in after the doors are cut
    for (const gt of this.leverGates) this.fill(gt.x, gt.y, gt.w, gt.h, T_GATE);
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
  cx2.air(64, 20, 3, 4).door('down', 64, 23, 3, 1, 'cx4', 'top');         // shaft down to the fork
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
  mg2.plat(5, 29, 4);                                                        // step up to the west door
  mg2.door('w', 0, 23, 1, 3, 'mg4', 'e');
  mg2.door('l', 0, 34, 1, 3, 'mg1', 'r');
  mg2.door('r', 35, 1, 1, 3, 'mg3', 'l');
  mg2.bench(30, 3);
  mg2.enemy('hopper', 11, 30).enemy('crawler', 15, 27).enemy('flyer', 20, 18).enemy('hopper', 25, 21)
    .enemy('spitter', 32, 28).enemy('crawler', 24, 15).enemy('flyer', 10, 8).enemy('hopper', 18, 12).enemy('jelly', 7, 19);

  const mg3 = room('mg3', 40, 22, { area: 'mossgrove', theme: 'moss', map: { x: 38, y: 2 } });
  mg3.solid(0, 18, 40, 4);
  mg3.plat(5, 15, 5).plat(30, 15, 5);
  mg3.door('l', 0, 15, 1, 3, 'mg2', 'r');
  mg3.door('r', 39, 15, 1, 3, 'cs1', 'l');
  mg3.arena = {
    boss: 'weaver', flag: 'boss_weaver', trigger: 9, spawn: { x: 30, y: 17 },
    gates: [{ x: 0, y: 15, w: 1, h: 3, close: 'start' }, { x: 39, y: 15, w: 1, h: 3, close: 'always' }],
    reward: { id: 'ability_wall', kind: 'ability', ability: 'wall', x: 20, y: 16 },
    reward2: { id: 'charm_siphon', kind: 'charm', charm: 'siphon', x: 23, y: 17 },
  };

  // ===================== CRYSTAL SPIRES =====================
  const cs1 = room('cs1', 30, 44, { area: 'crystal', theme: 'crystal', map: { x: 43, y: -1 } });
  cs1.solid(0, 41, 30, 3);
  cs1.solid(1, 6, 10, 32);
  cs1.solid(15, 6, 14, 35);
  cs1.hazard(11, 30, 1, 2).hazard(14, 22, 1, 2).hazard(11, 14, 1, 2);
  cs1.door('l', 0, 38, 1, 3, 'mg3', 'r');
  cs1.door('r', 29, 3, 1, 3, 'cs2', 'l');
  cs1.door('w', 0, 3, 1, 3, 'cs4', 'e');
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
  ht1.door('r', 79, 24, 1, 3, 'ht3', 'l');
  ht1.bench(4, 26).bench(74, 26);
  ht1.item('seed_ht1', 5, 16, 'seed');
  ht1.enemy('sentinel', 16, 26).enemy('flyer', 14, 14).enemy('sentinel', 44, 26).enemy('sentinel', 52, 26)
    .enemy('shard', 57, 26).enemy('flyer', 48, 14).enemy('flyer', 60, 12).enemy('shard', 70, 26);
  ht1.decor('pillar', 16, 26, { h: 20 }).decor('pillar', 48, 26, { h: 20 }).decor('pillar', 72, 26, { h: 20 });

  const ht2 = room('ht2', 44, 26, { area: 'throne', theme: 'throne', map: { x: 76, y: -4 } });
  ht2.solid(0, 23, 44, 3);
  ht2.plat(5, 20, 5).plat(34, 20, 5).plat(12, 17, 5).plat(27, 17, 5);
  ht2.door('l', 0, 20, 1, 3, 'ht3', 'r');
  ht2.arena = {
    boss: 'king', flag: 'boss_king', trigger: 9, spawn: { x: 32, y: 22 },
    gates: [{ x: 0, y: 20, w: 1, h: 3, close: 'start' }],
    reward: null, ending: true,
  };
  ht2.decor('pillar', 8, 22, { h: 18 }).decor('pillar', 36, 22, { h: 18 });


  // ===================== CROSSROADS: the fork and the side hall =====================
  const cx4 = room('cx4', 44, 34, { area: 'crossroads', theme: 'cave', map: { x: 15, y: 9 } });
  cx4.solid(0, 31, 44, 3);
  cx4.plat(4, 28, 6).plat(9, 25, 6).plat(4, 22, 6).plat(9, 19, 6).plat(4, 16, 6).plat(9, 13, 6).plat(14, 10, 5).plat(17, 7, 4).plat(19, 4, 5);
  cx4.solid(28, 24, 6, 2).solid(35, 17, 7, 2);
  cx4.door('top', 20, 0, 3, 1, 'cx2', 'down');
  cx4.door('w', 0, 28, 1, 3, 'cx5', 'e');
  cx4.door('e', 43, 28, 1, 3, 'sp1', 'w');
  cx4.sign(40, 30, 'sign_spore');
  cx4.enemy('crawler', 6, 27).enemy('crawler', 11, 18).enemy('diver', 30, 12).enemy('diver', 24, 20).enemy('spider', 32, 5).enemy('crawler', 36, 30).enemy('crawler', 38, 16);
  cx4.decor('light', 38, 14, { r: 200 });

  const cx5 = room('cx5', 48, 20, { area: 'crossroads', theme: 'cave', map: { x: 9, y: 11 } });
  cx5.solid(0, 17, 48, 3);
  cx5.solid(10, 12, 3, 5);                                    // five tiles high: double jump
  cx5.solid(1, 10, 6, 7).air(1, 14, 5, 3).breakable(6, 14, 1, 3);
  cx5.solid(22, 1, 6, 9).solid(34, 1, 5, 11);
  cx5.door('e', 47, 14, 1, 3, 'cx4', 'w');
  cx5.door('w', 0, 14, 1, 3, 'fd1', 'e');                    // behind the breakable wall: the Rustworks
  cx5.item('seed_cx5', 11, 11, 'seed');
  cx5.item('cache_cx5', 3, 16, 'cache', { amount: 80 });
  cx5.enemy('sentinel', 18, 16).enemy('sentinel', 32, 16).enemy('diver', 26, 13).enemy('diver', 40, 6).enemy('crawler', 42, 16);

  // ===================== SPORE HOLLOWS =====================
  const sp1 = room('sp1', 64, 26, { area: 'spore', theme: 'spore', map: { x: 21, y: 12 } });
  sp1.solid(0, 23, 64, 3);
  sp1.bounce(11, 21, 3);
  sp1.solid(16, 15, 4, 8);                                    // wall only a mushroom can clear
  sp1.air(26, 23, 6, 2).acid(26, 24, 6, 1).bounce(28, 22, 2);
  sp1.bounce(38, 20, 2).plat(40, 14, 6);
  sp1.door('w', 0, 20, 1, 3, 'cx4', 'e');
  sp1.door('e', 63, 20, 1, 3, 'sp2', 'w');
  sp1.bench(4, 22);
  sp1.sign(8, 22, 'sign_spore');
  sp1.item('cache_sp1', 42, 13, 'cache', { amount: 70 });
  sp1.enemy('shroom', 23, 22).enemy('shroom', 36, 22).enemy('shroom', 52, 22).enemy('diver', 46, 9).enemy('diver', 57, 12).enemy('jelly', 30, 14);
  sp1.decor('light', 29, 18, { r: 180 }).decor('light', 50, 16, { r: 200 });

  const sp2 = room('sp2', 34, 44, { area: 'spore', theme: 'spore', map: { x: 29, y: 10 } });
  sp2.solid(0, 41, 34, 3);
  sp2.bounce(6, 39, 3).plat(10, 33, 5).bounce(17, 32, 3).plat(21, 26, 5).bounce(26, 25, 3).plat(20, 19, 5).bounce(15, 18, 3).plat(9, 12, 5).bounce(14, 11, 3);
  sp2.solid(20, 6, 13, 1);
  sp2.door('w', 0, 38, 1, 3, 'sp1', 'e');
  sp2.door('e', 33, 3, 1, 3, 'sp3', 'w');
  sp2.bench(27, 5);
  sp2.enemy('diver', 24, 34).enemy('shroom', 23, 25).enemy('diver', 8, 22).enemy('shroom', 11, 11).enemy('jelly', 26, 12);

  const sp3 = room('sp3', 60, 24, { area: 'spore', theme: 'spore', map: { x: 34, y: 11 } });
  sp3.solid(0, 22, 60, 2);
  sp3.acid(14, 22, 32, 1);
  sp3.bounce(16, 20, 2).bounce(22, 19, 2).bounce(28, 19, 2).bounce(34, 19, 2).bounce(40, 19, 2);
  sp3.door('w', 0, 19, 1, 3, 'sp2', 'e');
  sp3.door('e', 59, 19, 1, 3, 'sp4', 'w');
  sp3.bench(52, 21);
  sp3.sign(8, 21, 'sign_acid');
  sp3.enemy('diver', 25, 9).enemy('diver', 38, 7).enemy('shroom', 49, 21).enemy('jelly', 31, 12);
  sp3.decor('light', 30, 16, { r: 260, c: '#9dff6a' });

  const sp4 = room('sp4', 40, 22, { area: 'spore', theme: 'spore', map: { x: 42, y: 11 } });
  sp4.solid(0, 18, 40, 4);
  sp4.plat(5, 15, 5).plat(30, 15, 5);
  sp4.door('w', 0, 15, 1, 3, 'sp3', 'e');
  sp4.arena = {
    boss: 'spore', flag: 'boss_spore', trigger: 9, spawn: { x: 28, y: 17 },
    gates: [{ x: 0, y: 15, w: 1, h: 3, close: 'start' }],
    reward: { id: 'ability_dive', kind: 'ability', ability: 'dive', x: 20, y: 16 },
  };

  // ===================== MOSSGROVE: the lake =====================
  const mg4 = room('mg4', 64, 26, { area: 'mossgrove', theme: 'moss', map: { x: 25, y: 2 } });
  mg4.solid(0, 24, 64, 2);
  mg4.acid(20, 24, 26, 1);
  mg4.plat(21, 21, 3).plat(27, 19, 3).plat(33, 21, 3).plat(39, 21, 3).plat(44, 22, 2);
  mg4.solid(8, 6, 2, 15).solid(14, 6, 2, 15).solid(1, 6, 7, 1);           // claw shaft up to the west exit
  mg4.door('e', 63, 21, 1, 3, 'mg2', 'w');
  mg4.door('w', 0, 3, 1, 3, 'mg5', 'e');
  mg4.bench(58, 23);
  mg4.sign(52, 23, 'sign_acid');
  mg4.enemy('jelly', 26, 14).enemy('jelly', 38, 13).enemy('jelly', 32, 9).enemy('hopper', 50, 23).enemy('hopper', 8, 23).enemy('spitter', 55, 23);
  mg4.decor('light', 33, 16, { r: 280, c: '#9dff6a' });

  // ===================== SUNKEN AQUEDUCT =====================
  const mg5 = room('mg5', 30, 46, { area: 'aqueduct', theme: 'aqueduct', map: { x: 21, y: -4 } });
  mg5.solid(0, 42, 30, 4);
  mg5.solid(1, 6, 9, 33).solid(14, 6, 15, 36);
  mg5.hazard(10, 20, 1, 2).hazard(13, 28, 1, 2);
  mg5.door('e', 29, 3, 1, 3, 'mg4', 'w');
  mg5.door('w', 0, 39, 1, 3, 'aq1', 'e');
  mg5.bench(5, 41);
  mg5.enemy('jelly', 11, 16).enemy('jelly', 12, 32);

  const aq1 = room('aq1', 64, 24, { area: 'aqueduct', theme: 'aqueduct', map: { x: 13, y: 0 } });
  aq1.solid(0, 22, 64, 2);
  aq1.acid(40, 22, 5, 1).acid(14, 22, 4, 1);
  aq1.solid(20, 14, 10, 2).solid(46, 12, 8, 2);
  aq1.door('e', 63, 19, 1, 3, 'mg5', 'w');
  aq1.door('w', 0, 19, 1, 3, 'aq2', 'e');
  aq1.enemy('jelly', 30, 9).enemy('diver', 50, 7).enemy('spider', 25, 17).enemy('crawler', 34, 21).enemy('sentinel', 54, 21).enemy('jelly', 10, 12);
  aq1.decor('light', 42, 19, { r: 200, c: '#9dff6a' });

  const aq2 = room('aq2', 40, 34, { area: 'aqueduct', theme: 'aqueduct', map: { x: 8, y: -1 } });
  aq2.solid(0, 32, 40, 2);
  aq2.solid(12, 6, 2, 23).solid(18, 9, 2, 20).solid(1, 6, 11, 1);
  aq2.acid(1, 32, 11, 1);
  aq2.door('e', 39, 29, 1, 3, 'aq1', 'w');
  aq2.door('w', 0, 3, 1, 3, 'aq3', 'e');
  aq2.enemy('diver', 26, 20).enemy('diver', 32, 10).enemy('jelly', 26, 14).enemy('spitter', 30, 31);

  const aq3 = room('aq3', 60, 22, { area: 'aqueduct', theme: 'aqueduct', map: { x: 0, y: -4 } });
  aq3.solid(0, 20, 60, 2);
  aq3.acid(18, 20, 4, 1).acid(34, 20, 5, 1);
  aq3.solid(25, 12, 6, 2).plat(44, 15, 5).plat(11, 17, 4).plat(9, 14, 3);
  aq3.solid(3, 12, 6, 8).air(3, 16, 5, 4).breakable(8, 16, 1, 4);
  aq3.door('e', 59, 17, 1, 3, 'aq2', 'w');
  aq3.door('w', 0, 9, 1, 3, 'aq4', 'e');
  aq3.solid(1, 12, 2, 8);
  aq3.bench(55, 19);
  aq3.item('cache_aq3', 5, 19, 'cache', { amount: 90 });
  aq3.enemy('sentinel', 44, 19).enemy('sentinel', 28, 19).enemy('diver', 36, 8).enemy('jelly', 20, 10).enemy('spider', 27, 15);

  const aq4 = room('aq4', 44, 24, { area: 'aqueduct', theme: 'aqueduct', map: { x: -6, y: -4 } });
  aq4.solid(0, 20, 44, 4);
  aq4.plat(6, 16, 5).plat(33, 16, 5);
  aq4.door('e', 43, 17, 1, 3, 'aq3', 'w');
  aq4.arena = {
    boss: 'drowned', flag: 'boss_drowned', trigger: 34, triggerDir: -1, spawn: { x: 12, y: 19 },
    gates: [{ x: 43, y: 17, w: 1, h: 3, close: 'start' }],
    reward: { id: 'seed_drowned', kind: 'seed', x: 22, y: 18 },
    reward2: { id: 'charm_thrift', kind: 'charm', charm: 'thrift', x: 25, y: 19 },
  };

  // ===================== CRYSTAL SPIRES: the cracked hall =====================
  const cs4 = room('cs4', 50, 26, { area: 'crystal', theme: 'crystal', map: { x: 37, y: -2 } });
  cs4.solid(0, 23, 50, 3);
  cs4.crack(20, 23, 6, 2);
  cs4.solid(40, 6, 9, 1);
  cs4.plat(34, 20, 5).plat(38, 17, 5).plat(34, 14, 5).plat(38, 11, 5).plat(34, 8, 5);
  cs4.plat(6, 14, 5);
  cs4.door('e', 49, 3, 1, 3, 'cs1', 'w');
  cs4.door('down', 20, 25, 6, 1, 'wd1', 'top');
  cs4.sign(17, 22, 'sign_crack');
  cs4.item('cache_cs4', 8, 13, 'cache', { amount: 90 });
  cs4.enemy('shard', 10, 22).enemy('shard', 30, 22).enemy('flyer', 14, 8).enemy('flyer', 26, 12).enemy('crawler', 44, 22);

  // ===================== WEBBED DEPTHS =====================
  const wd1 = room('wd1', 36, 44, { area: 'webbed', theme: 'webbed', map: { x: 44, y: 15 } });
  wd1.solid(0, 41, 36, 3);
  wd1.solid(1, 1, 19, 22).solid(26, 1, 9, 22);
  wd1.plat(6, 34, 6).plat(22, 38, 5).plat(27, 35, 5).plat(22, 32, 5).plat(27, 29, 5).plat(22, 26, 5);
  wd1.door('top', 20, 0, 6, 1, 'cs4', 'down');
  wd1.door('w', 0, 38, 1, 3, 'wd2', 'e');
  wd1.bench(30, 40);
  wd1.enemy('spider', 10, 25).enemy('spider', 30, 26).enemy('crawler', 14, 40).enemy('spider', 18, 28);

  const wd2 = room('wd2', 64, 26, { area: 'webbed', theme: 'webbed', map: { x: 36, y: 18 } });
  wd2.solid(0, 23, 64, 3);
  wd2.air(20, 23, 4, 3).hazard(20, 25, 4, 1).air(40, 23, 6, 3).hazard(40, 25, 6, 1);
  wd2.solid(10, 1, 8, 13).solid(28, 1, 6, 15).solid(50, 1, 7, 12);
  wd2.door('e', 63, 20, 1, 3, 'wd1', 'w');
  wd2.door('w', 0, 20, 1, 3, 'wd3', 'e');
  wd2.bench(58, 22);
  wd2.enemy('spider', 24, 17).enemy('spider', 38, 17).enemy('diver', 46, 14).enemy('crawler', 14, 22).enemy('sentinel', 32, 22).enemy('spider', 6, 10);

  const wd3 = room('wd3', 40, 30, { area: 'webbed', theme: 'webbed', map: { x: 31, y: 17 } });
  wd3.solid(0, 28, 40, 2);
  wd3.plat(30, 25, 5).plat(25, 22, 5).plat(30, 19, 5).plat(25, 16, 5).plat(20, 13, 5).plat(15, 10, 5);
  wd3.solid(1, 8, 13, 1);
  wd3.door('e', 39, 25, 1, 3, 'wd2', 'w');
  wd3.door('w', 0, 5, 1, 3, 'wd4', 'e');
  wd3.enemy('spider', 8, 14).enemy('diver', 12, 20).enemy('spider', 33, 8).enemy('crawler', 20, 27).enemy('diver', 34, 14);

  const wd4 = room('wd4', 44, 24, { area: 'webbed', theme: 'webbed', map: { x: 25, y: 18 } });
  wd4.solid(0, 20, 44, 4);
  wd4.plat(6, 16, 5).plat(33, 16, 5);
  wd4.door('e', 43, 17, 1, 3, 'wd3', 'w');
  wd4.arena = {
    boss: 'brood', flag: 'boss_brood', trigger: 34, triggerDir: -1, spawn: { x: 10, y: 19 },
    gates: [{ x: 43, y: 17, w: 1, h: 3, close: 'start' }],
    reward: { id: 'fang_brood', kind: 'fang', x: 22, y: 18 },
    reward2: { id: 'charm_deep', kind: 'charm', charm: 'deep', x: 25, y: 19 },
  };

  // ===================== HOLLOW THRONE: the seal gate =====================
  const ht3 = room('ht3', 40, 26, { area: 'throne', theme: 'throne', map: { x: 71, y: -4 } });
  ht3.solid(0, 23, 40, 3);
  ht3.door('l', 0, 20, 1, 3, 'ht1', 'r');
  ht3.door('r', 39, 20, 1, 3, 'ht2', 'l');
  ht3.sealGate = { x: 26, y: 1, w: 2, h: 22, need: 6 };
  ht3.decor('seals', 26, 12);
  ht3.sign(22, 22, 'seal_gate');
  ht3.bench(8, 22);
  ht3.decor('pillar', 14, 22, { h: 18 }).decor('pillar', 34, 22, { h: 18 });

  // ===================== THE RUSTWORKS (optional, behind the secret wall in cx5) =====================
  // fd1: crumbling plates over a saw pit, then a lever that wakes a moving platform
  const fd1 = room('fd1', 72, 24, { area: 'rustworks', theme: 'foundry', map: { x: 0, y: 12 } });
  fd1.solid(0, 21, 72, 3);
  fd1.air(36, 21, 20, 2).hazard(36, 22, 20, 1);                 // pit under the plates
  fd1.crumble(51, 19, 2).crumble(45, 18, 2).crumble(39, 19, 2);
  fd1.saw(43, 13, { to: { x: 43, y: 21 }, r: 22, speed: 130 });
  fd1.air(8, 21, 22, 2).hazard(8, 22, 22, 1);                   // the long pit
  fd1.mover(26, 19, 3, 9, 19, { speed: 120, wait: 0.7, needs: 'lever_fd1' });
  fd1.saw(12, 14, { to: { x: 25, y: 14 }, r: 20, speed: 100, phase: 0.5 });
  fd1.lever('fd1', 33, 20, [{ x: 0, y: 18, w: 1, h: 3 }]);
  fd1.door('e', 71, 18, 1, 3, 'cx5', 'w');
  fd1.door('w', 0, 18, 1, 3, 'fd2', 'e');
  fd1.bench(64, 20);
  fd1.sign(59, 20, 'sign_rust').sign(31, 20, 'sign_lever');
  fd1.decor('gear', 60, 9, { r: 4 }).decor('gear', 47, 6, { r: 2.5, dir: -1 }).decor('gear', 20, 8, { r: 5 });
  fd1.decor('chimney', 66, 20, { h: 12 }).decor('chimney', 3, 20, { h: 10 });
  fd1.enemy('crawler', 61, 20).enemy('crawler', 32, 20).enemy('flyer', 44, 10).enemy('flyer', 18, 11);

  // fd2: the foundry shaft. An elevator, a crumbling stair under stalactites, and the Comet Heart.
  // The way on is across the top, too far for any jump.
  const fd2 = room('fd2', 40, 44, { area: 'rustworks', theme: 'foundry', map: { x: -5, y: 9 } });
  fd2.solid(0, 41, 40, 3);
  fd2.mover(28, 39, 4, 28, 22, { speed: 110, wait: 1 });
  fd2.solid(21, 22, 6, 1);                                       // ledge at the top of the lift
  fd2.crumble(16, 19, 3).crumble(11, 16, 3).crumble(6, 13, 3);
  fd2.saw(10, 9, { to: { x: 10, y: 18 }, r: 20, speed: 120 });
  fd2.solid(9, 3, 14, 2);                                        // overhang that the stalactites hang from
  fd2.drip(12, 5).drip(18, 5);
  fd2.solid(1, 10, 4, 1);                                        // the Comet Heart's ledge
  fd2.item('ability_superdash', 2, 9, 'ability', { ability: 'superdash' });
  fd2.solid(34, 10, 5, 1);                                       // far ledge by the way on
  fd2.bench(36, 9);
  fd2.door('e', 39, 38, 1, 3, 'fd1', 'w');
  fd2.door('ne', 39, 7, 1, 3, 'fd3', 'w');
  fd2.decor('gear', 8, 30, { r: 5 }).decor('gear', 20, 36, { r: 3, dir: -1 }).decor('gear', 33, 26, { r: 2.5 });
  fd2.decor('chimney', 3, 40, { h: 14 });
  fd2.enemy('crawler', 12, 40).enemy('flyer', 20, 30).enemy('flyer', 6, 22);

  // fd3: a Comet Heart gauntlet. Each island ends in a step that stops the dash; the way back
  // is one long dash above them all.
  const fd3 = room('fd3', 72, 24, { area: 'rustworks', theme: 'foundry', map: { x: 0, y: 9 } });
  fd3.solid(0, 18, 8, 6);
  fd3.solid(22, 18, 8, 6).solid(28, 16, 2, 2);
  fd3.solid(46, 16, 8, 8).solid(52, 14, 2, 2);
  fd3.solid(64, 14, 8, 10).solid(68, 12, 4, 2);                   // landing lip, then the raised reward ledge
  fd3.hazard(8, 22, 14, 1).hazard(30, 22, 16, 1).hazard(54, 22, 10, 1);
  // the saws sweep the outward flight lines; the high return line from the reward ledge clears them all
  fd3.saw(15, 13.5, { to: { x: 15, y: 21 }, r: 24, speed: 150 });
  fd3.saw(38, 15, { orbit: 2, r: 22, speed: 130 });
  fd3.saw(57, 13.5, { to: { x: 57, y: 19.5 }, r: 22, speed: 140, phase: 0.3 });
  fd3.saw(61, 13.5, { to: { x: 61, y: 19.5 }, r: 22, speed: 170, phase: 0.75 });
  fd3.solid(43, 1, 14, 4).drip(48, 5).drip(51, 5);
  fd3.door('w', 0, 15, 1, 3, 'fd2', 'ne');
  fd3.sign(5, 17, 'sign_comet');
  fd3.item('seed_fd3', 69, 11, 'seed');
  fd3.item('cache_fd3', 70, 11, 'cache', { amount: 160 });
  fd3.decor('gear', 36, 6, { r: 4, dir: -1 }).decor('gear', 64, 5, { r: 3 }).decor('chimney', 25, 17, { h: 9 });
  fd3.enemy('crawler', 26, 17).enemy('flyer', 67, 6);

  // ===================== the husks: hollow wanderers from the artist's sprite, spread over the world =====================
  WORLD.rooms.cx1.enemy('husk', 18, 39);
  WORLD.rooms.cx2.enemy('husk', 24, 19);
  WORLD.rooms.cx2.enemy('husk', 54, 13);
  WORLD.rooms.cx5.enemy('husk', 22, 16);
  WORLD.rooms.mg1.enemy('husk', 46, 19);
  WORLD.rooms.mg2.enemy('husk', 18, 36);
  WORLD.rooms.sp1.enemy('husk', 41, 22);
  WORLD.rooms.sp3.enemy('husk', 11, 21);
  WORLD.rooms.aq1.enemy('husk', 29, 21);
  WORLD.rooms.aq3.enemy('husk', 28, 11);
  WORLD.rooms.cs2.enemy('husk', 34, 22);
  WORLD.rooms.cs4.enemy('husk', 14, 22);
  WORLD.rooms.wd2.enemy('husk', 26, 22);
  WORLD.rooms.ht1.enemy('husk', 39, 26);
  WORLD.rooms.ht1.enemy('husk', 48, 26);

  // shield wardens and rams (see entities.js): on long flat floors, away from the doors
  const en = (r, type, x, y) => WORLD.rooms[r].enemy(type, x, y);
  en('sp1', 'warden', 47, 22); en('cs4', 'warden', 41, 22); en('aq3', 'warden', 52, 19);
  en('wd2', 'warden', 12, 22); en('cx2', 'warden', 23, 19); en('mg4', 'warden', 58, 23);
  en('mg1', 'ram', 56, 19); en('cx4', 'ram', 24, 30); en('aq1', 'ram', 22, 21);
  en('wd2', 'ram', 50, 22); en('cx1', 'ram', 6, 39);
  // lantern stations (fast travel): one per area, a few steps from a bench; the hub's is lit from the start
  const st = (r, x, y) => WORLD.rooms[r].station(x, y);
  st('town', 35, 17); st('cx2', 70, 19); st('mg2', 33, 3); st('cs2', 64, 22); st('sp1', 6, 22);
  st('aq3', 52, 19); st('wd2', 55, 22); st('ht1', 7, 26); st('fd1', 67, 20);
  // charms (see charms.js): each lies next to a spot the route already reaches; three more drop from guardians
  const charm = (r, id, x, y) => WORLD.rooms[r].item('charm_' + id, x, y, 'charm', { charm: id });
  charm('cx2', 'thorn', 4, 14);       // the high ledge, beside the mask seed
  charm('cx5', 'spirit', 5, 16);      // inside the secret pocket
  charm('mg1', 'swift', 48, 4);       // on the island with the mask seed
  charm('ht1', 'focus', 7, 16);       // beside the far seed
  charm('sp1', 'shell', 44, 13);      // on the ledge above the stash
  charm('aq3', 'dashmaster', 7, 19);  // inside the secret pocket
  charm('cs4', 'mage', 10, 13);       // on the ledge above the stash
  charm('fd3', 'fury', 68, 11);       // the raised reward ledge of the Rustworks
  WORLD.order = Object.keys(WORLD.rooms);
  for (const id of WORLD.order) WORLD.rooms[id].finish();
})();
