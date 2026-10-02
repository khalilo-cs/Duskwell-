// The Rime Queen (fr8) and the Cinder Colossus (em8): arena, every attack runs to its end, damage lands, phases, death, rewards,
// plus the Cinder Edge charm they guard.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  // enter the arena, cross the trigger line, wait out the intro; the hero cannot be hurt unless a test says so
  const fight = (room, door, px) => ev(([room, door, px]) => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, { door }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0;
    P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; DW.step(5);
    P.x = px * 32; DW.step(1);
    for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const b = G.boss; return b ? { key: b.bossKey, state: b.state, hp: b.hp, floorY: G.floorY, gates: G.gates.length } : null;
  }, [room, door, px]);
  // run one attack to its end; returns what it left behind
  const runAttack = (name, phase) => ev(([name, phase]) => {
    const { G, P } = DW; const b = G.boss;
    b.phase = phase; b.hp = b.maxHp; b.invul = false; b.tele = 0; b.alpha = 1; b.ghostly = false; b.grav = b.bossKey === 'queen' ? false : true;
    G.projs = []; b.x = (b.bossKey === 'queen' ? 22 : 30) * 32; b.y = b.bossKey === 'queen' ? b.hoverY - b.h / 2 : G.floorY - b.h - 2; b.vx = b.vy = 0;
    P.x = (b.cx / 32 - 8) * 32; P.y = G.floorY - P.h - 2; P.vx = P.vy = 0;
    const x0 = b.cx, seen = {}, kinds = new Set(); let done = false, melee = false, minAlpha = 1, maxProjs = 0;
    b.co = (function* () { yield* b[name](); done = true; })();
    let f = 0; for (; f < 900 && !done; f++) {
      P.x = (G.level.pw / 2 - 260); P.vx = 0; DW.step(1);
      for (const p of G.projs) kinds.add(p.kind + (p.pal ? ':pal' : '')); maxProjs = Math.max(maxProjs, G.projs.length);
      if (b.melee) melee = true; minAlpha = Math.min(minAlpha, b.alpha);
    }
    return { done, frames: f, kinds: [...kinds], melee, minAlpha, moved: Math.abs(b.cx - x0), maxProjs, y: b.cy, state: b.state };
  }, [name, phase]);

  // ===================================================== Rime Queen
  let r = await fight('fr8', 'w', 12);
  ok('Queen: crossing the line closes the gate and starts the fight', r && r.key === 'queen' && r.state === 'fight' && r.gates >= 1, r);
  for (const [name, phase, kind] of [['shards', 1, 'shard:pal'], ['icefall', 1, 'rock:pal'], ['ring', 1, 'orb:pal'], ['sweep', 2, 'shard:pal'], ['beams', 2, 'beam:pal'], ['blink', 3, 'shard:pal']]) {
    r = await runAttack(name, phase);
    ok('Queen ' + name + ': runs to its end and spawns ' + kind, r.done && r.frames < 880 && r.kinds.includes(kind), r);
    if (name === 'sweep') ok('Queen sweep: crosses the hall with a body blow', r.melee && r.moved > 400, r.moved);
    if (name === 'blink') ok('Queen blink: fades out and comes back', r.minAlpha < 0.2, r.minAlpha);
  }
  r = await ev(() => {                                              // a fan of shards aimed at a hero who stands still hurts
    const { G, P } = DW; const b = G.boss; G.projs = []; b.co = null; b.x = 22 * 32; b.y = b.hoverY - b.h / 2; b.vx = b.vy = 0; b.state = 'fight'; b.dmg = 0;
    P.invuln = 0; P.hp = 9; P.x = 14 * 32; P.y = G.floorY - P.h - 2; P.vx = 0; b.fan(3, 0.2, 360);
    for (let i = 0; i < 90 && P.hp === 9; i++) { P.vx = 0; DW.step(1); }
    const hp = P.hp; P.invuln = 1e9; return hp;
  });
  ok('Queen: her shards wound a still hero', r < 9, r);
  r = await ev(() => {                                              // phases: two thresholds, each with an invulnerable shift
    const { G, P } = DW; const b = G.boss; G.projs = []; b.phase = 1; b.hp = b.maxHp; b.invul = false; b.state = 'fight'; b.co = b.brain();
    const out = [b.phase]; b.hurt(1, 1, 'side'); b.hp = b.maxHp * 0.65; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase, b.invul);
    for (let i = 0; i < 200 && b.invul; i++) DW.step(1); out.push(b.invul);
    b.hp = b.maxHp * 0.32; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase); for (let i = 0; i < 200 && b.invul; i++) DW.step(1);
    return out;
  });
  ok('Queen: three phases, an invulnerable shift between them', r.join() === '1,2,true,false,3', r);
  r = await ev(() => {
    const { G, P } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side');
    const st = b.state; for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { st, dead: b.dead, flag: G.flags.boss_queen, items: G.items.map(i => i.id).sort(), gate: G.gates.filter(g => g.closed).length };
  });
  ok('Queen: dies, the flag is set, the seal and the Lantern Wick appear, the gate opens', r.st === 'dying' && r.dead && r.flag && r.items.includes('seed_queen') && r.items.includes('charm_wick') && r.gate === 0, r);
  await page.screenshot({ path: shot('boss_queen_after.png') });

  // ===================================================== Cinder Colossus
  r = await fight('em8', 'e', 36);
  ok('Colossus: crossing the line (from the right) starts the fight', r && r.key === 'colossus' && r.state === 'fight' && r.gates >= 1, r);
  for (const [name, phase, kind] of [['smash', 1, 'shock'], ['smash', 3, 'rock:pal'], ['lob', 3, 'bomb'], ['roll', 1, 'rock:pal'], ['geysers', 2, 'pillar:pal'], ['rain', 2, 'rock:pal'], ['quake', 3, 'blast']]) {
    r = await runAttack(name, phase);
    ok('Colossus ' + name + '(' + phase + '): runs to its end and spawns ' + kind, r.done && r.frames < 880 && r.kinds.includes(kind), r);
    if (name === 'roll') ok('Colossus roll: charges across the floor', r.moved > 150, r.moved);
  }
  r = await ev(() => {                                              // the blow itself wounds a hero standing in front of it
    const { G, P } = DW; const b = G.boss; G.projs = []; b.state = 'fight'; b.invul = false; b.tele = 0; b.co = null; b.x = 30 * 32; b.y = G.floorY - b.h - 2; b.vx = 0; b.face = -1;
    P.invuln = 0; P.hp = 9; P.x = b.cx - 80; P.y = G.floorY - P.h - 2; P.vx = 0;
    b.co = (function* () { yield* b.smash(); })();
    for (let i = 0; i < 120 && P.hp === 9; i++) { P.x = b.cx - 80; P.vx = 0; DW.step(1); }
    const hp = P.hp; P.invuln = 1e9; return hp;
  });
  ok('Colossus: the smash wounds a hero in front of it (two masks)', r <= 7, r);
  r = await ev(() => {
    const { G, P } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.co = b.brain(); b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_colossus, items: G.items.map(i => i.id).sort(), owned: DW.Charms.ownedList() };   // the hero stands by the pickup, so it may already be taken
  });
  ok('Colossus: dies; the seal and the Cinder Edge appear', r.dead && r.flag && r.items.includes('seed_colossus') && (r.items.includes('charm_cinder') || r.owned.includes('cinder')), r);

  // ===================================================== Cinder Edge
  r = await ev(() => {
    const { G, P, Charms, enterRoom } = DW; Charms.reset(); G.flags = {}; Charms.give('cinder'); Charms.toggle('cinder');
    enterRoom('cx1', { pos: { x: 10 * 32 + 16, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; G.projs = [];
    P.invuln = 1e9; P.nail = 5; P.dead = false; DW.step(20);
    const h = new ENEMY_TYPES.husk({ type: 'husk', x: 13, y: 39 }); h.kind = 'husk'; h.hp = h.maxHp = 40; G.enemies.push(h);
    P.x = h.cx - 40; P.y = h.y + h.h - P.h; P.face = 1; P.atkDir = 'side'; P.atkT = 0.1; P.hits = new Set(); P.attackHits();
    const afterHit = h.hp, burning = h.burnT > 0; const hpSeries = [h.hp];
    for (let i = 0; i < 60; i++) { P.x = h.cx - 400; DW.step(1); hpSeries.push(h.hp); }
    return { afterHit, burning, final: h.hp, drop: afterHit - h.hp };
  });
  ok('Cinder Edge: a hit leaves a burn that wounds three more a moment later', r.burning && r.afterHit === 35 && r.final === 32, r);
  r = await ev(() => {
    const { G, P, Charms } = DW; Charms.reset(); G.enemies = [];
    const h = new ENEMY_TYPES.husk({ type: 'husk', x: 13, y: 39 }); h.kind = 'husk'; h.hp = h.maxHp = 40; G.enemies.push(h);
    P.x = h.cx - 40; P.y = h.y + h.h - P.h; P.face = 1; P.atkDir = 'side'; P.atkT = 0.1; P.hits = new Set(); P.attackHits();
    for (let i = 0; i < 60; i++) { P.x = h.cx - 400; DW.step(1); }
    return h.hp;
  });
  ok('Without the charm there is no burn', r === 35, r);

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
