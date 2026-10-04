// The Ossuary: the Heap (rises, falls, rises once more), the Skull Bat, the Censer, the Bonewright, the Marrow Tyrant,
// the Grave Whisper charm and the trader.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const setup = (room, door) => ev(([room, door]) => {
    const { G, P, enterRoom, Charms, Gear } = DW; Charms.reset(); Gear.reset(); G.flags = {}; G.shade = null;
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, { door }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0;
    G.enemies = []; G.projs = []; G.geos = [];
    P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; P.soul = 0; DW.step(5);
  }, [room, door]);
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
    b.phase = phase; b.hp = b.maxHp; b.invul = false; b.tele = 0; b.alpha = 1; b.ghostly = false; b.stunned = false; b.slashing = 0; b.lunging = false; b.casting = false; b.rattling = false;
    G.projs = []; G.enemies = G.enemies.filter(e => e === b); b.x = (L.pw / 2 + 140) - b.w / 2; b.y = G.floorY - b.h - 2; b.vx = b.vy = 0; b.face = -1;
    const x0 = b.cx, kinds = new Set(); let done = false, melee = false, maxDmg = 0, maxProjs = 0, heaps = 0;
    b.co = (function* () { yield* b[name](); done = true; })();
    let f = 0; for (; f < 900 && !done; f++) {
      P.x = L.pw / 2 - 180; P.y = G.floorY - P.h - 2; P.vx = 0; DW.step(1);
      for (const p of G.projs) kinds.add(p.kind + (p.pal ? ':pal' : '')); if (b.melee) { melee = true; maxDmg = Math.max(maxDmg, b.melee.dmg); }
      maxProjs = Math.max(maxProjs, G.projs.length); heaps = Math.max(heaps, G.enemies.filter(e => e.kind === 'heap').length);
    }
    return { done, frames: f, kinds: [...kinds], melee, maxDmg, maxProjs, heaps, moved: Math.abs(b.cx - x0) };
  }, [name, phase]);

  // ---------------------------------------------------------------- the way in
  let r = await ev(() => { const W = DW.WORLD.rooms; return { a: W.fd2.doors.find(d => d.id === 'w'), b: W.os1.doors.find(d => d.id === 'e'), n: Object.keys(W).filter(k => /^os[1-7]$/.test(k)).length }; });
  ok('the foundry shaft and the Charnel Gate lead to each other; seven first rooms', r.a && r.b && r.a.to === 'os1' && r.a.toDoor === 'e' && r.b.to === 'fd2' && r.b.toDoor === 'w' && r.n === 7, r);

  // ---------------------------------------------------------------- the Heap
  await setup('os1', 'e');
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    P.x = 66 * 32; P.y = 17 * 32 - P.h + 32; DW.step(3);
    const h = new ENEMY_TYPES.heap({ type: 'heap', x: 50, y: 17 }); h.kind = 'heap'; G.enemies.push(h);
    DW.step(60); out.far = h.currentState;
    P.x = 54 * 32; DW.step(10); out.near = h.currentState;
    DW.step(50); out.stood = h.currentState; out.hp = h.hp; out.dmg = h.dmg;
    return out;
  });
  ok('the Heap lies still while you are far, rises when you come close, and stands with 15 hp', r.far === 'pile' && (r.near === 'rising') && (r.stood === 'walk' || r.stood === 'windup' || r.stood === 'slash') && r.hp === 15 && r.dmg === 1, r);
  r = await ev(() => {                                           // a heap struck while it sleeps is simply destroyed
    const { G } = DW; G.enemies = []; G.geos = [];
    const h = new ENEMY_TYPES.heap({ type: 'heap', x: 52, y: 17 }); h.kind = 'heap'; G.enemies.push(h);
    h.hurt(7, 1, 'side'); DW.step(2);
    return { dead: h.dead, state: h.currentState, geo: G.geos.length };
  });
  ok('struck asleep it is destroyed for good', r.dead && r.state === 'pile' && r.geo > 0, r);
  r = await ev(() => {                                           // standing: first death leaves a skull, which knits and rises again with 9 hp, then the real death
    const { G, P } = DW; G.enemies = []; G.geos = []; const out = {};
    const h = new ENEMY_TYPES.heap({ type: 'heap', x: 52, y: 17 }); h.kind = 'heap'; G.enemies.push(h);
    h.currentState = 'walk'; h.hp = 15; h.hurt(15, 1, 'side');
    out.skull = { state: h.currentState, hp: h.hp, dead: h.dead, revived: h.revived, geos: G.geos.length };
    P.x = 2 * 32; DW.step(150); out.afterSkull = h.currentState;
    DW.step(100); out.rose = { state: h.currentState, hp: h.hp };
    h.hurt(9, 1, 'side'); out.second = { dead: h.dead, state: h.currentState, geos: G.geos.length };
    return out;
  });
  ok('first death: a skull remains (hp 1, nothing dropped); it knits and stands again with 9 hp', r.skull.state === 'skull' && r.skull.hp === 1 && !r.skull.dead && r.skull.revived && r.skull.geos === 0 && r.afterSkull === 'reform' && ['walk', 'rising', 'windup', 'slash'].includes(r.rose.state) && r.rose.hp === 9, r);
  ok('second death is final and drops Geo', r.second.dead && r.second.geos > 0, r.second);
  r = await ev(() => {                                           // striking the skull destroys it at once
    const { G } = DW; G.enemies = []; G.geos = [];
    const h = new ENEMY_TYPES.heap({ type: 'heap', x: 52, y: 17 }); h.kind = 'heap'; G.enemies.push(h);
    h.currentState = 'walk'; h.hp = 15; h.hurt(15, 1, 'side'); const first = h.currentState; h.hurt(1, 1, 'side');
    return { first, dead: h.dead, geos: G.geos.length };
  });
  ok('a blow on the skull ends it', r.first === 'skull' && r.dead && r.geos > 0, r);
  r = await ev(() => {                                           // while rising it cannot be hurt
    const { G } = DW; G.enemies = [];
    const h = new ENEMY_TYPES.heap({ type: 'heap', x: 52, y: 17 }); h.kind = 'heap'; G.enemies.push(h); h.setState('rising'); const hp = h.hp; const ret = h.hurt(3, 1, 'side');
    return { hp0: hp, hp1: h.hp, ret };
  });
  ok('a heap still rising turns the blow aside', r.ret === false && r.hp0 === r.hp1, r);
  r = await ev(() => {                                           // the club: a windup, then a swing that wounds the hero in front of it
    const { G, P } = DW; G.enemies = []; P.invuln = 0; P.hp = P.maxHp = 9; P.x = 56 * 32; P.y = 17 * 32 + 32 - P.h;
    const h = new ENEMY_TYPES.heap({ type: 'heap', x: 52, y: 17 }); h.kind = 'heap'; h.currentState = 'walk'; h.hp = 15; G.enemies.push(h);
    const seen = new Set(); for (let i = 0; i < 200; i++) { P.x = 56 * 32; DW.step(1); seen.add(h.currentState); if (P.hp < 9) break; }
    return { seen: [...seen], hp: P.hp };
  });
  ok('it winds up and swings, and the swing wounds', r.seen.includes('windup') && r.seen.includes('slash') && r.hp < 9, r);

  // ---------------------------------------------------------------- the Skull Bat and the Censer
  await setup('os1', 'e');
  r = await ev(() => {
    const { G, P } = DW; G.enemies = []; G.projs = []; P.x = 30 * 32; P.y = 17 * 32 + 32 - P.h;
    const b = new ENEMY_TYPES.skullbat({ type: 'skullbat', x: 30, y: 8 }); b.kind = 'skullbat'; G.enemies.push(b); b.spit = 0.1;
    let teeth = 0, max = 0; for (let i = 0; i < 300; i++) { P.x = 30 * 32; DW.step(1); const n = G.projs.filter(p => p.kind === 'shard' && !p.friendly).length; max = Math.max(max, n); }
    return { max, hp: b.hp };
  });
  ok('the Skull Bat drops a fan of three teeth', r.max >= 3, r);
  r = await ev(() => {
    const { G, P } = DW; G.enemies = []; G.projs = []; P.x = 30 * 32; P.y = 17 * 32 + 32 - P.h;
    const c = new ENEMY_TYPES.censer({ type: 'censer', x: 30, y: 1, len: 10 }); c.kind = 'censer'; G.enemies.push(c);
    const xs = []; let maxOrbs = 0; for (let i = 0; i < 400; i++) { DW.step(1); if (i % 20 === 0) xs.push(Math.round(c.cx)); maxOrbs = Math.max(maxOrbs, G.projs.filter(p => p.kind === 'orb').length); }
    return { span: Math.max(...xs) - Math.min(...xs), maxOrbs, anchor: c.ay };
  });
  ok('the Censer swings on its chain and breathes a ring of six wisps', r.span > 120 && r.maxOrbs >= 6, r);

  // ---------------------------------------------------------------- the Grave Whisper charm
  r = await ev(() => {
    const { G, P, Charms } = DW; G.enemies = []; P.soul = 0; Charms.give('grave'); Charms.toggle('grave');
    const c = new ENEMY_TYPES.crawler({ type: 'crawler', x: 20, y: 17 }); c.kind = 'crawler'; G.enemies.push(c); c.hurt(99, 1, 'side');
    const withC = P.soul; Charms.toggle('grave'); P.soul = 0;
    const d = new ENEMY_TYPES.crawler({ type: 'crawler', x: 24, y: 17 }); d.kind = 'crawler'; G.enemies.push(d); d.hurt(99, 1, 'side');
    return { withC, without: P.soul };
  });
  ok('Grave Whisper: a slain foe gives 8 soul at half value (4); without the charm none', r.withC === 4 && r.without === 0, r);

  // ---------------------------------------------------------------- the Bonewright
  let b = await fight('os4', 30);
  ok('Bonewright: crossing the line closes the gate and starts the fight', b && b.key === 'bonewright' && b.state === 'fight' && b.gates >= 1, b);
  for (const [name, phase, kind, extra] of [['sweep', 1, null], ['chisels', 1, 'shard:pal'], ['pillars', 1, 'pillar:pal'], ['summon', 2, null, 'heaps'], ['leapSlam', 2, 'shock']]) {
    r = await runAttack(name, phase);
    ok('Bonewright ' + name + '(' + phase + '): runs to its end' + (kind ? ' and spawns ' + kind : name === 'summon' ? '' : ' with a blow'), r.done && r.frames < 880 && (kind ? r.kinds.includes(kind) : name === 'summon' ? true : r.melee), r);
    if (extra === 'heaps') ok('Bonewright summon: two heaps stand up (never more than two)', r.heaps === 2, r.heaps);
  }
  r = await runAttack('summon', 2); r = await ev(() => DW.G.enemies.filter(e => e.kind === 'heap' && !e.dead).length);
  ok('a second summon with two alive adds none', r === 2, r);
  r = await ev(() => {
    const { G } = DW; const b = G.boss; G.projs = []; b.phase = 1; b.hp = b.maxHp; b.invul = false; b.state = 'fight'; b.co = b.brain();
    const out = [b.phase]; b.hp = b.maxHp * 0.45; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase, b.invul);
    for (let i = 0; i < 200 && b.invul; i++) DW.step(1); out.push(b.invul);
    return out;
  });
  ok('Bonewright: a second phase, with an invulnerable shift', r.join() === '1,2,true,false', r);
  await page.screenshot({ path: shot('boss_bonewright.png') });
  r = await ev(() => {
    const { G } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_bonewright, items: G.items.map(i => i.id), gates: G.gates.filter(g => g.closed).length };
  });
  ok('Bonewright: dies, leaves a cache, the way on opens', r.dead && r.flag && r.items.includes('cache_bonewright') && r.gates === 0, r);

  // ---------------------------------------------------------------- the Marrow Tyrant
  b = await fight('os7', 36);
  ok('Marrow: crossing the line closes the gate and starts the fight', b && b.key === 'marrow' && b.state === 'fight' && b.gates >= 1, b);
  for (const [name, phase, kind, minProjs] of [['stomp', 1, 'shock', 0], ['ribs', 1, 'rock:pal', 6], ['crush', 1, 'shock', 0], ['spit', 2, 'bomb', 3], ['hands', 2, 'pillar:pal', 6], ['rattle', 3, 'orb:pal', 24]]) {
    r = await runAttack(name, phase);
    ok('Marrow ' + name + '(' + phase + '): runs to its end and spawns ' + kind + (minProjs ? ' (at least ' + minProjs + ' at once)' : ''), r.done && r.frames < 880 && r.kinds.includes(kind) && r.maxProjs >= minProjs, r);
    if (name === 'crush') ok('Marrow crush: the fist wounds', r.maxDmg === 1, r.maxDmg);
  }
  r = await ev(() => {
    const { G } = DW; const b = G.boss; G.projs = []; b.co = null; b.phase = 1; b.hp = b.maxHp; b.invul = false; b.state = 'fight'; b.co = b.brain();
    const out = [b.phase]; b.hp = b.maxHp * 0.65; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase, b.invul);
    for (let i = 0; i < 200 && b.invul; i++) DW.step(1); out.push(b.invul);
    b.hp = b.maxHp * 0.32; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase); for (let i = 0; i < 200 && b.invul; i++) DW.step(1);
    return out;
  });
  ok('Marrow: three phases, an invulnerable shift between them', r.join() === '1,2,true,false,3', r);
  await page.screenshot({ path: shot('boss_marrow.png') });
  r = await ev(() => {
    const { G } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_marrow, items: G.items.map(i => i.id), owned: DW.Charms.ownedList() };
  });
  ok('Marrow: dies; the seal and Grave Whisper appear', r.dead && r.flag && r.items.includes('seed_marrow') && (r.items.includes('charm_grave') || r.owned.includes('grave')), r);

  // ---------------------------------------------------------------- the trader
  r = await ev(() => { const { enterRoom, G } = DW; enterRoom('os6', { bench: true }); return G.npcs.map(n => n.shop || n.type); });
  ok('the Ossuary trader stands before the Marrow Throne', r.includes('ossuary'), r);
  r = await ev(() => { const l = DW.SHOPS.ossuary.items.map(i => i.gear.join('/')); return l; });
  ok('he sells the Bone Saw and the Boneward', r.join() === 'weapon/bonesaw,cloak/boneward', r);

  // ---------------------------------------------------------------- everything draws
  r = await ev(() => {
    const { G, P, enterRoom } = DW; const out = [];
    enterRoom('os1', { door: 'e' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; P.invuln = 1e9; DW.step(30);
    for (const k of ['heap', 'skullbat', 'censer']) { const e = new ENEMY_TYPES[k]({ type: k, x: 66, y: 12, len: 4 }); e.kind = k; e.x = P.cx + 40; e.y = P.y - 10; G.enemies.push(e); }
    for (const s of ['pile', 'rising', 'walk', 'windup', 'slash', 'skull', 'reform']) { G.enemies[0].currentState = s; G.enemies[0].stateT = 0.3; try { DW.draw(); } catch (e) { out.push(s + ':' + e.message); } }
    return out;
  });
  ok('every Heap state, the Skull Bat and the Censer draw', r.length === 0, r);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
