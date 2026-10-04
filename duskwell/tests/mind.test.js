// What the creatures learn (js/mind.js) and the sharper difficulty (js/difficulty.js).
const { open } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({});
  const ev = (f, a) => page.evaluate(f, a);
  // a quiet room with one floor to try things on
  const setup = () => ev(() => {
    DW.enterRoom('cx3', { pos: { x: 100, y: 100 } }); const { G, P } = DW; G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null;
    G.enemies = []; G.projs = []; Mind.reset(); P.invuln = 99; DW.step(2);
    const n = G.npcs[0]; return !!n || true;
  });
  await setup();
  // ---- difficulty
  let r = await ev(() => ({ hp0: Diff.enemyHp('hushvale'), hp14: Diff.enemyHp('throne'), boss0: Diff.bossHp('hushvale'), t: Diff.tempo('throne'), s: Diff.sight('throne'), grace: Diff.grace }));
  ok('creatures are much tougher, quicker and sharper-eyed, more so the deeper the area', r.hp0 === 1.6 && Math.abs(r.hp14 - 2.3) < 1e-9 && r.boss0 === 1.5 && r.t > 1.25 && r.s > 1.3 && r.grace === 0.9, r);
  // ---- born clever: the depth gives a level before the player has taught anything
  r = await ev(() => ({ a: Diff.innate('hushvale'), b: Diff.innate('crossroads'), c: Diff.innate('crystal'), d: Diff.innate('frost'), e: Diff.innate('lunar'), f: Diff.innate('throne'),
    fresh: (Mind.reset(), Mind.level({ kind: 'husk', area: 'throne' })), shallow: Mind.level({ kind: 'husk', area: 'crossroads' }), taught: (G.mind = { husk: { k: 100, w: 0, d: 0, sp: 0 } }, Mind.level({ kind: 'husk', area: 'crystal' })) }));
  ok('the first areas are born at level 0, the deep ones at 1, 2 and 3', r.a === 0 && r.b === 0 && r.c === 1 && r.d === 2 && r.e === 3 && r.f === 3, r);
  ok('a creature that has never met you is already clever in the throne, and what it learned still counts when it is more', r.fresh === 3 && r.shallow === 0 && r.taught === 5, r);
  // ---- they flinch less the deeper they live
  r = await ev(() => { const mk = area => { const e = new ENEMY_TYPES.crawler({ x: 12, y: 17 }); e.kind = 'crawler'; Mind.prepare(e, area); return e.kb; }; return { shallow: mk('crossroads'), deep: mk('throne') }; });
  ok('a deep creature is knocked back less than a shallow one', r.deep < r.shallow && r.deep >= 0.5, r);
  // ---- the soul vessel holds three times as much and every blow fills half of what it did
  r = await ev(() => { const { P } = DW; P.soul = 0; P.maxSoul = Diff.soulMax; P.gainSoul(11); const one = P.soul; P.gainSoul(10000); return { max: Diff.soulMax, one, full: P.soul, start: new Player().maxSoul }; });
  ok('the vessel holds 297, a blow of 11 gathers 5.5, and it never overflows', r.max === 297 && r.one === 5.5 && r.full === 297 && r.start === 297, r);
  r = await ev(() => { const { P } = DW; P.soul = 0; let hits = 0; while (P.soul < P.spellCost() && hits < 100) { P.gainSoul(P.soulGain); hits++; } return { hits }; });
  ok('it takes six blows to gather one spell where it took three', r.hits === 6, r);
  // ---- levels
  r = await ev(() => {
    const out = {}, e = { kind: 'husk' };
    Mind.reset(); out.l0 = Mind.level(e);
    G.mind = { husk: { k: 3, w: 0, d: 0, sp: 0 } }; out.l1 = Mind.level(e);
    G.mind = { husk: { k: 0, w: 2, d: 0, sp: 0 } }; out.w2 = Mind.level(e);        // 2 wounds = 3 points: level 1 as well
    G.mind = { husk: { k: 0, w: 0, d: 2, sp: 0 } }; out.d2 = Mind.level(e);         // 2 deaths = 8: level 2
    G.mind = { husk: { k: 100, w: 0, d: 0, sp: 0 } }; out.max = Mind.level(e);
    out.none = Mind.level({ kind: 'shade' });
    return out;
  });
  ok('the level grows with kills, wounds and deaths and stops at five', r.l0 === 0 && r.l1 === 1 && r.w2 === 1 && r.d2 === 2 && r.max === 5 && r.none === 0, r);
  // ---- every class is wrapped once
  r = await ev(() => ({ husk: !!Husk.prototype.update._mind, bat: !!SkullBat.prototype.update._mind, flyer: !!Flyer.prototype.update._mind, boss: !!Boss.prototype.update._own }));
  ok('creature classes are wrapped (and the bosses\' projectiles credited)', r.husk && r.bat && r.flyer && r.boss, r);
  // a subclass that calls super.update() gets the faster clock once
  r = await ev(() => {
    const { G } = DW; Mind.reset(); G.enemies = [];
    const e = new ENEMY_TYPES.skullbat({ x: 12, y: 10 }); e.kind = 'skullbat'; Mind.prepare(e, 'ossuary'); G.mind = { skullbat: { k: 100, w: 0, d: 0, sp: 0 } };
    const dts = []; const tick = e.tick; e.tick = function (dt) { dts.push(dt); return tick.call(this, dt); };
    e.update(1 / 60); return { dts, want: (1 / 60) * Mind.tempo(e) };
  });
  ok('the faster clock is applied once, not once per class', r.dts.length === 1 && Math.abs(r.dts[0] - r.want) < 1e-9 && r.want > 1 / 60, r);
  // ---- tempo and sight
  r = await ev(() => {
    const { G } = DW; Mind.reset(); G.enemies = [];
    const mk = () => { const e = new ENEMY_TYPES.crawler({ x: 12, y: 17 }); e.kind = 'crawler'; Mind.prepare(e, 'crossroads'); e.face = 1; return e; };
    const a = mk(), b = mk(); G.mind = { crawler: { k: 100, w: 0, d: 0, sp: 0 } };
    const la = Mind.level(a); G.mind = {}; const lb = Mind.level(b);
    // the same crawler, once untaught and once taught
    const run = lvl => { G.mind = lvl ? { crawler: { k: 100, w: 0, d: 0, sp: 0 } } : {}; const e = mk(); e.update(1 / 60); const x0 = e.x; for (let i = 0; i < 60; i++) e.update(1 / 60); return e.x - x0; };
    return { la, lb, plain: run(0), taught: run(1), sightPlain: (G.mind = {}, Mind.sight(mk())), sightTaught: (G.mind = { crawler: { k: 100, w: 0, d: 0, sp: 0 } }, Mind.sight(mk())) };
  });
  ok('a taught creature moves faster and sees farther', r.la === 5 && r.lb === 0 && r.taught > r.plain * 1.05 && r.sightTaught > r.sightPlain * 1.5, r);
  // ---- sidestep
  r = await ev(() => {
    const { G, P } = DW; Mind.reset(); G.enemies = []; G.projs = [];
    const e = new ENEMY_TYPES.husk({ x: 12, y: 17 }); e.kind = 'husk'; Mind.prepare(e, 'crossroads'); G.enemies.push(e);
    for (let i = 0; i < 4; i++) e.update(1 / 60);
    G.mind = { husk: { k: 100, w: 0, d: 0, sp: 0 } };
    P.x = e.x - 70; P.y = e.y; P.face = 1; P.atkT = 0; e.update(1 / 60);
    const rnd = Math.random; Math.random = () => 0;                          // the dice always say yes
    P.atkT = 0.16; const x0 = e.x; e.update(1 / 60); Math.random = rnd;
    const t = e.dodgeT; for (let i = 0; i < 10; i++) e.update(1 / 60);
    return { t, moved: e.x - x0, vy: e.vy };
  });
  ok('a taught creature steps away from a swing', r.t > 0 && r.moved > 20, r);
  r = await ev(() => {
    const { G, P } = DW; Mind.reset(); G.enemies = [];
    const e = new ENEMY_TYPES.husk({ x: 12, y: 17 }); e.kind = 'husk'; Mind.prepare(e, 'crossroads'); G.enemies.push(e);
    for (let i = 0; i < 4; i++) e.update(1 / 60);
    P.x = e.x - 70; P.y = e.y; P.face = 1; P.atkT = 0; e.update(1 / 60);
    const rnd = Math.random; Math.random = () => 0; P.atkT = 0.16; e.update(1 / 60); Math.random = rnd;
    return { t: e.dodgeT || 0 };
  });
  ok('an untaught one stands its ground', r.t === 0, r);
  // ---- rooted creatures never move
  r = await ev(() => {
    const { G, P } = DW; Mind.reset(); G.enemies = [];
    const e = new ENEMY_TYPES.shard({ x: 12, y: 17 }); e.kind = 'shard'; Mind.prepare(e, 'crystal'); G.enemies.push(e);
    G.mind = { shard: { k: 100, w: 0, d: 0, sp: 0 } }; P.x = e.x - 70; P.y = e.y; P.face = 1; P.atkT = 0; e.update(1 / 60);
    const rnd = Math.random; Math.random = () => 0; P.atkT = 0.16; e.update(1 / 60); Math.random = rnd; return { t: e.dodgeT || 0 };
  });
  ok('a turret never leaves its place', r.t === 0, r);
  // ---- hop over bolts, only if spells are how it was killed
  const hop = share => ev(sh => {
    const { G, P } = DW; Mind.reset(); G.enemies = []; G.projs = [];
    const e = new ENEMY_TYPES.husk({ x: 20, y: 17 }); e.kind = 'husk'; Mind.prepare(e, 'crossroads'); G.enemies.push(e);
    for (let i = 0; i < 20; i++) e.update(1 / 60);
    G.mind = { husk: { k: 20, w: 0, d: 0, sp: Math.round(20 * sh) } };
    G.projs.push(new Proj({ x: e.cx - 100, y: e.cy, vx: 600, r: 12, dmg: 1, friendly: true, pierce: true, kind: 'bolt' }));
    P.x = e.x - 400; P.y = e.y; e.vy = 0; e.update(1 / 60); return { vy: e.vy };
  }, share);
  let a = await hop(0.8), b = await hop(0);
  ok('it hops a bolt if spells killed most of its kind, and not otherwise', a.vy < -300 && b.vy > -300, [a, b]);
  // ---- alert
  r = await ev(() => {
    const { G, P } = DW; Mind.reset(); G.enemies = []; G.mind = { husk: { k: 100, w: 0, d: 0, sp: 0 } };
    const mk = x => { const e = new ENEMY_TYPES.husk({ x, y: 17 }); e.kind = 'husk'; Mind.prepare(e, 'crossroads'); G.enemies.push(e); return e; };
    const a = mk(10), b = mk(16), c = mk(60);
    P.x = a.x + 100; P.y = a.y; for (let i = 0; i < 30; i++) a.update(1 / 60);
    a.setState(ST.CHASE); a.update(1 / 60);
    return { a: a.currentState, near: b.alertT > 0, far: (c.alertT || 0) > 0 };
  });
  ok('a level-four creature in pursuit alerts its kin nearby, not far away', r.near && !r.far, r);
  // ---- credit: kills, wounds, deaths, projectile owners
  r = await ev(() => {
    const { G, P } = DW; Mind.reset(); G.enemies = []; G.projs = []; P.invuln = 0; P.hp = 2; P.maxHp = 5; P.dead = false; G.state = 'play';
    const e = new ENEMY_TYPES.husk({ x: 12, y: 17 }); e.kind = 'husk'; Mind.prepare(e, 'crossroads'); G.enemies.push(e);
    e.hp = 1; e.hurt(5, 1, 'spell');
    const afterKill = JSON.stringify(G.mind.husk);
    const sp = new ENEMY_TYPES.spitter({ x: 30, y: 17 }); sp.kind = 'spitter'; Mind.prepare(sp, 'mossgrove'); G.enemies.push(sp);
    P.x = sp.x - 90; P.y = sp.y; sp.t = 99; for (let i = 0; i < 400 && !G.projs.some(q => q.owner === sp); i++) { sp.update(1 / 60); }
    const owned = G.projs.some(q => q.owner === sp);
    const pj = G.projs.find(q => q.owner === sp); if (pj) { P.x = pj.x - P.w / 2; P.y = pj.y - P.h / 2; P.invuln = 0; pj.update(1 / 60); }
    return { afterKill, owned, spitterW: (G.mind.spitter || {}).w };
  });
  ok('a spell kill is counted, with its share', JSON.parse(r.afterKill).k === 1 && JSON.parse(r.afterKill).sp === 1, r.afterKill);
  ok('what a creature fires carries its name, so the wound is credited to it', r.owned && r.spitterW === 1, r);
  // ---- a clever shooter aims where the hero will be
  const shot = lvlKnown => ev(known => {
    const { G, P } = DW; Mind.reset(); G.enemies = []; G.projs = [];
    const e = new ENEMY_TYPES.shard({ x: 20, y: 17 }); e.kind = 'shard'; Mind.prepare(e, 'crystal'); G.enemies.push(e);
    if (known) G.mind = { shard: { k: 100, w: 0, d: 0, sp: 0 } };
    P.x = e.cx - 300; P.y = e.cy - 20; P.vx = 0; P.vy = 400;                       // the hero is falling: a shot at him should be aimed lower
    for (let i = 0; i < 400 && !G.projs.some(q => q.kind === 'shard'); i++) { P.x = e.cx - 300; P.y = e.cy - 20; P.vy = 400; e.update(1 / 60); }
    const q = G.projs.find(x => x.kind === 'shard'); if (!q) return null;
    const direct = Math.atan2(P.cy - q.y, P.cx - q.x), a = Math.atan2(q.vy, q.vx);
    return { diff: +(a - direct).toFixed(3) };
  }, lvlKnown);
  const plainShot = await shot(false), taughtShot = await shot(true);
  ok('a shard fired by a taught turret leads a falling hero (aimed lower than a straight shot)', plainShot && taughtShot && Math.abs(taughtShot.diff) > Math.abs(plainShot.diff) + 0.02, [plainShot, taughtShot]);
  // ---- saved with the game
  r = await ev(() => {
    const { G } = DW; G.mind = { crawler: { k: 5, w: 1, d: 0, sp: 2 } }; G.bench = { room: 'town' }; saveGame();
    const s = readSave(); startGame(true); return { saved: s && s.mind, loaded: G.mind };
  });
  ok('the record is saved and loaded', r.saved && r.saved.crawler.k === 5 && r.loaded.crawler.sp === 2, r);
  r = await ev(() => { startGame(false); return G.mind; });
  ok('a new game starts with nothing learned', Object.keys(r).length === 0, r);
  // ---- a boss that has beaten you before pauses less
  r = await ev(() => {
    const mk = () => { const B = BOSS_TYPES.guardian; const b = new B({ x: 10, y: 10 }); Mind.prepare(b, 'crossroads'); return b.spd; };
    Mind.reset(); const s0 = mk(); G.mind = { 'b:guardian': { k: 0, w: 0, d: 5, sp: 0 } }; const s1 = mk(); return { s0, s1 };
  });
  ok('a boss that has killed you pauses less', r.s1 < r.s0, r);
  // ---- shown in the bestiary and above their heads
  r = await ev(() => {
    Mind.reset(); G.mind = { husk: { k: 30, w: 0, d: 0, sp: 0 } }; const d = Mind.describe('husk'), none = Mind.describe('crawler');
    const out = { level: d.level, learned: d.learned.length, none: none.level };
    try { for (let i = 0; i < BESTIARY.length; i += 7) { G.bestSel = i; G.state = 'bestiary'; DW.draw(); } out.drew = true; } catch (e) { out.err = e.message; }
    G.state = 'play';
    const e = new ENEMY_TYPES.husk({ x: 12, y: 17 }); e.kind = 'husk'; G.enemies = [e]; try { DW.draw(); out.pips = true; } catch (e2) { out.err2 = e2.message; }
    return out;
  });
  ok('the bestiary and the pips draw', r.level === 5 && r.learned >= 3 && r.none === 0 && r.drew && r.pips, r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
