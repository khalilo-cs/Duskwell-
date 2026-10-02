'use strict';
// World data: Cinderdeep (the ember area), west of Hushvale. Eight rooms, entered from the right and left by the
// left: lava pits (the first needs the dash), a smelter shaft to climb, a magma lake to hop across, a stair
// that rewards the double jump, and the Cinder Colossus' arena. Lava hurts like spikes: it costs a mask and sends
// the hero back to the last safe ground.
(function build() {
  const ember = (id, w, h, mx, my) => room(id, w, h, { area: 'ember', theme: 'ember', map: { x: mx, y: my } });

  // ===================== em1: the Ash Gate. A narrow lava pit, a block, then an eight-wide pit (dash). =====================
  const em1 = ember('em1', 72, 22, 57, 24);
  em1.solid(0, 18, 72, 4);
  em1.air(52, 18, 4, 4).lava(52, 19, 4, 3);                   // a narrow pit, x52..55
  em1.solid(40, 15, 6, 3);                                    // a basalt block, x40..45
  em1.air(24, 18, 8, 4).lava(24, 19, 8, 3);                   // the wide pit, x24..31: the dash
  em1.door('e', 71, 15, 1, 3, 'town', 'west').door('w', 0, 15, 1, 3, 'em2', 'e');
  em1.enemy('imp', 62, 17).enemy('imp', 36, 17).enemy('lavaworm', 12, 17).enemy('moth', 30, 9)
    .enemy('icicle', 62, 1).enemy('icicle', 10, 1);
  em1.sign(67, 17, 'sign_ember');

  // ===================== em2: the Smelter Shaft. Climb it with the wall claw; a lava pit waits on the way in. =====================
  const em2 = ember('em2', 28, 42, 50, 19);
  em2.solid(0, 39, 28, 3);
  em2.air(18, 39, 4, 3).lava(18, 40, 4, 2);                   // a pit before the shaft
  em2.solid(1, 6, 11, 27).solid(16, 6, 11, 27);               // the shaft is x12..15
  em2.plat(12, 36, 4);                                        // a step to reach the foot of the shaft
  em2.door('e', 27, 36, 1, 3, 'em1', 'w').door('w', 0, 3, 1, 3, 'em3', 'e');
  em2.enemy('moth', 13, 24).enemy('moth', 14, 13).enemy('chainman', 6, 5).enemy('lavaworm', 24, 38);
  em2.item('cache_em2', 24, 5, 'cache', { amount: 110 });

  // ===================== em3: the Slag Fields. Basalt plains and lava rivers, a bench and a lantern station. =====================
  const em3 = ember('em3', 72, 24, 41, 24);
  em3.solid(0, 20, 72, 4);
  em3.air(44, 20, 8, 4).lava(44, 21, 8, 3);                   // an eight-wide river (dash)
  em3.air(20, 20, 6, 4).lava(20, 21, 6, 3);
  em3.solid(30, 16, 6, 4);
  em3.plat(8, 15, 5).plat(58, 15, 6);
  em3.solid(6, 13, 9, 7).air(8, 16, 5, 4).breakable(13, 16, 2, 4);          // a hidden alcove, opened from the right
  em3.door('e', 71, 17, 1, 3, 'em2', 'w').door('w', 0, 17, 1, 3, 'em4', 'e');
  em3.bench(66, 19).station(62, 19);
  em3.enemy('roller', 17, 19).enemy('roller', 56, 19).enemy('chainman', 33, 15).enemy('imp', 40, 19).enemy('lavaworm', 28, 19).enemy('moth', 22, 11);
  em3.item('seed_em3', 10, 19, 'seed');
  em3.decor('light', 64, 17, { r: 220, c: '#ffb070' });

  // ===================== em4: the Magma Hall. A lake of lava crossed by a ring of plates. =====================
  const em4 = ember('em4', 64, 28, 32, 23);
  em4.solid(0, 26, 64, 2);
  em4.air(10, 26, 44, 2).lava(10, 26, 44, 2);                 // the lake, x10..53
  em4.plat(48, 24, 4).plat(41, 22, 4).plat(34, 20, 4).plat(26, 18, 5).plat(19, 20, 4).plat(12, 22, 4);
  em4.door('e', 63, 23, 1, 3, 'em3', 'w').door('w', 0, 23, 1, 3, 'em5', 'e');
  em4.enemy('moth', 30, 14).enemy('moth', 44, 17).enemy('imp', 26, 17).enemy('imp', 58, 25).enemy('chainman', 5, 25);

  // ===================== em5: the Obsidian Stair. Climb by plates; the last steps want the double jump. =====================
  const em5 = ember('em5', 36, 46, 26, 19);
  em5.solid(0, 44, 36, 2);
  em5.lava(1, 43, 24, 1);                                     // the floor under the stair is lava
  em5.plat(26, 41, 6).plat(16, 38, 6).plat(6, 35, 6).plat(16, 32, 6).plat(26, 29, 6).plat(16, 26, 6)
    .plat(6, 23, 6).plat(16, 20, 6).plat(26, 17, 6).plat(16, 14, 6).plat(6, 11, 6).plat(14, 7, 4);
  em5.solid(1, 6, 11, 1);
  em5.door('e', 35, 41, 1, 3, 'em4', 'w').door('w', 0, 3, 1, 3, 'em6', 'e');
  em5.enemy('imp', 18, 37).enemy('imp', 28, 28).enemy('moth', 12, 30).enemy('moth', 24, 19).enemy('chainman', 4, 5)
    .enemy('icicle', 28, 1).enemy('icicle', 18, 1);
  em5.item('cache_em5', 8, 22, 'cache', { amount: 140 });

  // ===================== em6: the Forgotten Armory. Racks to climb, a hidden vault, a bench. =====================
  const em6 = ember('em6', 56, 26, 19, 24);
  em6.solid(0, 22, 56, 4);
  em6.plat(10, 18, 6).plat(24, 15, 6).plat(36, 18, 6);
  em6.solid(42, 14, 12, 8).air(44, 17, 8, 5).breakable(42, 17, 2, 5);         // a vault, opened from the left
  em6.door('e', 55, 19, 1, 3, 'em5', 'w').door('w', 0, 19, 1, 3, 'em7', 'e');
  em6.bench(50, 21);
  em6.enemy('chainman', 18, 21).enemy('chainman', 33, 21).enemy('roller', 8, 21).enemy('lavaworm', 28, 21).enemy('imp', 38, 17).enemy('moth', 20, 9);
  em6.item('seed_em6', 48, 21, 'seed');

  // ===================== em7: the Ember Antechamber. Quiet; a bench and the way to the Colossus. =====================
  const em7 = ember('em7', 40, 22, 13, 24);
  em7.solid(0, 18, 40, 4);
  em7.door('e', 39, 15, 1, 3, 'em6', 'w').door('w', 0, 15, 1, 3, 'em8', 'e');
  em7.bench(33, 17);
  em7.sign(8, 17, 'sign_ember_colossus');
  em7.decor('light', 20, 14, { r: 240, c: '#ffb070' });

  // ===================== em8: the Furnace Heart. =====================
  const em8 = ember('em8', 48, 26, 7, 23);
  em8.solid(0, 22, 48, 4);
  em8.plat(8, 17, 6).plat(34, 17, 6).plat(21, 14, 6);
  em8.decor('light', 24, 20, { r: 280, c: '#ff7a30' });         // the furnace glows under the floor
  em8.door('e', 47, 19, 1, 3, 'em7', 'w');
  em8.arena = {
    boss: 'colossus', flag: 'boss_colossus', trigger: 38, triggerDir: -1, spawn: { x: 10, y: 21 },
    gates: [{ x: 47, y: 19, w: 1, h: 3, close: 'start' }],
    reward: { id: 'seed_colossus', kind: 'seed', x: 24, y: 20 },
    reward2: { id: 'charm_cinder', kind: 'charm', charm: 'cinder', x: 28, y: 21 },
  };
})();
