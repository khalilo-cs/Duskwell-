// Stormcrest: wind zones (updraft, crosswind, the Storm Cloak charm), Thunderhoof (mid-boss) and the Storm Roc.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const stage = ([room, door, x, y]) => ev(([room, door, x, y]) => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, door ? { door } : { pos: { x: x * 32 + 16, y: (y + 1) * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0;
    G.enemies = []; G.projs = []; P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; DW.step(5);
  }, [room, door, x, y]);

  // ---------------------------------------------------------------- wind
  await stage(['sc2', null, 5, 43]);
  let r = await ev(() => {
    const { G, P } = DW; const y0 = P.cy; let minVy = 0;
    for (let i = 0; i < 70; i++) { P.vx = 0; DW.step(1); minVy = Math.min(minVy, P.vy); }
    return { rose: y0 - P.cy, minVy, inWind: P.inWind, onGround: P.onGround };
  });
  ok('Updraft: standing in a lift, the hero rises at about its speed', r.rose > 250 && r.minVy <= -330 && r.minVy >= -360 && !r.onGround, r);
  r = await ev(() => {                                            // a crosswind pushes in the air, not on the ground
    const { G, P } = DW; P.vx = 0;
    const zone = G.level.winds.find(w => w.wx > 0) || null;
    return !!zone;
  });
  ok('sc2 has no crosswind (control)', r === false);
  await stage(['sc3', null, 18, 10]);
  r = await ev(() => {
    const { G, P } = DW; const z = G.level.winds.find(w => w.wx > 0);
    // airborne in the tailwind: no input, 20 frames
    P.place(z.x + 200, z.y + 100, 1); P.onGround = false; P.vx = 0; P.vy = 0; const x0 = P.cx; for (let i = 0; i < 20; i++) { P.vx = 0; DW.step(1); } const dx = P.cx - x0;
    return { dx, z: z.wx };
  });
  ok('Crosswind: airborne with no input, the tailwind carries the hero right', r.dx > 25 && r.dx < 50, r);
  r = await ev(() => {
    const { G, P, Charms } = DW; const z = G.level.winds.find(w => w.wx > 0); Charms.give('gale'); Charms.toggle('gale');
    P.place(z.x + 200, z.y + 100, 1); P.onGround = false; P.vx = 0; P.vy = 0; const x0 = P.cx; for (let i = 0; i < 20; i++) { P.vx = 0; DW.step(1); } const dx = P.cx - x0;
    Charms.reset(); return dx;
  });
  ok('Storm Cloak: the same crosswind pushes less than half as far', r > 8 && r < 20, r);
  r = await ev(() => {                                            // on the ground a crosswind does nothing
    const { G, P } = DW; const z = G.level.winds.find(w => w.wx > 0);
    P.place(15 * 32 + 16, 16 * 32, 1); P.vx = 0; P.vy = 0; DW.step(10); P.vx = 0; const x0 = P.cx; for (let i = 0; i < 20; i++) { P.vx = 0; DW.step(1); }
    return { dx: P.cx - x0, ground: P.onGround };
  });
  ok('Crosswind does not push a hero standing on the floor', r.ground && Math.abs(r.dx) < 2, r);
  const apex = async cloak => {                                  // the Storm Cloak raises the double jump (the jump key is held, or the jump is cut short)
    await ev(c => { const { G, P, Charms } = DW; Charms.reset(); if (c) { Charms.give('gale'); Charms.toggle('gale'); } G.level.winds.length = 0; P.place(10 * 32, 12 * 32, 1); P.onGround = false; P.vy = 0; P.vx = 0; P.djAvail = true; P.ab.double = true; DW.step(1); }, cloak);
    await page.keyboard.down('KeyZ');
    const a = await ev(() => { const { P } = DW; const y0 = P.y; let top = y0; P.vy = 0; for (let i = 0; i < 60; i++) { P.vx = 0; DW.step(1); top = Math.min(top, P.y); } return y0 - top; });
    await page.keyboard.up('KeyZ'); await ev(() => DW.Charms.reset()); return a;
  };
  const base = await apex(false), cloak = await apex(true);
  ok('Storm Cloak: the double jump rises higher', cloak > base * 1.2 && base > 60, { base, cloak });

  // ---------------------------------------------------------------- doors
  r = await ev(() => { const W = DW.WORLD.rooms; return { a: W.fr4.doors.find(d => d.id === 'ne'), b: W.sc1.doors.find(d => d.id === 'w') }; });
  ok('fr4 north-east door and sc1 west door lead to each other', r.a && r.b && r.a.to === 'sc1' && r.a.toDoor === 'w' && r.b.to === 'fr4' && r.b.toDoor === 'ne', r);

  // ---------------------------------------------------------------- bosses
  const fight = (room, door, px) => ev(([room, door, px]) => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, { door }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0;
    P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; DW.step(5);
    P.x = px * 32; DW.step(1);
    for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const b = G.boss; return b ? { key: b.bossKey, state: b.state, hp: b.hp, gates: G.gates.length } : null;
  }, [room, door, px]);
  const runAttack = (name, phase) => ev(([name, phase]) => {
    const { G, P } = DW; const b = G.boss, L = G.level, fly = b.bossKey === 'roc';
    b.phase = phase; b.hp = b.maxHp; b.invul = false; b.tele = 0; b.alpha = 1; b.ghostly = false; b.grav = !fly; b.stunned = false; b.charging = false;
    G.projs = []; b.x = (fly ? L.pw / 2 : L.pw - 9 * 32) - b.w / 2; b.y = fly ? b.hoverY - b.h / 2 : G.floorY - b.h - 2; b.vx = b.vy = 0;
    const x0 = b.cx, kinds = new Set(); let done = false, melee = false, windSeen = false, maxMove = 0;
    b.co = (function* () { yield* b[name](); done = true; })();
    let f = 0; for (; f < 900 && !done; f++) {
      P.x = 8 * 32; P.y = G.floorY - P.h - 2; P.vx = 0; DW.step(1);
      for (const p of G.projs) kinds.add(p.kind + (p.pal ? ':pal' : '')); if (b.melee) melee = true; if (L.winds.length) windSeen = true; maxMove = Math.max(maxMove, Math.abs(b.cx - x0));
    }
    return { done, frames: f, kinds: [...kinds], melee, windSeen, windLeft: L.winds.length, maxMove };
  }, [name, phase]);

  let b = await fight('sc4', 'w', 12);
  ok('Thunderhoof: crossing the line closes the gate and starts the fight', b && b.key === 'thunderhoof' && b.state === 'fight' && b.gates >= 1, b);
  for (const [name, phase, kind] of [['charge', 1, 'beam:pal'], ['stomp', 1, 'shock'], ['gore', 2, null], ['thunder', 2, 'beam:pal']]) {
    r = await runAttack(name, phase);
    ok('Thunderhoof ' + name + '(' + phase + '): runs to its end' + (kind ? ' and spawns ' + kind : ' with a blow'), r.done && r.frames < 880 && (kind ? r.kinds.includes(kind) : r.melee), r);
    if (name === 'charge') ok('Thunderhoof charge: crosses the hall', r.maxMove > 300, r.maxMove);
  }
  r = await ev(() => {
    const { G } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.co = b.brain(); b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_thunderhoof, items: G.items.map(i => i.id), gates: G.gates.filter(g => g.closed).length };
  });
  ok('Thunderhoof: dies, leaves geo (a cache), the way on opens', r.dead && r.flag && r.items.includes('cache_thunderhoof') && r.gates === 0, r);

  b = await fight('sc7', 'w', 12);
  ok('Roc: crossing the line closes the gate and starts the fight', b && b.key === 'roc' && b.state === 'fight' && b.gates >= 1, b);
  for (const [name, phase, kind] of [['strafe', 1, 'needle'], ['swoop', 1, 'shock'], ['lightning', 1, 'beam:pal'], ['dive', 2, 'shock'], ['gale', 2, 'needle']]) {
    r = await runAttack(name, phase);
    ok('Roc ' + name + '(' + phase + '): runs to its end and spawns ' + kind, r.done && r.frames < 880 && r.kinds.includes(kind), r);
    if (name === 'swoop' || name === 'dive') ok('Roc ' + name + ': a body blow', r.melee, r);
    if (name === 'gale') ok('Roc gale: a crosswind fills the hall while it lasts, and ends with it', r.windSeen && r.windLeft === 0, r);
  }
  r = await ev(() => {
    const { G, P } = DW; const b = G.boss; G.projs = []; b.co = null; b.phase = 1; b.hp = b.maxHp; b.invul = false; b.state = 'fight'; b.co = b.brain();
    const out = [b.phase]; b.hp = b.maxHp * 0.65; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase, b.invul);
    for (let i = 0; i < 200 && b.invul; i++) DW.step(1); out.push(b.invul);
    b.hp = b.maxHp * 0.32; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase); for (let i = 0; i < 200 && b.invul; i++) DW.step(1);
    return out;
  });
  ok('Roc: three phases, an invulnerable shift between them', r.join() === '1,2,true,false,3', r);
  r = await ev(() => {                                           // a gale that is running when the Roc dies must not outlive it
    const { G } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; const z = { x: 0, y: 0, w: G.level.pw, h: G.level.ph, wx: 150, wy: 0 }; G.level.winds.push(z); b.galeZone = z; b.hp = 1; b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_roc, items: G.items.map(i => i.id), owned: DW.Charms.ownedList(), winds: G.level.winds.length };
  });
  ok('Roc: dies, no wind is left, the seal and the Storm Cloak appear', r.dead && r.flag && r.winds === 0 && r.items.includes('seed_roc') && (r.items.includes('charm_gale') || r.owned.includes('gale')), r);
  await page.screenshot({ path: shot('boss_roc_after.png') });

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
