'use strict';
// World data: the Ossuary, a catacomb of bone below the Rustworks (entered from the bottom of the foundry shaft,
// fd2). Seven rooms, entered from the east and left by the west. A mid-boss (the Bonewright) guards the middle;
// the Marrow Tyrant waits in the last room. Heaps rise and rise again, censers swing from the ceiling, skull bats
// drop teeth; the floors are bone spikes and pools of ichor.
(function build() {
  const bone = (id, w, h, mx, my) => room(id, w, h, { area: 'ossuary', theme: 'bone', map: { x: mx, y: my } });

  // the way in: a door at the bottom-left of the foundry shaft
  const fd2 = WORLD.rooms.fd2;
  fd2.door('w', 0, 38, 1, 3, 'os1', 'e').sign(3, 40, 'sign_to_ossuary');

  // ===================== os1: the Charnel Gate. A eleven-wide pit of bone spikes; the first heaps. =====================
  const os1 = bone('os1', 72, 22, -14, 10);
  os1.solid(0, 18, 72, 4);
  os1.air(24, 18, 11, 4).hazard(24, 21, 11, 1);              // the pit: a dash and a double jump
  os1.solid(42, 15, 5, 3);                                   // a block to climb
  os1.door('e', 71, 15, 1, 3, 'fd2', 'w').door('w', 0, 15, 1, 3, 'os2', 'e');
  os1.enemy('heap', 14, 17).enemy('heap', 50, 17).enemy('heap', 60, 17).enemy('skullbat', 30, 10).enemy('censer', 52, 1, { len: 10 });
  os1.sign(66, 17, 'sign_ossuary');
  os1.decor('light', 8, 14, { r: 200, c: '#bfe8d0' });

  // ===================== os2: the Rib Hall. A stair of bone plates over spikes, up a shaft. =====================
  const os2 = bone('os2', 56, 30, -23, 8);
  os2.solid(0, 27, 56, 3);
  os2.hazard(1, 26, 46, 1);                                  // spikes on the floor all the way to the first step
  os2.plat(44, 24, 6).plat(36, 21, 5).plat(27, 18, 5).plat(18, 15, 5).plat(10, 12, 5).plat(10, 9, 4).plat(2, 6, 6);
  os2.door('e', 55, 24, 1, 3, 'os1', 'w').door('w', 0, 3, 1, 3, 'os3', 'e');
  os2.enemy('skullbat', 30, 11).enemy('skullbat', 14, 6).enemy('censer', 26, 1, { len: 12 }).enemy('censer', 42, 1, { len: 9 });
  os2.item('cache_os2', 5, 5, 'cache', { amount: 140 });

  // ===================== os3: the Reliquary. Three pools of ichor, a bench, a station and a hidden seal. =====================
  const os3 = bone('os3', 72, 24, -30, 10);
  os3.solid(0, 20, 72, 4);
  os3.air(16, 20, 8, 4).acid(16, 21, 8, 3);
  os3.air(34, 20, 8, 4).acid(34, 21, 8, 3);
  os3.air(52, 20, 8, 4).acid(52, 21, 8, 3);
  os3.solid(25, 14, 8, 6).air(27, 17, 4, 3).breakable(25, 17, 2, 3);          // a hidden alcove between the first two pools
  os3.door('e', 71, 17, 1, 3, 'os2', 'w').door('w', 0, 17, 1, 3, 'os4', 'e');
  os3.bench(66, 19).station(62, 19);
  os3.enemy('heap', 46, 19).enemy('heap', 10, 19).enemy('censer', 28, 1, { len: 7 }).enemy('censer', 44, 1, { len: 7 }).enemy('skullbat', 56, 10);
  os3.item('seed_os3', 30, 19, 'seed');
  os3.decor('light', 64, 16, { r: 220, c: '#bfe8d0' });

  // ===================== os4: the Workshop. The Bonewright bars the way on. =====================
  const os4 = bone('os4', 44, 22, -41, 10);
  os4.solid(0, 20, 44, 2);
  os4.plat(6, 15, 6).plat(32, 15, 6);
  os4.door('e', 43, 17, 1, 3, 'os3', 'w').door('w', 0, 17, 1, 3, 'os5', 'e');
  os4.sign(40, 19, 'sign_ossuary_bonewright');
  os4.arena = {
    boss: 'bonewright', flag: 'boss_bonewright', trigger: 34, triggerDir: -1, spawn: { x: 10, y: 19 },
    gates: [{ x: 43, y: 17, w: 1, h: 3, close: 'start' }, { x: 0, y: 17, w: 1, h: 3, close: 'always' }],
    reward: { id: 'cache_bonewright', kind: 'cache', amount: 320, x: 22, y: 19 },
  };

  // ===================== os5: the Spine. A zigzag of bone plates over a floor of spikes. =====================
  const os5 = bone('os5', 40, 46, -48, 8);
  os5.solid(0, 44, 40, 2);
  os5.hazard(1, 43, 31, 1);
  os5.plat(26, 41, 6).plat(14, 38, 6).plat(3, 35, 6).plat(14, 32, 6).plat(26, 29, 6).plat(14, 26, 6)
    .plat(3, 23, 6).plat(14, 20, 6).plat(26, 17, 6).plat(14, 14, 6).plat(3, 11, 6).plat(11, 7, 4);
  os5.solid(1, 6, 9, 1);
  os5.door('e', 39, 41, 1, 3, 'os4', 'w').door('w', 0, 3, 1, 3, 'os6', 'e');
  os5.enemy('skullbat', 20, 36).enemy('skullbat', 24, 24).enemy('skullbat', 10, 16).enemy('censer', 20, 1, { len: 14 }).enemy('censer', 30, 1, { len: 10 });
  os5.item('cache_os5', 5, 34, 'cache', { amount: 160 });

  // ===================== os6: the Antechamber of Skulls. Quiet; a bench, a trader and the way to the Tyrant. =====================
  const os6 = bone('os6', 40, 22, -54, 10);
  os6.solid(0, 18, 40, 4);
  os6.door('e', 39, 15, 1, 3, 'os5', 'w').door('w', 0, 15, 1, 3, 'os7', 'e');
  os6.bench(33, 17);
  os6.npc('trader', 37, 17, 'ossuary');
  os6.sign(8, 17, 'sign_ossuary_marrow');
  os6.decor('light', 20, 14, { r: 240, c: '#bfe8d0' });

  // ===================== os7: the Marrow Throne. =====================
  const os7 = bone('os7', 52, 26, -60, 10);
  os7.solid(0, 22, 52, 4);
  os7.plat(8, 16, 6).plat(38, 16, 6).plat(23, 12, 6);
  os7.door('e', 51, 19, 1, 3, 'os6', 'w');
  os7.arena = {
    boss: 'marrow', flag: 'boss_marrow', trigger: 40, triggerDir: -1, spawn: { x: 12, y: 21 },
    gates: [{ x: 51, y: 19, w: 1, h: 3, close: 'start' }],
    reward: { id: 'seed_marrow', kind: 'seed', x: 24, y: 20 },
    reward2: { id: 'charm_grave', kind: 'charm', charm: 'grave', x: 28, y: 21 },
  };
})();
