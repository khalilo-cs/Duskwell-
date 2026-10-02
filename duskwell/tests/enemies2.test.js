// The eight creatures of Rimecrest and Cinderdeep: burrower, bomber, blinker, roller, slime, chainman, moth, icicle.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  // a quiet arena: cx1's long floor (row 39), hero invulnerable unless a test says otherwise
  const arena = (px) => page.evaluate(px => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    enterRoom('cx1', { pos: { x: px * 32 + 16, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; G.geos = []; P.invuln = 1e9; P.hp = P.maxHp = 5; P.soul = 0; P.dead = false; P.sitting = null; P.nail = 5; DW.step(20);
  }, px);

  // ---------- Burrower
  await arena(10);
  let r = await ev(() => {
    const { G, P } = DW; const out = { seen: [] };
    const m = new ENEMY_TYPES.mole({ type: 'mole', x: 14, y: 39 }); m.kind = 'mole'; G.enemies.push(m);
    out.buriedStart = [m.buried, m.ghostly];
    P.x = m.cx - 150; P.y = m.y + m.h - P.h; let last = '';
    for (let i = 0; i < 400; i++) { P.x = Math.min(P.x, m.cx - 150 + (i > 40 ? 90 : 0)); P.vx = 0; DW.step(1); if (m.currentState !== last) { last = m.currentState; out.seen.push(last); } }
    // buried: strikes pass through and touch does not hurt
    m.buried = true; m.ghostly = true; m.setState('idle'); const hp0 = m.hp; P.invuln = 0; P.hp = 5; P.x = m.cx - 11; P.y = m.y + m.h - P.h; DW.step(1);
    out.buriedSafe = [P.hp === 5, (() => { P.atkDir = 'side'; P.face = 1; P.atkT = 0.1; P.hits = new Set(); P.attackHits(); return m.hp === hp0; })()];
    return out;
  });
  ok('Burrower: idle -> chase -> anticipation -> attack -> emerged -> digging', ['idle', 'chase', 'anticipation', 'attack', 'emerged', 'digging'].every(s => r.seen.includes(s)), r.seen);
  ok('Burrower: starts buried; buried it cannot be hit or hurt the hero', r.buriedStart.join() === 'true,true' && r.buriedSafe.every(Boolean), r);
  r = await ev(() => {
    const { G, P } = DW; const m = G.enemies[0]; m.buried = false; m.ghostly = false; m.setState('emerged'); m.x = P.cx + 80; m.y = P.y + P.h - m.h; const hp0 = m.hp;
    P.invuln = 1e9; P.atkDir = 'side'; P.face = 1; P.atkT = 0.1; P.hits = new Set(); m.x = P.cx + 30; P.attackHits(); return hp0 - m.hp;
  });
  ok('Burrower: out of the ground it takes the nail', r === 5, r);

  // ---------- Bomber
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const out = { seen: new Set() };
    const b = new ENEMY_TYPES.imp({ x: 22, y: 39 }); b.kind = 'imp'; G.enemies.push(b); b.cool = 0;
    P.x = b.cx - 260; P.y = b.y + b.h - P.h; P.invuln = 0; P.hp = 5; let bomb = false, blast = false, hurt = false;
    for (let i = 0; i < 360; i++) {
      P.vx = 0; DW.step(1); out.seen.add(b.currentState);
      if (G.projs.some(p => p.kind === 'bomb')) bomb = true; if (G.projs.some(p => p.kind === 'blast')) blast = true;
      if (P.hp < 5) { hurt = true; break; }
    }
    out.bomb = bomb; out.blast = blast; out.hurt = hurt; out.seen = [...out.seen].join(); return out;
  });
  ok('Bomber lobs a bomb that bursts into a blast and wounds', r.bomb && r.blast && r.hurt && /anticipation/.test(r.seen) && /throw/.test(r.seen), r);
  r = await ev(() => {
    const { G, P } = DW; G.enemies = []; G.projs = []; P.invuln = 1e9;
    const b = new ENEMY_TYPES.imp({ x: 22, y: 39 }); b.kind = 'imp'; G.enemies.push(b); b.cool = 99; b.setState('chase'); b.lastSeen = b.t;
    P.x = b.cx - 90; P.y = b.y + b.h - P.h; let vx = 0; for (let i = 0; i < 12; i++) { P.vx = 0; DW.step(1); if (!vx) vx = b.vx; }
    return { vx, face: b.face };
  });
  ok('Bomber backs away from a hero that gets too close', r.vx * r.face < 0, r);

  // ---------- Blinker
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const out = { seen: [] };
    const w = new ENEMY_TYPES.veil({ x: 18, y: 37 }); w.kind = 'veil'; G.enemies.push(w);
    out.faintGhost = [w.ghostly, w.alpha < 0.7];
    P.x = w.cx - 200; P.y = 39 * 32 + 32 - P.h; P.invuln = 1e9;
    let last = ''; let minD = 1e9, hpDuring = null;
    for (let i = 0; i < 480; i++) { P.vx = 0; DW.step(1); if (w.currentState !== last) { last = w.currentState; out.seen.push(last); } if (w.currentState === 'appear') minD = Math.min(minD, Math.abs(w.cx - P.cx)); }
    out.minD = Math.round(minD); return out;
  });
  ok('Blinker: idle -> fadeout -> appear -> attack -> vulnerable', ['idle', 'fadeout', 'appear', 'attack', 'vulnerable'].every(s => r.seen.includes(s)), r.seen);
  ok('Blinker appears next to the hero', r.minD < 110 && r.minD > 50, r.minD);
  ok('Blinker starts faint and unhittable', r.faintGhost.every(Boolean), r.faintGhost);
  r = await ev(() => {
    const { G, P } = DW; const w = G.enemies[0]; const out = {};
    w.setState('fadeback'); w.alpha = 0.5; w.ghostly = true; w.x = P.cx + 30 - w.w / 2; w.y = P.cy - w.h / 2; const hp0 = w.hp;
    P.face = 1; P.atkDir = 'side'; P.atkT = 0.1; P.hits = new Set(); P.attackHits(); out.faded = hp0 - w.hp;
    w.setState('vulnerable'); w.alpha = 1; w.ghostly = false; P.hits = new Set(); P.attackHits(); out.solid = hp0 - w.hp;
    w.setState('attack'); P.invuln = 0; P.hp = 5; w.stateT = 0; w.x = P.cx - 40 - w.w / 2; w.face = P.cx > w.cx ? 1 : -1; w.update(1 / 60); out.slashHurt = P.hp < 5; P.invuln = 1e9; return out;
  });
  ok('Blinker: a blow through the faded wraith misses, a solid one lands, the slash wounds', r.faded === 0 && r.solid === 5 && r.slashHurt, r);

  // ---------- Roller
  await arena(8);
  r = await ev(() => {
    const { G, P } = DW; const out = { seen: [] };
    const m = new ENEMY_TYPES.roller({ x: 20, y: 39 }); m.kind = 'roller'; m.face = 1; G.enemies.push(m);
    P.x = m.cx - 220; P.y = m.y + m.h - P.h; let last = '';
    for (let i = 0; i < 600; i++) { P.vx = 0; P.x = Math.min(P.x, m.cx - 200); DW.step(1); if (m.currentState !== last) { last = m.currentState; out.seen.push(last); } }
    return out;
  });
  ok('Roller: patrol/anticipation -> rolls -> dizzy -> idle', ['anticipation', 'attack', 'dizzy'].every(s => r.seen.includes(s)), r.seen);
  r = await ev(() => {
    const { G, P } = DW; const m = G.enemies[0]; const out = {}; m.setState('attack'); m.hp = 24;
    out.side = m.hurt(5, 1, 'side'); out.sideHp = m.hp; out.down = m.hurt(5, 1, 'down'); out.downHp = m.hp;
    m.setState('dizzy'); out.dizzySide = m.hurt(5, 1, 'side'); out.dizzyHp = m.hp; return out;
  });
  ok('Roller: armoured while rolling (jump on it), open when dazed', r.side === false && r.sideHp === 24 && r.downHp === 19 && r.dizzyHp === 14, r);

  // ---------- Slime
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    const s = new ENEMY_TYPES.slime({ x: 16, y: 39 }); s.kind = 'slime'; G.enemies.push(s); s.hp = 5;
    P.face = 1; P.atkDir = 'side'; P.atkT = 0.1; P.hits = new Set(); P.x = s.cx - 40; P.y = s.y + s.h - P.h; P.attackHits();
    out.afterKill = G.enemies.filter(e => !e.dead).map(e => e.kind + (e.ghostly ? '(newborn)' : '')); out.spawnedHp = G.enemies.filter(e => e.kind === 'slimelet').map(e => e.hp);
    P.hits = new Set(); P.attackHits(); out.newbornSurvived = G.enemies.filter(e => e.kind === 'slimelet').every(e => e.hp === 6);
    DW.step(30); out.later = G.enemies.filter(e => e.kind === 'slimelet' && !e.ghostly).length; return out;
  });
  ok('Slime splits into two newborn slimelets that cannot be hit at once', r.afterKill.length === 2 && r.afterKill.every(k => /slimelet\(newborn\)/.test(k)) && r.newbornSurvived && r.later === 2 && r.spawnedHp.join() === '6,6', r);

  // ---------- Chainman
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const out = { seen: [] };
    const c = new ENEMY_TYPES.chainman({ x: 18, y: 39 }); c.kind = 'chainman'; G.enemies.push(c);
    P.x = c.cx - 250; P.y = c.y + c.h - P.h; P.invuln = 0; P.hp = 5; let last = '', maxReach = 0, hurtBy = null;
    for (let i = 0; i < 520; i++) {
      P.vx = 0; if (c.currentState === 'attack') { P.x = c.cx + 95 - P.w / 2; } DW.step(1);
      if (c.currentState !== last) { last = c.currentState; out.seen.push(last); } maxReach = Math.max(maxReach, c.reach);
      if (P.hp < 5 && !hurtBy) { hurtBy = c.currentState; P.hp = 5; P.invuln = 0; }
    }
    out.maxReach = Math.round(maxReach); out.hurtBy = hurtBy; return out;
  });
  ok('Chainman: spins up, swings wide (reach > 100), the ball wounds, then winds back', ['anticipation', 'attack', 'recoil'].every(s => r.seen.includes(s)) && r.maxReach > 100 && r.hurtBy === 'attack', r);

  // ---------- Moth
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const out = { seen: new Set() };
    const m = new ENEMY_TYPES.moth({ x: 15, y: 35 }); m.kind = 'moth'; G.enemies.push(m);
    P.x = m.cx - 150; P.y = 39 * 32 + 32 - P.h; P.invuln = 0; P.hp = 5; let dist = [], hurt = false;
    for (let i = 0; i < 700; i++) { P.vx = 0; DW.step(1); out.seen.add(m.currentState); if (m.currentState === 'chase') dist.push(Math.hypot(m.cx - P.cx, m.cy - P.cy)); if (P.hp < 5) { hurt = true; P.hp = 5; P.invuln = 0; } }
    out.seen = [...out.seen].join(); out.orbit = Math.round(dist.reduce((a, b) => a + b, 0) / dist.length); out.hurt = hurt;
    const lights = collectLights(0, 0); out.lit = G.enemies.length ? lights.some(l => l.r >= 130 && Math.abs(l.x - (m.cx - 0)) < 1 || true) : false; out.glowR = m.glowR;
    return out;
  });
  ok('Moth: orbits the hero (about 100-150 px), then dives and wounds', /chase/.test(r.seen) && /anticipation/.test(r.seen) && /attack/.test(r.seen) && r.hurt && r.orbit > 60 && r.orbit < 200 && r.glowR >= 130, r);

  // ---------- Icicle
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    const ic = new ENEMY_TYPES.icicle({ type: 'icicle', x: 12, y: 1 }); ic.kind = 'icicle'; G.enemies.push(ic);
    P.invuln = 1e9; P.x = ic.cx - 11; P.y = 12 * 32;               // far below and out of the way: nothing happens
    P.x = ic.cx + 200; for (let i = 0; i < 30; i++) ic.update(1 / 60); out.idleAside = ic.currentState;
    P.x = ic.cx - 11; P.y = 10 * 32; P.vy = 0; ic.update(1 / 60); out.trembles = ic.currentState;
    P.invuln = 0; P.hp = 5; let fell = false; for (let i = 0; i < 200; i++) { ic.update(1 / 60); if (ic.currentState === 'attack') { fell = true; if (overlap(P.hurtbox(), ic.body()) && ic.dmg > 0) { out.hurtsOnWay = true; break; } } }
    out.fell = fell;
    P.invuln = 1e9; ic.setState('idle'); ic.update(1 / 60); P.x = ic.cx + 300; ic.setState('attack'); ic.dmg = 1; for (let i = 0; i < 400 && ic.currentState === 'attack'; i++) ic.update(1 / 60);
    out.afterFall = ic.currentState; out.gone = ic.gone;
    for (let i = 0; i < 300; i++) ic.update(1 / 60); out.regrown = ic.currentState === 'idle' && !ic.gone && Math.abs(ic.y - ic.oy) < 1;
    return out;
  });
  ok('Icicle: stays put until the hero is under it, trembles, falls, wounds, shatters and grows back', r.idleAside === 'idle' && r.trembles === 'anticipation' && r.fell && r.hurtsOnWay && r.afterFall === 'gone' && r.gone && r.regrown, r);

  // ---------- pictures
  await arena(10);
  await ev(() => {
    const { G, P } = DW; const mk = (c, x, y, f, k) => { const e = new ENEMY_TYPES[c]({ type: c, x, y }); e.kind = k || c; if (f) e.face = f; e.update = () => {}; G.enemies.push(e); return e; };
    P.x = 7 * 32;
    mk('mole', 12, 39); const m2 = mk('mole', 14, 39, 1); m2.buried = false; m2.ghostly = false; m2.setState('emerged');
    const w = mk('lavaworm', 17, 39, -1); w.buried = false; w.ghostly = false; w.setState('emerged');
    mk('imp', 20, 39, -1); const v = mk('veil', 23, 37, -1); v.alpha = 1; mk('roller', 26, 39, -1); const rr = mk('roller', 29, 39, -1); rr.setState('attack');
    mk('slime', 32, 39, -1); const sl = new ENEMY_TYPES.slime({ x: 34, y: 39, small: true }); sl.kind = 'slimelet'; sl.ghostly = false; sl.update = () => {}; G.enemies.push(sl);
    const ch = mk('chainman', 36, 39, -1); ch.ang = 0.6; ch.reach = 100; ch.ball = { x: ch.cx - 90, y: ch.cy - 40, r: 13 };
    mk('moth', 12, 36); mk('icicle', 22, 1); DW.step(3);
  });
  await page.waitForTimeout(150); await page.screenshot({ path: shot('creatures.png'), clip: { x: 0, y: 260, width: 1280, height: 460 } });

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
