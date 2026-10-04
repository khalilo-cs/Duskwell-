// The Mirror Vault: the Glass Duelist (guard and riposte), the Wanderer's Twin, and the Blade Echo charm they lead to.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const fight = (room, px) => ev(([room, px]) => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, { door: 'e' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0;
    P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; DW.step(5);
    P.x = px * 32; DW.step(1);
    for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const b = G.boss; return b ? { key: b.bossKey, state: b.state, hp: b.hp, gates: G.gates.length } : null;
  }, [room, px]);
  const runAttack = (name, phase) => ev(([name, phase]) => {
    const { G, P } = DW; const b = G.boss, L = G.level;
    b.phase = phase; b.hp = b.maxHp; b.invul = false; b.tele = 0; b.alpha = 1; b.ghostly = false; b.grav = true; b.stunned = false; b.guarding = false; b.slashing = 0; b.lunging = false; b.dashing = false; b.airborne = false; b.diving = false; b.casting = false;
    G.projs = []; b.x = (L.pw / 2 + 140) - b.w / 2; b.y = G.floorY - b.h - 2; b.vx = b.vy = 0; b.face = -1;
    const x0 = b.cx, kinds = new Set(); let done = false, melee = false, minAlpha = 1, maxDmg = 0, dashed = false;
    b.co = (function* () { yield* b[name](); done = true; })();
    let f = 0; for (; f < 900 && !done; f++) {
      P.x = L.pw / 2 - 180; P.y = G.floorY - P.h - 2; P.vx = 0; DW.step(1);
      for (const p of G.projs) kinds.add(p.kind + (p.pal ? ':pal' : '')); if (b.melee) { melee = true; maxDmg = Math.max(maxDmg, b.melee.dmg); } minAlpha = Math.min(minAlpha, b.alpha); if (b.dashing) dashed = true;
    }
    return { done, frames: f, kinds: [...kinds], melee, maxDmg, minAlpha, dashed, moved: Math.abs(b.cx - x0) };
  }, [name, phase]);

  // ---------------------------------------------------------------- doors
  let r = await ev(() => { const W = DW.WORLD.rooms; return { a: W.em6.doors.find(d => d.id === 'nw'), b: W.mv1.doors.find(d => d.id === 'e') }; });
  ok('em6 north-west door and mv1 east door lead to each other', r.a && r.b && r.a.to === 'mv1' && r.a.toDoor === 'e' && r.b.to === 'em6' && r.b.toDoor === 'nw', r);

  // ---------------------------------------------------------------- the Glass Duelist
  let b = await fight('mv4', 30);
  ok('Duelist: crossing the line (from the right) closes the gate and starts the fight', b && b.key === 'duelist' && b.state === 'fight' && b.gates >= 1, b);
  for (const [name, phase, kind] of [['lunge', 1, null], ['combo', 1, null], ['shatter', 2, 'shard:pal'], ['rain', 2, 'rock:pal']]) {
    r = await runAttack(name, phase);
    ok('Duelist ' + name + '(' + phase + '): runs to its end' + (kind ? ' and spawns ' + kind : ' with a blow'), r.done && r.frames < 880 && (kind ? r.kinds.includes(kind) : r.melee), r);
  }
  r = await ev(() => {                                           // guard: a blow is turned aside, gives no soul, and is answered by a riposte
    const { G, P } = DW; const b = G.boss, L = G.level;
    b.phase = 1; b.hp = b.maxHp; b.invul = false; b.state = 'fight'; G.projs = []; b.x = (L.pw / 2 + 60) - b.w / 2; b.y = G.floorY - b.h - 2; b.vx = 0; b.stunned = false;
    P.x = L.pw / 2 - 20; P.y = G.floorY - P.h - 2; P.soul = 0; b.face = -1;
    let ended = false; b.co = (function* () { yield* b.guard(); ended = true; })(); DW.step(12);
    const hp0 = b.hp, guarding = b.guarding, ret = b.hurt(5, 1, 'side'), hp1 = b.hp, parried = b.parried;
    let maxDmg = 0; for (let i = 0; i < 40; i++) { P.x = L.pw / 2 - 20; DW.step(1); if (b.melee) maxDmg = Math.max(maxDmg, b.melee.dmg); }
    for (let i = 0; i < 120 && !ended; i++) { P.x = L.pw / 2 - 20; DW.step(1); }
    return { guarding, ret, hp0, hp1, parried, maxDmg, ended, guardAfter: b.guarding };
  });
  ok('Duelist guard: the blow is turned aside (no damage, returns false), the riposte hits', r.guarding && r.ret === false && r.hp0 === r.hp1 && r.parried && r.maxDmg === 1 && r.ended && !r.guardAfter, r);
  r = await ev(() => {                                           // nobody strikes: it ends with a slow overhead and a long opening
    const { G, P } = DW; const b = G.boss, L = G.level;
    b.hp = b.maxHp; b.state = 'fight'; G.projs = []; b.x = (L.pw / 2 + 200) - b.w / 2; b.y = G.floorY - b.h - 2; b.vx = 0; b.stunned = false; b.parried = false; b.face = -1;
    P.x = 6 * 32; P.y = G.floorY - P.h - 2;
    let ended = false, stunSeen = false; b.co = (function* () { yield* b.guard(); ended = true; })();
    for (let i = 0; i < 400 && !ended; i++) { P.x = 6 * 32; DW.step(1); if (b.stunned) stunSeen = true; }
    const open = b.hp; b.invul = false; b.stunned = true; const ret = b.hurt(5, 1, 'side');
    return { ended, stunSeen, hit: open - b.hp, ret };
  });
  ok('Duelist guard: left alone it ends in an overhead and is open to a blow', r.ended && r.stunSeen && r.hit === 5, r);
  r = await ev(() => {
    const { G } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.co = b.brain(); b.guarding = false; b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_duelist, items: G.items.map(i => i.id), gates: G.gates.filter(g => g.closed).length };
  });
  ok('Duelist: dies, leaves a cache, the way on opens', r.dead && r.flag && r.items.includes('cache_duelist') && r.gates === 0, r);

  // ---------------------------------------------------------------- the Wanderer's Twin
  b = await fight('mv7', 36);
  ok("Twin: crossing the line closes the gate and starts the fight", b && b.key === 'twin' && b.state === 'fight' && b.gates >= 1, b);
  for (const [name, phase, kind, extra] of [['rush', 1, null], ['dashSlash', 1, null, 'dashed'], ['leap', 1, 'shock'], ['bolt', 1, 'bolt'], ['cry', 2, 'pillar:pal'], ['echo', 2, 'wave'], ['mirrorStep', 3, null, 'fade']]) {
    r = await runAttack(name, phase);
    ok('Twin ' + name + '(' + phase + '): runs to its end' + (kind ? ' and spawns ' + kind : ' with a blow'), r.done && r.frames < 880 && (kind ? r.kinds.includes(kind) : r.melee), r);
    if (extra === 'dashed') ok('Twin dashSlash: dashes through', r.dashed && r.moved > 150, r);
    if (extra === 'fade') ok('Twin mirrorStep: fades out and returns', r.minAlpha < 0.2, r.minAlpha);
    if (name === 'leap') ok('Twin leap: the dive wounds', r.maxDmg === 1, r.maxDmg);
  }
  r = await ev(() => {
    const { G } = DW; const b = G.boss; G.projs = []; b.co = null; b.phase = 1; b.hp = b.maxHp; b.invul = false; b.state = 'fight'; b.co = b.brain();
    const out = [b.phase]; b.hp = b.maxHp * 0.65; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase, b.invul);
    for (let i = 0; i < 200 && b.invul; i++) DW.step(1); out.push(b.invul);
    b.hp = b.maxHp * 0.32; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase); for (let i = 0; i < 200 && b.invul; i++) DW.step(1);
    return out;
  });
  ok('Twin: three phases, an invulnerable shift between them', r.join() === '1,2,true,false,3', r);
  r = await ev(() => {
    const { G } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_twin, items: G.items.map(i => i.id), owned: DW.Charms.ownedList() };
  });
  ok('Twin: dies; the seal and the Blade Echo appear', r.dead && r.flag && r.items.includes('seed_twin') && (r.items.includes('charm_echo') || r.owned.includes('echo')), r);
  await page.screenshot({ path: shot('boss_twin_after.png') });

  // ---------------------------------------------------------------- Blade Echo
  const strikes = async echo => {
    await ev(echo => {
      const { G, P, Charms, enterRoom } = DW; Charms.reset(); G.flags = {}; if (echo) { Charms.give('echo'); Charms.toggle('echo'); }
      enterRoom('cx1', { pos: { x: 10 * 32 + 16, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; G.projs = [];
      P.invuln = 1e9; P.nail = 5; P.dead = false; P.echoN = 0; DW.step(20);
      const h = new ENEMY_TYPES.husk({ type: 'husk', x: 16, y: 39 }); h.kind = 'husk'; h.hp = h.maxHp = 60; h.dmg = 0; G.enemies.push(h); h.setState('idle'); h.stun = 99;
      P.x = 10 * 32; P.face = 1;
    }, echo);
    const out = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('KeyX'); out.push(await ev(() => { DW.step(1); const w = DW.G.projs.some(p => p.kind === 'wave' && p.friendly); DW.step(30); return { wave: w, hp: DW.G.enemies[0].hp }; }));
    }
    await ev(() => DW.step(40));
    return { out, hp: await ev(() => DW.G.enemies[0].hp) };
  };
  r = await strikes(true);
  ok('Blade Echo: no wave on the first two strikes, a wave on the third that hurts the husk', !r.out[0].wave && !r.out[1].wave && r.out[2].wave && r.hp < 60 && r.hp >= 60 - 5, r);
  r = await strikes(false);
  ok('Without the charm the third strike sends nothing', !r.out[2].wave && r.hp === 60, r);

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
