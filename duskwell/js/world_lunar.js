'use strict';
// World data: the Lunar Observatory, a hall of brass and starlight above Stormcrest (entered through the sealed door
// at the east end of the Roc's Nest, which opens when the Roc is beaten). Seven rooms, entered from the west and left
// by the east. Fields of weak gravity (RoomBuilder.grav) turn a jump into a flight; lenslings aim rays, orreries
// turn, lunar hares leap. A mid-boss (the Stargazer) guards the middle; the Eclipse Regent waits in the dome.
(function build() {
  const lunar = (id, w, h, mx, my) => room(id, w, h, { area: 'lunar', theme: 'lunar', map: { x: mx, y: my } });

  // the way in: the Roc's Nest gets an east door, shut until the Roc is beaten
  const sc7 = WORLD.rooms.sc7;
  sc7.door('e', 51, 19, 1, 3, 'lo1', 'w');
  sc7.arena.gates.push({ x: 51, y: 19, w: 1, h: 3, close: 'always' });

  // ===================== lo1: the Gate of Stars. A thirteen-wide pit crossed in the first field of weak gravity. =====================
  const lo1 = lunar('lo1', 72, 24, 96, -27);
  lo1.solid(0, 20, 72, 4);
  lo1.air(26, 20, 13, 4).hazard(26, 23, 13, 1);
  lo1.grav(21, 0, 23, 23);
  lo1.door('w', 0, 17, 1, 3, 'sc7', 'e').door('e', 71, 17, 1, 3, 'lo2', 'w');
  lo1.enemy('lunarhare', 12, 19).enemy('lunarhare', 52, 19).enemy('lensling', 60, 19).enemy('orrery', 16, 9);
  lo1.sign(5, 19, 'sign_lunar');
  lo1.decor('light', 10, 15, { r: 210, c: '#d8e0ff' });

  // ===================== lo2: the Orrery Hall. A shaft in weak gravity: leaps of six tiles, spikes below. =====================
  const lo2 = lunar('lo2', 56, 32, 107, -31);
  lo2.solid(0, 29, 56, 3);
  lo2.hazard(10, 28, 40, 1);
  lo2.grav(0, 0, 56, 31);
  lo2.plat(8, 23, 6).plat(19, 17, 5).plat(30, 11, 5).plat(42, 6, 6).plat(50, 5, 5);
  lo2.door('w', 0, 26, 1, 3, 'lo1', 'e').door('e', 55, 3, 1, 3, 'lo3', 'w');
  lo2.enemy('orrery', 26, 20).enemy('orrery', 38, 10).enemy('lunarhare', 21, 16).enemy('orrery', 12, 12);
  lo2.item('cache_lo2', 9, 22, 'cache', { amount: 150 });

  // ===================== lo3: the Lens Gallery. Lenslings along a long hall, a pit in a field of weak gravity, a bench, a station, a hidden seal. =====================
  const lo3 = lunar('lo3', 72, 24, 116, -28);
  lo3.solid(0, 20, 72, 4);
  lo3.air(36, 20, 8, 4).hazard(36, 23, 8, 1);
  lo3.grav(32, 0, 16, 23);
  lo3.solid(18, 14, 8, 6).air(20, 17, 4, 3).breakable(18, 17, 2, 3);          // a hidden alcove
  lo3.door('w', 0, 17, 1, 3, 'lo2', 'e').door('e', 71, 17, 1, 3, 'lo4', 'w');
  lo3.bench(6, 19).station(10, 19);
  lo3.enemy('lensling', 28, 19).enemy('lensling', 52, 19).enemy('lensling', 62, 19).enemy('lunarhare', 48, 19).enemy('orrery', 40, 8);
  lo3.item('seed_lo3', 23, 19, 'seed');
  lo3.decor('light', 8, 16, { r: 220, c: '#d8e0ff' });

  // ===================== lo4: the Stargazer's Deck. The Stargazer bars the way on. =====================
  const lo4 = lunar('lo4', 44, 22, 127, -28);
  lo4.solid(0, 20, 44, 2);
  lo4.plat(6, 15, 6).plat(32, 15, 6);
  lo4.door('w', 0, 17, 1, 3, 'lo3', 'e').door('e', 43, 17, 1, 3, 'lo5', 'w');
  lo4.sign(4, 19, 'sign_lunar_stargazer');
  lo4.arena = {
    boss: 'stargazer', flag: 'boss_stargazer', trigger: 9, spawn: { x: 30, y: 19 },
    gates: [{ x: 0, y: 17, w: 1, h: 3, close: 'start' }, { x: 43, y: 17, w: 1, h: 3, close: 'always' }],
    reward: { id: 'cache_stargazer', kind: 'cache', amount: 340, x: 22, y: 19 },
  };

  // ===================== lo5: the Stair of Stars. A tall climb in weak gravity, platforms far apart, spikes below. =====================
  const lo5 = lunar('lo5', 40, 48, 134, -32);
  lo5.solid(0, 46, 40, 2);
  lo5.hazard(9, 45, 28, 1);
  lo5.grav(0, 0, 40, 46, { k: 0.36 });
  lo5.plat(3, 42, 6).plat(15, 36, 5).plat(27, 30, 5).plat(15, 24, 5).plat(3, 18, 5).plat(15, 12, 5).plat(30, 7, 8);
  lo5.door('w', 0, 43, 1, 3, 'lo4', 'e').door('e', 39, 5, 1, 3, 'lo6', 'w');
  lo5.enemy('orrery', 22, 28).enemy('orrery', 10, 14).enemy('lunarhare', 16, 35).enemy('lunarhare', 28, 29).enemy('lensling', 32, 6);
  lo5.item('cache_lo5', 5, 17, 'cache', { amount: 170 });

  // ===================== lo6: the Antechamber of the Dome. Quiet; a bench, a trader and the way to the Regent. =====================
  const lo6 = lunar('lo6', 40, 22, 141, -28);
  lo6.solid(0, 18, 40, 4);
  lo6.door('w', 0, 15, 1, 3, 'lo5', 'e').door('e', 39, 15, 1, 3, 'lo7', 'w');
  lo6.bench(6, 17);
  lo6.npc('trader', 11, 17, 'lunar');
  lo6.sign(30, 17, 'sign_lunar_regent');
  lo6.decor('light', 20, 14, { r: 240, c: '#d8e0ff' });

  // ===================== lo7: the Eclipse Dome. =====================
  const lo7 = lunar('lo7', 52, 26, 147, -28);
  lo7.solid(0, 22, 52, 4);
  lo7.plat(8, 16, 6).plat(38, 16, 6).plat(23, 12, 6);
  lo7.door('w', 0, 19, 1, 3, 'lo6', 'e');
  lo7.arena = {
    boss: 'regent', flag: 'boss_regent', trigger: 9, spawn: { x: 34, y: 21 },
    gates: [{ x: 0, y: 19, w: 1, h: 3, close: 'start' }],
    reward: { id: 'seed_regent', kind: 'seed', x: 24, y: 20 },
    reward2: { id: 'charm_moonstep', kind: 'charm', charm: 'moonstep', x: 28, y: 21 },
  };
})();
