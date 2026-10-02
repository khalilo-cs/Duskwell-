'use strict';
// World data: Rimecrest (the frost area), east of Hushvale. Eight rooms; the first two need the dash and the
// wall claw, the fourth the double jump; the last is the Rime Queen's arena. Ice is slippery (see Player.onIce).
(function build() {
  const frost = (id, w, h, mx, my) => room(id, w, h, { area: 'frost', theme: 'frost', map: { x: mx, y: my } });

  // ===================== fr1: the Rime Gate. A wide pit needs the dash. =====================
  const fr1 = frost('fr1', 72, 22, 10, -12);
  fr1.solid(0, 18, 72, 4);
  fr1.ice(1, 18, 13);                                         // a slippery start
  fr1.air(15, 18, 8, 4).hazard(15, 21, 8, 1);                 // the first pit: 8 wide
  fr1.solid(30, 15, 6, 3).ice(30, 15, 6);                     // an icy block
  fr1.air(41, 18, 4, 4).hazard(41, 21, 4, 1);                 // a narrow pit
  fr1.ice(48, 18, 12);
  fr1.door('w', 0, 15, 1, 3, 'town', 'east').door('e', 71, 15, 1, 3, 'fr2', 'w');
  fr1.enemy('slime', 8, 17).enemy('mole', 26, 17).enemy('warden', 39, 17).enemy('ram', 62, 17)
    .enemy('icicle', 52, 1).enemy('icicle', 56, 1).enemy('icicle', 66, 1);
  fr1.sign(4, 17, 'sign_frost');

  // ===================== fr2: the Glacier Wall. A four-wide shaft: climb it with the wall claw. =====================
  const fr2 = frost('fr2', 28, 42, 20, -17);
  fr2.solid(0, 39, 28, 3);
  fr2.solid(1, 6, 11, 27).solid(16, 6, 11, 27);               // two blocks leave a shaft x12..15
  fr2.plat(12, 36, 4);                                        // a step to reach the foot of the shaft
  fr2.door('w', 0, 36, 1, 3, 'fr1', 'e').door('e', 27, 3, 1, 3, 'fr3', 'w');
  fr2.enemy('moth', 13, 24).enemy('moth', 14, 13).enemy('slime', 20, 38);
  fr2.item('seed_fr2', 3, 5, 'seed');

  // ===================== fr3: the Snowfield. Ice plains, a bench and a lantern station. =====================
  const fr3 = frost('fr3', 72, 24, 24, -12);
  fr3.solid(0, 20, 72, 4);
  fr3.ice(1, 20, 28).ice(36, 20, 34);
  fr3.air(30, 20, 6, 4).hazard(30, 23, 6, 1);                 // a six-wide pit between the ice sheets
  fr3.solid(12, 17, 8, 3).ice(12, 17, 8);                     // a block to climb
  fr3.plat(22, 14, 5).plat(38, 15, 6).plat(48, 12, 5);        // a way up over the ice
  fr3.solid(58, 14, 8, 6).air(60, 17, 4, 3).breakable(58, 17, 2, 3);        // a hidden alcove
  fr3.door('w', 0, 17, 1, 3, 'fr2', 'e').door('e', 71, 17, 1, 3, 'fr4', 'w');
  fr3.bench(4, 19).station(8, 19);
  fr3.enemy('ram', 24, 19).enemy('ram', 50, 19).enemy('veil', 40, 15).enemy('mole', 16, 16);
  fr3.item('seed_fr3', 62, 19, 'seed');
  fr3.decor('light', 6, 17, { r: 220, c: '#cfeeff' });

  // ===================== fr4: the Hall of Rime. A stair of plates over a floor of spikes; the double jump pays. =====================
  const fr4 = frost('fr4', 64, 28, 33, -13);
  fr4.solid(0, 26, 64, 2);
  fr4.hazard(8, 25, 31, 1);                                   // spikes under the whole stair
  fr4.plat(6, 23, 5).plat(13, 20, 5).plat(20, 17, 5).plat(27, 14, 6);
  fr4.solid(36, 12, 12, 3);                                   // a block at the top of the stair
  fr4.plat(50, 15, 5).plat(55, 19, 5);
  fr4.door('w', 0, 23, 1, 3, 'fr3', 'e').door('e', 63, 23, 1, 3, 'fr5', 'w');
  fr4.enemy('veil', 18, 14).enemy('veil', 31, 9).enemy('chainman', 46, 25).enemy('moth', 55, 11).enemy('slime', 58, 25);
  fr4.item('charm_soles', 41, 11, 'charm', { charm: 'soles' });

  // ===================== fr5: Frostbite Gorge. A descent by ledges, with icicles over every path. =====================
  const fr5 = frost('fr5', 36, 46, 41, -18);
  fr5.solid(0, 44, 36, 2);
  fr5.solid(1, 6, 9, 1).solid(13, 10, 10, 1).solid(25, 14, 10, 1).solid(13, 18, 10, 1).solid(1, 22, 10, 1)
    .solid(13, 26, 10, 1).solid(25, 30, 10, 1).solid(13, 34, 10, 1).solid(1, 38, 10, 1);
  fr5.plat(12, 41, 4);                                        // a step for the climb back
  fr5.hazard(11, 43, 13, 1);                                  // the bottom pit
  fr5.door('w', 0, 3, 1, 3, 'fr4', 'e').door('e', 35, 41, 1, 3, 'fr6', 'w');
  fr5.enemy('moth', 18, 14).enemy('moth', 28, 24).enemy('slime', 5, 5).enemy('slime', 29, 13).enemy('mole', 17, 33)
    .enemy('icicle', 15, 11).enemy('icicle', 19, 11).enemy('icicle', 28, 15).enemy('icicle', 31, 15).enemy('icicle', 16, 19).enemy('icicle', 4, 23)
    .enemy('icicle', 16, 27).enemy('icicle', 28, 31).enemy('icicle', 16, 35);
  fr5.item('cache_fr5', 5, 37, 'cache', { amount: 120 });

  // ===================== fr6: the Frozen Library. Islands over a pit; a bench. =====================
  const fr6 = frost('fr6', 56, 26, 46, -12);
  fr6.solid(0, 22, 56, 4);
  fr6.air(20, 22, 16, 4).hazard(20, 25, 16, 1);
  fr6.solid(22, 21, 3, 5).solid(27, 19, 3, 7).solid(32, 21, 3, 5);          // three islands
  fr6.plat(5, 17, 6).plat(45, 17, 6);                                       // shelves
  fr6.door('w', 0, 19, 1, 3, 'fr5', 'e').door('e', 55, 19, 1, 3, 'fr7', 'w');
  fr6.bench(3, 21);
  fr6.enemy('chainman', 45, 21).enemy('slime', 14, 21).enemy('veil', 30, 12).enemy('moth', 10, 10).enemy('mole', 50, 21);
  fr6.item('seed_fr6', 28, 18, 'seed');

  // ===================== fr7: the Rime Antechamber. Quiet; a bench and the way to the queen. =====================
  const fr7 = frost('fr7', 40, 22, 53, -12);
  fr7.solid(0, 18, 40, 4);
  fr7.door('w', 0, 15, 1, 3, 'fr6', 'e').door('e', 39, 15, 1, 3, 'fr8', 'w');
  fr7.bench(6, 17);
  fr7.sign(30, 17, 'sign_frost_queen');
  fr7.decor('light', 20, 14, { r: 240, c: '#cfeeff' });

  // ===================== fr8: the Rime Throne. =====================
  const fr8 = frost('fr8', 44, 24, 58, -13);
  fr8.solid(0, 20, 44, 4);
  fr8.plat(6, 15, 5).plat(33, 15, 5).plat(19, 12, 6);
  fr8.door('w', 0, 17, 1, 3, 'fr7', 'e');
  fr8.arena = {
    boss: 'queen', flag: 'boss_queen', trigger: 9, spawn: { x: 30, y: 19 },
    gates: [{ x: 0, y: 17, w: 1, h: 3, close: 'start' }],
    reward: { id: 'seed_queen', kind: 'seed', x: 20, y: 18 },
    reward2: { id: 'charm_wick', kind: 'charm', charm: 'wick', x: 23, y: 19 },
  };
})();
