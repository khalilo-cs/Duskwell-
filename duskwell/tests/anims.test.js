// The six creatures the owner drew frame by frame (husk, crawler, flyer, hopper, spider, warden): in a real fight each one shows
// its walk cycle, its wind-up, its strike and its recovery at the right moments, flinches when struck, and dies on its own death
// frames (a flyer drops to the floor first), then the body is gone.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => typeof AnimArt !== 'undefined' && AnimArt.ready(), null, { timeout: 15000 });
  const ev = (f, a) => page.evaluate(f, a);
  // a quiet arena: cx1's long floor (row 39), the hero invulnerable
  const arena = px => ev(px => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    enterRoom('cx1', { pos: { x: px * 32 + 16, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; G.geos = []; G.fx = []; P.invuln = 1e9; P.hp = P.maxHp = 5; P.dead = false; P.sitting = null; DW.step(20);
  }, px);
  const counts = await ev(() => Object.fromEntries(Object.entries(CREATURE_ANIMS).map(([k, A]) => [k, Object.fromEntries(Object.entries(A).map(([a, f]) => [a, f.length]))])));
  ok('six creatures, each with idle, walk, attack, hurt and death frames', ['husk', 'crawler', 'flyer', 'hopper', 'spider', 'warden'].every(k => counts[k] && counts[k].idle >= 2 && counts[k].walk >= 4 && counts[k].atk >= 4 && counts[k].hurt >= 1 && counts[k].death >= 4), counts);

  // a fight: the creature and the hero a little apart; every frame drawn, every frame shown recorded
  const fight = (kind, o) => ev(([kind, o]) => {
    const { G, P } = DW;
    const e = new ENEMY_TYPES[kind]({ type: kind, x: o.ex, y: o.fly ? 36 : 39, ground: true, face: -1 }); e.kind = kind; G.enemies.push(e);
    if (o.fly) e.home = { x: e.cx, y: e.cy };
    const seen = {}, states = new Set();
    let still = 0, stillWalk = 0;
    for (let i = 0; i < o.n; i++) {
      P.x = o.px * 32; P.vx = 0; DW.step(1); DW.draw();
      if (!e._ad || !e._ad.f) continue;
      const nm = AnimArt.nameOf(kind, e._ad.f); seen[nm] = (seen[nm] || 0) + 1; states.add(e.currentState);
      if (e.onGround && Math.abs(e.vx) < 1 && e.currentState !== 'anticipation') { still++; if (nm.startsWith('walk')) stillWalk++; }
    }
    return { seen, states: [...states], still, stillWalk };
  }, [kind, o]);
  const has = (r, part, idx) => Object.keys(r.seen).some(k => k === part + ':' + idx);
  const distinct = (r, part) => Object.keys(r.seen).filter(k => k.startsWith(part + ':')).length;

  for (const [kind, o, last] of [['husk', { ex: 22, px: 14, n: 420 }, 3], ['hopper', { ex: 20, px: 14, n: 420 }, 4], ['spider', { ex: 22, px: 14, n: 420 }, 4], ['warden', { ex: 20, px: 14, n: 480 }, 4]]) {
    await arena(o.px);
    const r = await fight(kind, o);
    const W = last >= 4 ? 2 : 1;
    ok(kind + ': walks on its walk cycle (3+ frames), and never treads in place', (distinct(r, 'walk') >= 3 || kind === 'hopper') && r.stillWalk === 0, r);
    ok(kind + ': winds up, strikes and recovers on the drawn attack frames', has(r, 'atk', 0) && has(r, 'atk', W) && has(r, 'atk', last), r.seen);
  }
  // the biters: the crawler walking into the hero, the flyer reaching him
  await arena(14);
  let r = await fight('crawler', { ex: 20, px: 16, n: 300 });
  ok('crawler: walks and bites (all its attack frames) when the hero is in front of it', distinct(r, 'walk') >= 3 && distinct(r, 'atk') === 4, r.seen);
  await arena(14);
  r = await fight('flyer', { ex: 20, px: 14, n: 300, fly: true });
  ok('flyer: beats its wings (all six frames) and strikes when it reaches the hero', distinct(r, 'idle') === 6 && distinct(r, 'atk') >= 3, r.seen);

  // standing still breathes on the idle frames
  await arena(10);
  r = await ev(() => {
    const { G } = DW; const e = new ENEMY_TYPES.warden({ type: 'warden', x: 30, y: 39 }); e.kind = 'warden'; e.update = function (dt) { this.t += dt; this.vx = 0; this.physics(dt); }; G.enemies.push(e);
    const seen = new Set(); for (let i = 0; i < 90; i++) { DW.step(1); DW.draw(); seen.add(AnimArt.nameOf('warden', e._ad.f)); } return [...seen];
  });
  ok('standing still: the two idle frames, nothing else', r.length === 2 && r.every(n => n.startsWith('idle')), r);

  // struck: the hurt frame
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const e = new ENEMY_TYPES.husk({ type: 'husk', x: 13, y: 39 }); e.kind = 'husk'; G.enemies.push(e); DW.step(2); DW.draw();
    e.hp = 99; e.hurt(1, 1); DW.step(1); DW.draw(); const a = AnimArt.nameOf('husk', e._ad.f);
    for (let i = 0; i < 40; i++) { DW.step(1); DW.draw(); } return [a, AnimArt.nameOf('husk', e._ad.f)];
  });
  ok('struck: shows the hurt frame, then goes back to moving', r[0] === 'hurt:0' && r[1] !== 'hurt:0', r);

  // dying: the death frames where it fell; a flyer drops to the floor first; then nothing is left
  await arena(10);
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    for (const [k, x, y] of [['husk', 16, 39], ['warden', 20, 39], ['flyer', 24, 33], ['spider', 28, 39]]) { const e = new ENEMY_TYPES[k]({ type: k, x, y, ground: true }); e.kind = k; e.update = function (dt) { this.t += dt; }; G.enemies.push(e); }
    DW.step(1); DW.draw();
    for (const e of G.enemies) { e.hp = 0; e.kill(); }
    DW.step(1);
    const c = G.fx.filter(f => f.type === 'corpse');
    out.kinds = c.map(f => f.kind).sort(); out.enemies = G.enemies.length;
    const fl = c.find(f => f.kind === 'flyer'); out.flyerFalls = fl.fallT > 0.1; out.flyerFloor = fl.y; out.floor = 40 * 32 + 1;
    out.walkerStays = c.filter(f => f.kind !== 'flyer').every(f => f.fallT === 0 && f.y === 40 * 32 + 1);
    DW.step(30); DW.draw(); out.mid = G.fx.filter(f => f.type === 'corpse').length;
    DW.step(90); out.after = G.fx.filter(f => f.type === 'corpse').length;
    return out;
  });
  ok('dying: each leaves its death in place of the creature', r.kinds.join() === 'flyer,husk,spider,warden' && r.enemies === 0 && r.mid === 4, r);
  ok('dying: the flyer drops to the floor, the walkers fall where they stood', r.flyerFalls && r.flyerFloor === r.floor && r.walkerStays, r);
  ok('dying: the body is gone after its death', r.after === 0, r);

  // the Brood Mother's spiderlings are spiders too
  r = await ev(() => { const s = new ENEMY_TYPES.spider({ type: 'spider', x: 20, y: 39, ground: true }); s.kind = 'brood_child'; DW.G.enemies.push(s); DW.step(1); DW.draw(); return s._ad && AnimArt.nameOf('brood_child', s._ad.f); });
  ok('the Brood Mother\'s spiderlings use the spider\'s frames', !!r, r);

  // the other twenty: each, in a real fight, is drawn from its own frames, shows its attack frames, and (but the icicle, which
  // shatters and grows back) dies on its death frames
  const MORE = { spitter: [22, 39], shroom: [19, 39], sentinel: [22, 39], chainman: [20, 39], lensling: [21, 39], imp: [24, 39], slime: [20, 39], lunarhare: [22, 39], ram: [24, 39], roller: [24, 39],
    mole: [20, 39, { type: 'mole' }], lavaworm: [20, 39, { type: 'lavaworm' }], heap: [17, 39], shard: [24, 39], diver: [20, 35], moth: [20, 35], jelly: [16, 37], skullbat: [20, 35], veil: [20, 36], orrery: [18, 36], censer: [17, 33, { len: 4 }], icicle: [14, 30] };
  const bad = {};
  for (const [k, [x, y, extra]] of Object.entries(MORE)) {
    await arena(14);
    const q = await ev(([k, x, y, extra]) => {
      const { G, P } = DW;
      const e = new ENEMY_TYPES[k](Object.assign({ type: k, x, y, ground: true }, extra || {})); e.kind = k; G.enemies.push(e);
      const seen = {};
      for (let i = 0; i < 420; i++) {
        P.x = k === 'icicle' ? x * 32 + 8 - P.w / 2 : 14 * 32; P.vx = 0;
        DW.step(1); DW.draw();
        if (e._ad && e._ad.f) { const n = AnimArt.nameOf(k, e._ad.f); if (n) seen[n.split(':')[0]] = 1; }
      }
      e.hp = 0; e.kill(); DW.step(1); DW.draw();
      if (k === 'heap') { if (e._ad && e._ad.f) { const n = AnimArt.nameOf(k, e._ad.f); if (n) seen[n.split(':')[0]] = 1; } e.kill(); DW.step(1); }   // its first death leaves the skull
      return { drawn: Object.keys(seen).length > 0, seen: Object.keys(seen), corpse: G.fx.some(f => f.type === 'corpse' && f.kind === k) };
    }, [k, x, y, extra]);
    const attacks = !['jelly', 'orrery'].includes(k) || q.seen.includes('atk');
    if (!q.drawn || !q.seen.includes('atk') && !['jelly', 'orrery', 'mole', 'lavaworm'].includes(k) || (k !== 'icicle' && !q.corpse) || !attacks) bad[k] = q;
  }
  ok('the other twenty creatures: drawn from their frames, attacking on them, dying on them', Object.keys(bad).length === 0, bad);

  // a look at all six side by side
  await arena(6);
  await ev(() => {
    const { G, P } = DW; ['husk', 'crawler', 'flyer', 'hopper', 'spider', 'warden'].forEach((k, i) => { const e = new ENEMY_TYPES[k]({ type: k, x: 9 + i * 3, y: k === 'flyer' ? 37 : 39, ground: true }); e.kind = k; e.face = -1; e.update = function (dt) { this.t += dt; }; G.enemies.push(e); });
    DW.step(2);
  });
  await page.screenshot({ path: shot('anims.png') });

  ok('no page errors', errors.length === 0, errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
