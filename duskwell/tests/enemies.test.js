// Shield Warden (blocks strikes from the front) and Ram (telegraphed charge that ends in a crash).
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const setup = (room, px, py) => page.evaluate(([room, px, py]) => {
    const { G, P, enterRoom, Charms } = DW;
    Charms.reset(); G.flags = {};
    enterRoom(room, { pos: { x: px * 32 + 16, y: (py + 1) * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; G.geos = [];
    P.invuln = 1e9; P.hp = P.maxHp = 5; P.soul = 0; P.dead = false; P.sitting = null; P.nail = 5; P.soulGain = 11;
    DW.step(20);
  }, [room, px, py]);

  // ---------- placement
  let r = await ev(() => {
    const out = [];
    for (const id of DW.WORLD.order) for (const e of DW.WORLD.rooms[id].enemies) if (e.type === 'warden' || e.type === 'ram') {
      const rm = DW.WORLD.rooms[id]; out.push({ id, t: e.type, ok: [0, 1].every(k => rm.at(e.x, e.y - k) === 0) && rm.at(e.x, e.y + 1) === 1 });
    }
    return { out, w: out.filter(o => o.t === 'warden').length, r: out.filter(o => o.t === 'ram').length };
  });
  ok('11 wardens and 10 rams, all standing on floor', r.w === 11 && r.r === 10 && r.out.every(o => o.ok), r);

  // ---------- Warden: the shield
  await setup('cx1', 20, 39);
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    const w = new ENEMY_TYPES.warden({ x: 20, y: 39 }); w.kind = 'warden'; w.face = 1; w.hp = 100; G.enemies.push(w);
    // player stands on its facing side (to the right), facing left: the strike is blocked
    P.x = w.cx + 50 - P.w / 2; P.y = w.y + w.h - P.h; P.face = -1; P.atkDir = 'side'; P.atkT = 0.1; P.hits = new Set(); P.soul = 0;
    P.attackHits(); out.front = { hp: w.hp, soul: P.soul, blockedT: w.blocked > 0 };
    // behind it (to the left), facing right: the strike lands
    P.x = w.cx - 50 - P.w / 2; P.face = 1; P.hits = new Set(); P.soul = 0; P.attackHits(); out.back = { hp: w.hp, soul: P.soul };
    // from above (down strike) while it faces the player
    P.x = w.cx + 4 - P.w / 2; P.y = w.y - P.h - 10; P.atkDir = 'down'; P.hits = new Set(); P.soul = 0; const hp0 = w.hp; P.attackHits(); out.above = { dmg: hp0 - w.hp };
    // an up strike and a spell hit through the shield too
    w.hurt(5, -1, 'up'); out.up = w.hp; const h1 = w.hp; w.hurt(14, -1, 'spell'); out.spell = h1 - w.hp;
    return out;
  });
  ok('a strike from the front is blocked (no damage, no soul)', r.front.hp === 100 && r.front.soul === 0 && r.front.blockedT, r.front);
  ok('a strike on its back lands and gathers soul', r.back.hp === 95 && r.back.soul === 11, r.back);
  ok('a downward strike from above lands', r.above.dmg === 5, r.above);
  ok('up strikes and spells ignore the shield', r.spell === 14, r);

  // ---------- Warden: slow to turn
  await setup('cx1', 14, 39);
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    const w = new ENEMY_TYPES.warden({ x: 20, y: 39 }); w.kind = 'warden'; w.face = 1; w.hp = 100; G.enemies.push(w);
    w.setState('chase'); w.turnCD = 0.8; w.lastSeen = w.t;
    P.x = w.cx - 140; P.y = w.y + w.h - P.h; P.vx = 0;                 // behind it, in sight
    DW.step(20); out.early = w.face; DW.step(60); out.late = w.face;
    return out;
  });
  ok('it keeps facing away for ~0.8 s, then turns', r.early === 1 && r.late === -1, r);

  // ---------- Warden: full FSM walk, ends in a bash that can hurt
  await setup('cx1', 10, 39);
  r = await ev(() => {
    const { G, P } = DW; const out = { seen: new Set() };
    const w = new ENEMY_TYPES.warden({ x: 22, y: 39 }); w.kind = 'warden'; w.face = -1; G.enemies.push(w);
    P.invuln = 0; P.hp = 5; P.x = w.cx - 160; P.y = w.y + w.h - P.h;
    for (let i = 0; i < 500; i++) { DW.step(1); out.seen.add(w.currentState); if (w.currentState === 'anticipation') P.x = w.cx - 55 - P.w / 2; if (P.hp < 5) break; }
    out.seen = [...out.seen].join(); out.hp = P.hp; return out;
  });
  ok('Warden: patrol/chase/anticipation/attack, and the bash wounds', /chase/.test(r.seen) && /anticipation/.test(r.seen) && /attack/.test(r.seen) && r.hp < 5, r);

  // ---------- Ram
  await setup('cx1', 2, 39);
  r = await ev(() => {
    const { G, P } = DW; const out = { seen: [] };
    const m = new ENEMY_TYPES.ram({ x: 6, y: 39 }); m.kind = 'ram'; m.face = -1; G.enemies.push(m); out.m = 0;
    let last = '';
    for (let i = 0; i < 300; i++) { DW.step(1); if (m.currentState !== last) { last = m.currentState; out.seen.push(last + (m.crashed ? '*' : '')); } if (m.crashed && m.currentState === 'recoil' && !out.crashAt) { out.crashAt = i; out.x = Math.round(m.cx); } }
    out.final = m.currentState; out.crashed = m.crashed;
    return out;
  });
  ok('Ram: paws, charges, crashes into the wall, is dazed, then settles', /anticipation/.test(r.seen.join()) && /attack/.test(r.seen.join()) && /recoil\*/.test(r.seen.join()) && !!r.crashAt, r);
  r = await ev(() => {
    const { G, P } = DW; const m = G.enemies[0];
    m.crashed = false; m.setState('attack'); m.face = 1; m.vx = 430; m.hurt(5, -1, 'side');
    return { vx: m.vx, state: m.currentState };
  });
  ok('a charging Ram cannot be knocked back', r.vx === 430 && r.state === 'attack', r);
  // contact with a charging Ram hurts
  await setup('cx1', 14, 39);
  r = await ev(() => {
    const { G, P } = DW; const m = new ENEMY_TYPES.ram({ x: 6, y: 39 }); m.kind = 'ram'; m.face = 1; G.enemies.push(m);
    P.invuln = 0; P.hp = 5; m.setState('attack');
    for (let i = 0; i < 90; i++) { DW.step(1); if (P.hp < 5) break; }
    return { hp: P.hp, state: m.currentState };
  });
  ok('being run over by a charging Ram costs a mask', r.hp === 4, r);

  // ---------- art
  await setup('cx1', 14, 39);
  await ev(() => {
    const { G, P } = DW; const w = new ENEMY_TYPES.warden({ x: 18, y: 39 }); w.kind = 'warden'; w.face = 1; w.hp = 100; G.enemies.push(w);
    const m = new ENEMY_TYPES.ram({ x: 25, y: 39 }); m.kind = 'ram'; m.face = -1; G.enemies.push(m);
    P.x = 8 * 32; DW.step(5); w.update = () => {}; m.update = () => {};
  });
  await page.waitForTimeout(200); await page.screenshot({ path: shot('new_enemies.png') });

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
