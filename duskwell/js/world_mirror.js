'use strict';
// World data: the Mirror Vault, a hall of black glass and quicksilver below Cinderdeep (entered from the Forgotten
// Armory). Seven rooms, entered from the right and left by the left like Cinderdeep. A mid-boss (the Glass Duelist)
// guards the middle; the Wanderer's Twin waits in the last room.
(function build() {
  const mirror = (id, w, h, mx, my) => room(id, w, h, { area: 'mirror', theme: 'mirror', map: { x: mx, y: my } });

  // ===================== mv1: the Gate of Glass. A ten-wide pool of quicksilver. =====================
  const mv1 = mirror('mv1', 72, 22, 19, 29);
  mv1.solid(0, 18, 72, 4);
  mv1.air(22, 18, 11, 4).acid(22, 19, 11, 3);                 // the pool: x22..33, a dash and a double jump
  mv1.solid(14, 15, 6, 3);
  mv1.door('e', 71, 15, 1, 3, 'em6', 'nw').door('w', 0, 15, 1, 3, 'mv2', 'e');
  mv1.enemy('veil', 54, 17).enemy('ram', 42, 17).enemy('flyer', 30, 9).enemy('warden', 8, 17);
  mv1.sign(66, 17, 'sign_mirror');

  // ===================== mv2: the Shard Gallery. A four-wide shaft to climb, spikes of glass on the way in. =====================
  const mv2 = mirror('mv2', 56, 32, 29, 29);
  mv2.solid(0, 29, 56, 3);
  mv2.solid(1, 6, 25, 17).solid(30, 6, 25, 17);               // two blocks leave a shaft x26..29
  mv2.plat(26, 26, 4);                                        // a step to reach the foot of the shaft
  mv2.hazard(34, 28, 10, 1);                                  // glass spikes: ten wide, the dash and the double jump
  mv2.door('e', 55, 26, 1, 3, 'mv1', 'w').door('w', 0, 3, 1, 3, 'mv3', 'e');
  mv2.enemy('veil', 46, 28).enemy('flyer', 28, 14).enemy('flyer', 27, 22).enemy('warden', 14, 28);
  mv2.item('cache_mv2', 44, 5, 'cache', { amount: 150 });

  // ===================== mv3: the Reflecting Pools. Three pools of quicksilver; a bench, a station and a hidden seal. =====================
  const mv3 = mirror('mv3', 72, 24, 37, 29);
  mv3.solid(0, 20, 72, 4);
  mv3.air(16, 20, 8, 4).acid(16, 21, 8, 3);
  mv3.air(34, 20, 8, 4).acid(34, 21, 8, 3);
  mv3.air(52, 20, 8, 4).acid(52, 21, 8, 3);
  mv3.solid(25, 14, 8, 6).air(27, 17, 4, 3).breakable(25, 17, 2, 3);          // a hidden alcove between the first two pools
  mv3.door('e', 71, 17, 1, 3, 'mv2', 'w').door('w', 0, 17, 1, 3, 'mv4', 'e');
  mv3.bench(66, 19).station(62, 19);
  mv3.enemy('veil', 48, 19).enemy('veil', 10, 19).enemy('flyer', 20, 11).enemy('flyer', 56, 11).enemy('warden', 46, 19);
  mv3.item('seed_mv3', 30, 19, 'seed');
  mv3.decor('light', 64, 16, { r: 220, c: '#d8c8ff' });

  // ===================== mv4: the Duelist's Hall. The Glass Duelist bars the way on. =====================
  const mv4 = mirror('mv4', 44, 22, 47, 29);
  mv4.solid(0, 20, 44, 2);
  mv4.plat(6, 15, 6).plat(32, 15, 6);
  mv4.door('e', 43, 17, 1, 3, 'mv3', 'w').door('w', 0, 17, 1, 3, 'mv5', 'e');
  mv4.arena = {
    boss: 'duelist', flag: 'boss_duelist', trigger: 34, triggerDir: -1, spawn: { x: 10, y: 19 },
    gates: [{ x: 43, y: 17, w: 1, h: 3, close: 'start' }, { x: 0, y: 17, w: 1, h: 3, close: 'always' }],
    reward: { id: 'cache_duelist', kind: 'cache', amount: 300, x: 22, y: 19 },
  };

  // ===================== mv5: the Echo Stair. A stair of glass plates above spikes. =====================
  const mv5 = mirror('mv5', 40, 46, 53, 29);
  mv5.solid(0, 44, 40, 2);
  mv5.hazard(1, 43, 31, 1);                                   // the whole floor under the stair is glass spikes
  mv5.plat(26, 41, 6).plat(14, 38, 6).plat(3, 35, 6).plat(14, 32, 6).plat(26, 29, 6).plat(14, 26, 6)
    .plat(3, 23, 6).plat(14, 20, 6).plat(26, 17, 6).plat(14, 14, 6).plat(3, 11, 6).plat(11, 7, 4);
  mv5.solid(1, 6, 9, 1);
  mv5.door('e', 39, 41, 1, 3, 'mv4', 'w').door('w', 0, 3, 1, 3, 'mv6', 'e');
  mv5.enemy('flyer', 18, 36).enemy('flyer', 22, 24).enemy('veil', 30, 28 + 0).enemy('flyer', 8, 17);
  mv5.item('cache_mv5', 5, 34, 'cache', { amount: 160 });

  // ===================== mv6: the Antechamber of Mirrors. Quiet; a bench and the way to the twin. =====================
  const mv6 = mirror('mv6', 40, 22, 59, 30);
  mv6.solid(0, 18, 40, 4);
  mv6.door('e', 39, 15, 1, 3, 'mv5', 'w').door('w', 0, 15, 1, 3, 'mv7', 'e');
  mv6.bench(33, 17);
  mv6.sign(8, 17, 'sign_mirror_twin');
  mv6.decor('light', 20, 14, { r: 240, c: '#d8c8ff' });

  // ===================== mv7: the Twin's Chamber. =====================
  const mv7 = mirror('mv7', 52, 26, 64, 29);
  mv7.solid(0, 22, 52, 4);
  mv7.plat(8, 16, 6).plat(38, 16, 6).plat(23, 12, 6);
  mv7.door('e', 51, 19, 1, 3, 'mv6', 'w');
  mv7.arena = {
    boss: 'twin', flag: 'boss_twin', trigger: 40, triggerDir: -1, spawn: { x: 12, y: 21 },
    gates: [{ x: 51, y: 19, w: 1, h: 3, close: 'start' }],
    reward: { id: 'seed_twin', kind: 'seed', x: 24, y: 20 },
    reward2: { id: 'charm_echo', kind: 'charm', charm: 'echo', x: 28, y: 21 },
  };
})();
