// The Lunar Observatory: fields of weak gravity, the Moonstep charm, the Lensling's ray, the Orrery, the Lunar Hare,
// the Stargazer and the Eclipse Regent, and the sealed door at the end of the Roc's Nest.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const setup = (room, door, inv) => ev(([room, door, inv]) => {
    const { G, P, enterRoom, Charms, Gear } = DW; Charms.reset(); Gear.reset(); G.flags = {}; G.shade = null;
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, { door }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0;
    G.enemies = []; G.projs = []; G.geos = [];
    P.invuln = inv ? 0 : 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; P.soul = 0; DW.step(5);
  }, [room, door, !!inv]);
  const fight = (room, px) => ev(([room, px]) => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, { door: 'w' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0;
    P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; DW.step(5);
    P.x = px * 32; DW.step(1);
    for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const b = G.boss; return b ? { key: b.bossKey, state: b.state, hp: b.hp, gates: G.gates.length, fly: !b.grav } : null;
  }, [room, px]);
  const runAttack = (name, phase) => ev(([name, phase]) => {
    const { G, P } = DW; const b = G.boss, L = G.level;
    b.phase = phase; b.hp = b.maxHp; b.invul = false; b.tele = 0; b.alpha = 1; b.ghostly = false; b.casting = false;
    G.projs = []; G.eclipseT = 0; b.x = (L.pw / 2 + 140) - b.w / 2; b.y = b.hoverY - b.h / 2; b.vx = b.vy = 0; b.face = -1;
    const kinds = new Set(); let done = false, minAlpha = 1, maxProjs = 0, maxRays = 0, zone = false, eclipse = 0; const ys = new Set(); let bx0 = b.cx;
    b.co = (function* () { yield* b[name](); done = true; })();
    let f = 0; for (; f < 1500 && !done; f++) {
      P.x = L.pw / 2 - 180; P.y = G.floorY - P.h - 2; P.vx = 0; DW.step(1);
      for (const p of G.projs) { kinds.add(p.kind + (p.pal ? ':pal' : '')); if (p.kind === 'wave' && !p.friendly) ys.add(Math.round(p.y)); }
      maxProjs = Math.max(maxProjs, G.projs.length); maxRays = Math.max(maxRays, G.projs.filter(p => p.kind === 'ray').length); minAlpha = Math.min(minAlpha, b.alpha);
      if (L.gravs.length) zone = true; eclipse = Math.max(eclipse, G.eclipseT);
    }
    return { done, frames: f, kinds: [...kinds], maxProjs, maxRays, minAlpha, zone, zoneAfter: L.gravs.length, eclipse, eclipseAfter: G.eclipseT, waveHeights: ys.size, moved: Math.abs(b.cx - bx0) };
  }, [name, phase]);

  // ---------------------------------------------------------------- the way in
  let r = await ev(() => { const W = DW.WORLD.rooms; return { a: W.sc7.doors.find(d => d.id === 'e'), b: W.lo1.doors.find(d => d.id === 'w'), n: Object.keys(W).filter(k => /^lo[1-7]$/.test(k)).length, total: Object.keys(W).length, gate: W.sc7.arena.gates.find(g => g.x === 51) }; });
  ok("the Roc's Nest east door leads to the Gate of Stars and is sealed until the Roc is beaten; seven first rooms", r.a && r.b && r.a.to === 'lo1' && r.a.toDoor === 'w' && r.b.to === 'sc7' && r.b.toDoor === 'e' && r.gate && r.gate.close === 'always' && r.n === 7, r);
  r = await ev(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom('sc7', { door: 'w' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; DW.step(3);
    const shut = G.level.get(51, 20) === 5; G.flags.boss_roc = true; enterRoom('sc7', { door: 'w' }); DW.step(3);
    const open = G.level.get(51, 20) !== 5;
    return { shut, open, tile: G.level.get(51, 20) };
  });
  ok('the sealed door is shut at first and open once the Roc is down', r.shut && r.open, r);

  // ---------------------------------------------------------------- weak gravity
  const jumpApex = async (room, x, charm) => {
    await setup(room, 'w');
    await ev(([x, charm]) => { const { P, Charms } = DW; if (charm) { Charms.give('moonstep'); Charms.toggle('moonstep'); } P.x = x * 32; P.y = 19 * 32 - P.h + 32; P.vx = 0; DW.step(20); }, [x, charm]);
    await page.keyboard.down('KeyZ');
    const apex = await ev(() => { const { P } = DW; const y0 = P.y; let top = y0; for (let i = 0; i < 200; i++) { DW.step(1); top = Math.min(top, P.y); if (i > 20 && P.onGround) break; } return y0 - top; });
    await page.keyboard.up('KeyZ'); await ev(() => DW.step(60));
    return apex;
  };
  const normal = await jumpApex('lo1', 10), moon = await jumpApex('lo1', 30);
  ok('a held jump rises far higher in the field of weak gravity (inside x21..44) than outside', moon > normal * 1.8 && normal > 90 && normal < 140, { normal, moon });
  const fallTime = async charm => {
    await setup('lo1', 'w');
    return ev(charm => { const { P, Charms } = DW; if (charm) { Charms.give('moonstep'); Charms.toggle('moonstep'); } P.x = 6 * 32; P.y = 4 * 32; P.vy = 0; P.vx = 0; P.onGround = false; DW.step(1); let n = 0; for (; n < 400 && !P.onGround; n++) DW.step(1); return n; }, charm);
  };
  const t0 = await fallTime(false), t1 = await fallTime(true);
  ok('Moonstep makes a long fall take longer (slower fall speed)', t1 > t0 * 1.15, { t0, t1 });

  // ---------------------------------------------------------------- the Lunar Hare
  const hareAir = async x => {
    await setup('lo1', 'w');
    return ev(x => {
      const { G, P } = DW; G.enemies = []; P.x = (x - 6) * 32; P.y = 19 * 32 + 32 - P.h;
      const h = new ENEMY_TYPES.lunarhare({ type: 'lunarhare', x, y: 19 }); h.kind = 'lunarhare'; h.dmg = 0; h.wait = 0.1; G.enemies.push(h);
      let air = 0, max = 0, started = false; const x0 = h.cx;
      for (let i = 0; i < 300; i++) { P.x = (x - 6) * 32; DW.step(1); if (!h.onGround) { started = true; air++; max = Math.max(max, x0 - h.cy); } else if (started && air > 5) break; }
      return { air, dist: Math.abs(h.cx - x0) };
    }, x);
  };
  const hn = await hareAir(14), hm = await hareAir(23);
  ok('a Lunar Hare in weak gravity hangs in the air far longer than one outside it', hm.air > hn.air * 1.6 && hn.air > 20, { hn, hm });

  // ---------------------------------------------------------------- the Lensling and its ray
  await setup('lo1', 'w', true);
  r = await ev(() => {
    const { G, P } = DW; G.enemies = []; G.projs = [];
    const l = new ENEMY_TYPES.lensling({ type: 'lensling', x: 56, y: 19 }); l.kind = 'lensling'; l.cool = 0; G.enemies.push(l);
    P.x = 50 * 32; P.y = 19 * 32 + 32 - P.h; P.invuln = 0; P.hp = P.maxHp = 9;
    const seen = new Set(); let rayAt = -1, hurtAt = -1;
    for (let i = 0; i < 300; i++) { P.x = 50 * 32; P.invuln = 0; DW.step(1); seen.add(l.currentState); if (rayAt < 0 && G.projs.some(p => p.kind === 'ray')) rayAt = i; if (hurtAt < 0 && P.hp < 9) { hurtAt = i; break; } }
    return { seen: [...seen], rayAt, hurtAt, hp: P.hp, aim: l.aim };
  });
  ok('the Lensling swings its lens, locks, fires a ray along the line and the ray wounds the hero standing in it', r.seen.includes('anticipation') && r.rayAt > 30 && r.hurtAt >= r.rayAt && r.hp === 8, r);
  r = await ev(() => {                                                     // standing off the line (above it) the ray misses
    const { G, P } = DW; G.enemies = []; G.projs = []; P.hp = P.maxHp = 9; P.invuln = 0;
    P.x = 45 * 32; P.y = 19 * 32 + 32 - P.h; P.vx = P.vy = 0; DW.step(60); P.hp = 9;
    spawnRay(40 * 32, 18 * 32 + 16, 0, { tele: 0.1, dur: 0.3, rw: 14 });
    P.x = 45 * 32; P.y = 19 * 32 + 32 - P.h; P.vx = P.vy = 0; P.onGround = true; DW.step(60);      // the ray runs along y = 592 (row 18): the hero's box is 602..640, well clear
    let min = 9; for (let i = 0; i < 40; i++) { P.x = 45 * 32; P.invuln = 0; DW.step(1); min = Math.min(min, P.hp); }
    const p0 = G.projs.length;
    G.projs = []; spawnRay(40 * 32, 19 * 32 + 12, 0, { tele: 0.1, dur: 0.3, rw: 14 });
    let hit = 9; for (let i = 0; i < 40; i++) { P.x = 45 * 32; P.invuln = 0; DW.step(1); hit = Math.min(hit, P.hp); }
    return { miss: min, hit, len: rayLength(20 * 32, 10 * 32, Math.PI / 2, 760) };
  });
  ok('a ray that passes below the hero misses; one through the hero wounds; a ray stops at a wall', r.miss === 9 && r.hit < 9 && r.len < 760, r);

  // ---------------------------------------------------------------- the Orrery
  await setup('lo1', 'w', true);
  r = await ev(() => {
    const { G, P } = DW; G.enemies = []; G.projs = [];
    const o = new ENEMY_TYPES.orrery({ type: 'orrery', x: 30, y: 8 }); o.kind = 'orrery'; G.enemies.push(o);
    P.x = 30 * 32; P.y = 17 * 32; P.invuln = 0; P.hp = P.maxHp = 9; P.vy = 0;
    const p1 = o.orbPos(0); DW.step(30); const p2 = o.orbPos(0);
    const moved = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    o.x = P.cx - 46 - o.w / 2; o.y = P.cy - o.h / 2; o.currentState = 'idle'; o.orbA = 0; let hp = 9;                       // an orb lies at 46 px: it wounds
    for (let i = 0; i < 20; i++) { o.vx = o.vy = 0; o.x = P.cx - 46 - o.w / 2; o.y = P.cy - o.h / 2; o.orbA = 0; P.x = 30 * 32; P.y = 17 * 32; DW.step(1); hp = Math.min(hp, P.hp); }
    return { moved: Math.round(moved), hp, hpMax: o.hp };
  });
  ok('the Orrery: its orbs circle (they move) and wound on touch', r.moved > 15 && r.hp < 9, r);

  // ---------------------------------------------------------------- the Stargazer
  let b = await fight('lo4', 12);
  ok('Stargazer: crossing the line closes the gate and starts the fight (a flier)', b && b.key === 'stargazer' && b.state === 'fight' && b.gates >= 1 && b.fly, b);
  for (const [name, phase, kind, extra] of [['rays', 1, 'ray:pal', 1], ['rays', 2, 'ray:pal', 3], ['starfall', 1, 'rock:pal'], ['orbit', 2, 'orb:pal'], ['blink', 2, 'ray:pal', 'fade'], ['lowgrav', 2, 'rock:pal', 'zone']]) {
    r = await runAttack(name, phase);
    ok('Stargazer ' + name + '(' + phase + '): runs to its end and spawns ' + kind, r.done && r.frames < 1480 && r.kinds.includes(kind), r);
    if (name === 'rays') ok('Stargazer rays(' + phase + '): ' + extra + ' ray(s) at once', r.maxRays >= extra, r.maxRays);
    if (extra === 'fade') ok('Stargazer blink: fades out and back', r.minAlpha < 0.2, r);
    if (extra === 'zone') ok('Stargazer lowgrav: a field of weak gravity appears and is gone at the end', r.zone && r.zoneAfter === 0, r);
  }
  r = await ev(() => {                                                      // killed in the middle of the field, the field goes with him
    const { G } = DW; const b = G.boss, L = G.level; G.projs = [];
    b.phase = 2; b.invul = false; b.hp = b.maxHp; b.co = (function* () { yield* b.lowgrav(); })();
    for (let i = 0; i < 90; i++) DW.step(1);
    const during = L.gravs.length; b.hp = 1; b.hurt(5, 1, 'side'); for (let i = 0; i < 20; i++) DW.step(1);
    return { during, after: L.gravs.length };
  });
  ok('Stargazer: the weak-gravity field is removed when he dies', r.during === 1 && r.after === 0, r);
  await page.screenshot({ path: shot('boss_stargazer.png') });
  r = await ev(() => {
    const { G } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; G.gates.forEach(g => 0);
    b.hurt(5, 1, 'side'); for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 60; i++) DW.step(1);
    return { dead: b.dead, flag: G.flags.boss_stargazer, items: G.items.map(i => i.id), gates: G.gates.filter(g => g.closed).length };
  });
  ok('Stargazer: dies, leaves a cache, the way on opens', r.dead && r.flag && r.items.includes('cache_stargazer') && r.gates === 0, r);

  // ---------------------------------------------------------------- the Eclipse Regent
  b = await fight('lo7', 12);
  ok('Regent: crossing the line closes the gate and starts the fight (a flier)', b && b.key === 'regent' && b.state === 'fight' && b.gates >= 1 && b.fly, b);
  for (const [name, phase, kind, extra] of [['crescents', 1, 'wave'], ['fullmoon', 1, 'orb:pal'], ['beams', 1, 'beam:pal'], ['newmoon', 2, 'ray:pal', 'dark'], ['tide', 2, 'wave', 'tide'], ['totality', 3, 'ray:pal', 'corona']]) {
    r = await runAttack(name, phase);
    ok('Regent ' + name + '(' + phase + '): runs to its end and spawns ' + kind, r.done && r.frames < 1480 && r.kinds.includes(kind), r);
    if (name === 'crescents') ok('Regent crescents: low and high alternate (two heights)', r.waveHeights >= 2, r.waveHeights);
    if (extra === 'dark') ok('Regent newmoon: the hall goes dark and the light comes back', r.eclipse === 1 && r.eclipseAfter === 0, r);
    if (extra === 'tide') ok('Regent tide: gravity falls for the attack and returns', r.zone && r.zoneAfter === 0, r);
    if (extra === 'corona') ok('Regent totality: a searchlight of thirteen rays, one after another over a couple of seconds', r.maxRays >= 4 && r.frames > 150, r);
  }
  r = await ev(() => {
    const { G } = DW; const b = G.boss; G.projs = []; b.co = null; b.phase = 1; b.hp = b.maxHp; b.invul = false; b.state = 'fight'; b.co = b.brain();
    const out = [b.phase]; b.hp = b.maxHp * 0.65; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase, b.invul);
    for (let i = 0; i < 200 && b.invul; i++) DW.step(1); out.push(b.invul);
    b.hp = b.maxHp * 0.32; b.hurt(1, 1, 'side'); DW.step(12); out.push(b.phase); for (let i = 0; i < 200 && b.invul; i++) DW.step(1);
    return out;
  });
  ok('Regent: three phases, an invulnerable shift between them', r.join() === '1,2,true,false,3', r);
  await page.screenshot({ path: shot('boss_regent.png') });
  r = await ev(() => {                                                      // the dark falls and the Regent dies in it: the light must come back
    const { G } = DW; const b = G.boss; G.eclipseT = 1; DW.step(90); const dark = G.eclipse;
    b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side');
    for (let i = 0; i < 500 && !b.dead; i++) DW.step(1); for (let i = 0; i < 120; i++) DW.step(1);
    return { dark: Math.round(dark * 10) / 10, dead: b.dead, flag: G.flags.boss_regent, items: G.items.map(i => i.id), owned: DW.Charms.ownedList(), eclipse: G.eclipse, zones: G.level.gravs.length };
  });
  ok('Regent: dies in the dark; the light returns; the seal and Moonstep appear', r.dark > 0.9 && r.dead && r.flag && r.eclipse === 0 && r.zones === 0 && r.items.includes('seed_regent') && (r.items.includes('charm_moonstep') || r.owned.includes('moonstep')), r);

  // ---------------------------------------------------------------- the trader and the drawing
  r = await ev(() => { const { enterRoom, G } = DW; enterRoom('lo6', { bench: true }); return { npcs: G.npcs.map(n => n.shop || n.type), items: DW.SHOPS.lunar.items.map(i => i.gear.join('/')) }; });
  ok('the Observatory trader sells the Star Rapier', r.npcs.includes('lunar') && r.items.join() === 'weapon/rapier', r);
  r = await ev(() => {
    const { G, P, enterRoom } = DW; const out = [];
    enterRoom('lo1', { door: 'w' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; P.invuln = 1e9; DW.step(30);
    for (const k of ['lensling', 'orrery', 'lunarhare']) { const e = new ENEMY_TYPES[k]({ type: k, x: 30, y: 12 }); e.kind = k; e.x = P.cx + 40; e.y = P.y - 10; G.enemies.push(e); }
    G.enemies[0].currentState = 'anticipation'; G.enemies[0].stateT = 0.8; G.enemies[0].aim = 0.4; G.eclipse = 0.8;
    try { DW.draw(); } catch (e) { out.push(e.message); }
    G.eclipse = 0; return out;
  });
  ok('the Lunar creatures and the eclipse overlay draw', r.length === 0, r);
  await ev(() => { const { G, P, enterRoom } = DW; enterRoom('lo2', { door: 'w' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; P.invuln = 1e9; DW.step(60); });
  await page.waitForTimeout(100); await page.screenshot({ path: shot('lunar_lo2.png') });
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
