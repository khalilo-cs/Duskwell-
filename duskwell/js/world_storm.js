'use strict';
// World data: Stormcrest, the storm-wracked peaks above Rimecrest (entered from the Hall of Rime). Seven rooms. The
// air itself is the puzzle here: updrafts lift the hero, crosswinds push at him while he is airborne (see Level.winds).
// A mid-boss (Thunderhoof) guards the middle, the Storm Roc waits at the top.
(function build() {
  const storm = (id, w, h, mx, my) => room(id, w, h, { area: 'stormcrest', theme: 'storm', map: { x: mx, y: my } });

  // ===================== sc1: the Gale Gate. A wide pit with an updraft in it, then a headwind. =====================
  const sc1 = storm('sc1', 72, 22, 42, -24);
  sc1.solid(0, 18, 72, 4);
  sc1.air(22, 18, 12, 4).hazard(22, 21, 12, 1);               // a 12-wide pit: let the updraft carry you over
  sc1.wind(24, 5, 6, 15, { wy: -340 });
  sc1.wind(40, 8, 20, 10, { wx: -110 });                      // a headwind on the far side
  sc1.solid(47, 15, 4, 3);
  sc1.door('w', 0, 15, 1, 3, 'fr4', 'ne').door('e', 71, 15, 1, 3, 'sc2', 'w');
  sc1.enemy('ram', 12, 17).enemy('warden', 64, 17).enemy('flyer', 36, 9).enemy('diver', 52, 7);
  sc1.sign(5, 17, 'sign_storm');

  // ===================== sc2: the Updraft Shaft. Three lifts, three ledges. =====================
  const sc2 = storm('sc2', 30, 46, 52, -28);
  sc2.solid(0, 44, 30, 2);
  sc2.wind(3, 26, 5, 18, { wy: -340 });                       // lift one, from the floor
  sc2.solid(9, 33, 15, 1);                                    // ledge A
  sc2.wind(20, 12, 5, 21, { wy: -340 });                      // lift two, from ledge A
  sc2.solid(2, 17, 18, 1);                                    // ledge B
  sc2.wind(3, 3, 5, 14, { wy: -340 });                        // lift three, from ledge B
  sc2.solid(8, 6, 21, 1);                                     // the top ledge, level with the door
  sc2.door('w', 0, 41, 1, 3, 'sc1', 'e').door('e', 29, 3, 1, 3, 'sc3', 'w');
  sc2.enemy('flyer', 14, 38).enemy('diver', 12, 25).enemy('moth', 10, 12).enemy('moth', 22, 22);
  sc2.item('cache_sc2', 3, 16, 'cache', { amount: 130 });

  // ===================== sc3: the Thunder Bridge. Planks over spikes under a tailwind, then a headwind. A bench and a station. =====================
  const sc3 = storm('sc3', 84, 22, 56, -24);
  sc3.solid(0, 18, 12, 4).solid(72, 18, 12, 4);
  sc3.hazard(12, 21, 60, 1);
  sc3.plat(14, 16, 5).plat(21, 15, 4).plat(27, 14, 5).plat(34, 16, 4).plat(40, 13, 5).plat(47, 15, 4).plat(53, 14, 5).plat(60, 16, 4).plat(66, 15, 4);
  sc3.wind(12, 2, 30, 19, { wx: 110 });                       // a tailwind: easy to overshoot
  sc3.wind(44, 2, 28, 19, { wx: -110 });                      // a headwind
  sc3.door('w', 0, 15, 1, 3, 'sc2', 'e').door('e', 83, 15, 1, 3, 'sc4', 'w');
  sc3.bench(76, 17).station(80, 17);
  sc3.enemy('moth', 30, 9).enemy('moth', 56, 8).enemy('diver', 44, 6).enemy('flyer', 20, 9);
  sc3.sign(3, 17, 'sign_storm_bridge');

  // ===================== sc4: the Rod Hall. Thunderhoof, a bull of thunder, guards the way on. =====================
  const sc4 = storm('sc4', 44, 22, 67, -24);
  sc4.solid(0, 20, 44, 2);
  sc4.plat(6, 15, 6).plat(32, 15, 6);
  sc4.door('w', 0, 17, 1, 3, 'sc3', 'e').door('e', 43, 17, 1, 3, 'sc5', 'w');
  sc4.arena = {
    boss: 'thunderhoof', flag: 'boss_thunderhoof', trigger: 9, spawn: { x: 32, y: 19 },
    gates: [{ x: 0, y: 17, w: 1, h: 3, close: 'start' }, { x: 43, y: 17, w: 1, h: 3, close: 'always' }],
    reward: { id: 'cache_thunderhoof', kind: 'cache', amount: 300, x: 21, y: 19 },
  };

  // ===================== sc5: the Cloudsea. Lifts and a tailwind to cross the open sky. =====================
  const sc5 = storm('sc5', 76, 30, 73, -27);
  sc5.solid(0, 26, 10, 4).solid(66, 7, 10, 23);               // the landing and the far cliff
  sc5.hazard(10, 29, 56, 1);
  sc5.wind(11, 6, 5, 22, { wy: -340 });                       // lift one
  sc5.plat(17, 9, 6);
  sc5.wind(23, 0, 44, 16, { wx: 110 });                       // a tailwind carries you over the sea
  sc5.plat(29, 11, 4).plat(37, 12, 4).plat(45, 10, 4).plat(53, 12, 4);
  sc5.wind(58, 10, 6, 19, { wy: -340 });                      // lift two, to the cliff top
  sc5.door('w', 0, 23, 1, 3, 'sc4', 'e').door('e', 75, 4, 1, 3, 'sc6', 'w');
  sc5.air(66, 4, 10, 3);
  sc5.enemy('moth', 20, 14).enemy('moth', 40, 8).enemy('diver', 50, 6).enemy('flyer', 30, 16).enemy('flyer', 54, 18);
  sc5.item('seed_sc5', 70, 6, 'seed');

  // ===================== sc6: the Eyrie Antechamber. Quiet; a bench and the way to the roc. =====================
  const sc6 = storm('sc6', 40, 22, 83, -26);
  sc6.solid(0, 18, 40, 4);
  sc6.door('w', 0, 15, 1, 3, 'sc5', 'e').door('e', 39, 15, 1, 3, 'sc7', 'w');
  sc6.bench(6, 17);
  sc6.sign(30, 17, 'sign_storm_roc');
  sc6.decor('light', 20, 14, { r: 240, c: '#bcd0ff' });

  // ===================== sc7: the Roc's Nest. =====================
  const sc7 = storm('sc7', 52, 26, 89, -27);
  sc7.solid(0, 22, 52, 4);
  sc7.plat(8, 16, 6).plat(38, 16, 6).plat(23, 12, 6);
  sc7.door('w', 0, 19, 1, 3, 'sc6', 'e');
  sc7.arena = {
    boss: 'roc', flag: 'boss_roc', trigger: 9, spawn: { x: 40, y: 21 },
    gates: [{ x: 0, y: 19, w: 1, h: 3, close: 'start' }],
    reward: { id: 'seed_roc', kind: 'seed', x: 24, y: 20 },
    reward2: { id: 'charm_gale', kind: 'charm', charm: 'gale', x: 28, y: 21 },
  };
})();
