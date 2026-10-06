// The parts of the creature sheet: every creature has its loose parts cut into the atlas, a creature that dies falls to those pieces
// (they fly, land on the floor, hop once, lie and fade), and the cracked mask of the icon sheet shows on the last mask and on a mask
// that has just gone.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => Shards.ready() && FxArt.ready() && AnimArt.ready() && IconArt.ready(), null, { timeout: 20000 });

  // ---- the atlas
  let r = await ev(() => {
    const img = Shards.img || null, kinds = Object.keys(SHARD_RECTS), bad = [], few = [];
    const probe = new Image(); probe.src = 'art/creatures/shards.webp';
    return new Promise(res => { const go = () => {
      const W = probe.naturalWidth, H = probe.naturalHeight;
      for (const k of kinds) { const M = SHARD_RECTS[k]; if (M.parts.length < 4) few.push(k); if (!(M.ref > 30)) bad.push([k, 'ref']); for (const p of M.parts) if (p[0] < 0 || p[1] < 0 || p[0] + p[2] > W || p[1] + p[3] > H || p[2] < 8 || p[3] < 8) bad.push([k, p]); }
      res({ kinds: kinds.length, pieces: kinds.reduce((n, k) => n + SHARD_RECTS[k].parts.length, 0), W, H, bad, few });
    }; probe.complete ? go() : probe.onload = go; });
  });
  ok('28 creatures have their parts in the atlas, at least four each, all inside the picture', r.kinds === 28 && r.pieces >= 150 && r.bad.length === 0 && r.few.length === 0, r);
  r = await ev(() => { const miss = []; for (const k of Object.keys(AnimArt.CFG)) if (!Shards.has(k)) miss.push(k); return miss; });
  ok('every creature drawn from frames has parts to break into', r.length === 0, r);

  r = await ev(() => { const probe = new Image(); probe.src = 'art/creatures/shards.webp'; const W = probe.naturalWidth, H = probe.naturalHeight; const have = [], bad = [];
    for (const k of Object.keys(SHARD_RECTS)) { const f = SHARD_RECTS[k].fx; if (!f) continue; have.push(k); if (f[0] < 0 || f[1] < 0 || f[0] + f[2] > W || f[1] + f[3] > H || f[2] < 20 || f[3] < 20) bad.push(k); }
    return { have: have.length, bad, none: Object.keys(SHARD_RECTS).filter(k => !SHARD_RECTS[k].fx) }; });
  ok('24 of the creatures have their effect picture (the slash, the spear, the acid...) in the atlas; the three whose panel has none and the hare, whose leap is only a swirl, do not', r.have === 24 && r.bad.length === 0 && r.none.length === 4, r);

  // ---- the effect when a creature strikes
  r = await ev(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom('cx1', { door: WORLD.rooms.cx1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; P.invuln = 1e9; DW.step(3);
    G.enemies = []; G.fx = [];
    const mk = (k, dx) => { const e = new ENEMY_TYPES[k]({ x: Math.round(P.cx / TILE) + dx, y: Math.round((P.y + P.h) / TILE) - 1 }); e.kind = k; G.enemies.push(e); return e; };
    const near = mk('husk', 4), far = mk('ram', 40), crawler = mk('crawler', 6);
    near.setState(ST.ATTACK); far.setState(ST.ATTACK); crawler.setState(ST.ATTACK);
    const cues = G.fx.filter(f => f.type === 'cfx');
    const boss = new BOSS_TYPES.guardian({ x: 0, y: 0 }); boss.x = P.x + 200; boss.y = P.y; boss.kind = 'guardian'; boss.setState(ST.ATTACK); const afterBoss = G.fx.filter(f => f.type === 'cfx').length;
    const c = document.createElement('canvas'); c.width = 300; c.height = 300; const g = c.getContext('2d'); Guard.track(g); g.translate(150, 150);
    const px = () => { const d = g.getImageData(0, 0, 300, 300).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; };
    const f = Object.assign({}, cues[0]); f.x = 0; f.y = 0; f.t = 0.2; g.clearRect(-150, -150, 300, 300); Shards.drawCue(g, f); const drawn = px(); f.t = 0.41; g.clearRect(-150, -150, 300, 300); Shards.drawCue(g, f); const end = px();
    DW.step(40);
    return { near: cues.length, nearFace: cues[0] && cues[0].face, afterBoss, drawn, end, gone: G.fx.filter(f => f.type === 'cfx').length };
  });
  ok('a creature that begins a strike flashes its effect in front of it; a far one, one without a picture and a guardian do not; it is drawn, fades and is removed', r.near === 1 && r.afterBoss === 1 && r.drawn > 150 && r.end < r.drawn && r.gone === 0, r);

  // ---- a death
  const kill = kind => ev(kind => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom('cx1', { door: WORLD.rooms.cx1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; P.invuln = 1e9; DW.step(3);
    G.enemies = []; G.fx = [];
    const T = ENEMY_TYPES[kind], e = new T({ x: Math.round(P.cx / TILE) + 4, y: Math.round((P.y + P.h) / TILE) - 1 }); e.kind = kind; G.enemies.push(e); e.hp = 0;
    e.kill(); DW.step(1);
    const sh = G.fx.filter(f => f.type === 'shard');
    return { n: sh.length, corpse: G.fx.filter(f => f.type === 'corpse').length, w: sh.every(f => f.w > 4 && f.h > 4 && isFinite(f.tl) && isFinite(f.floor)) };
  }, kind);
  const kinds = await ev(() => Object.keys(SHARD_RECTS).filter(k => ENEMY_TYPES[k]));
  const out = {};
  for (const k of kinds) out[k] = await kill(k);
  const bad = Object.entries(out).filter(([k, v]) => v.n < 4 || !v.w).map(([k, v]) => [k, v]);
  ok('each creature of the world breaks into at least four pieces when it dies (' + kinds.length + ' kinds)', kinds.length >= 20 && bad.length === 0, bad.slice(0, 5));
  ok('a creature that leaves a corpse still leaves it, and the icicle (no corpse) just breaks', out.husk.corpse === 1 && out.icicle.n >= 4 && out.icicle.corpse === 0, [out.husk, out.icicle]);

  // ---- the pieces move like things with weight
  r = await ev(() => {
    const { G } = DW; DW.step(1); const sh = G.fx.filter(f => f.type === 'shard'); if (!sh.length) return { none: true };
    let below = 0, nan = 0, maxUp = 0, landed = 0;
    for (const f of sh) {
      for (let t = 0; t <= f.life; t += 1 / 30) { const p = Shards.at(f, t); if (!isFinite(p.x + p.y + p.a)) nan++; if (p.y > f.floor + 0.5) below++; maxUp = Math.max(maxUp, f.y0 - p.y); }
      const a = Shards.at(f, f.tl + 1.5), b = Shards.at(f, f.tl + 2.0); if (Math.abs(a.y - f.floor) < 1 && Math.abs(b.y - f.floor) < 1 && Math.abs(a.x - b.x) < 3) landed++;
    }
    return { n: sh.length, below, nan, maxUp: Math.round(maxUp), landed };
  });
  ok('they never sink through the floor, rise a little first, and lie still when they have landed', !r.none && r.below === 0 && r.nan === 0 && r.maxUp > 8 && r.landed === r.n, r);
  r = await ev(() => { const { G } = DW; const n0 = G.fx.filter(f => f.type === 'shard').length; DW.step(200); return { n0, n1: G.fx.filter(f => f.type === 'shard').length }; });
  ok('and they fade away after a couple of seconds', r.n0 > 0 && r.n1 === 0, r);
  r = await ev(() => {
    const { G } = DW; const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); Guard.track(g);
    const f = { type: 'shard', rect: SHARD_RECTS.husk.parts[0], w: 60, h: 60, x0: 200, y0: 100, vx: 0, vy: 0, vr: 0, a0: 0, floor: 200, tl: 0.4, t: 0.1, life: 2.3, rest: 0 };
    const px = () => { const d = g.getImageData(0, 0, 400, 300).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 30) n++; return n; };
    g.clearRect(0, 0, 400, 300); Shards.draw(g, f); const a = px(); f.t = 2.25; g.clearRect(0, 0, 400, 300); Shards.draw(g, f); const b = px();
    return { drawn: a, fading: b, balanced: Guard.depth ? Guard.depth(g) : 0 };
  });
  ok('a piece is drawn from the atlas and is almost gone at the end of its life', r.drawn > 500 && r.fading < r.drawn, r);

  // ---- the cracked mask
  const masks = hp => ev(hp => {
    const { G, P } = DW; Diff.setMode('normal'); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; P.maxHp = 5; P.hp = 5; P.dead = false; G.hpSeen = undefined; G.maskLost = null; DW.step(2);
    const names = [], old = IconArt.draw; IconArt.draw = function (g, n) { names.push(n); return old.apply(this, arguments); };
    const seen = () => { names.length = 0; DW.draw(); return names.filter(n => n === 'mask_broken').length; };
    const out = { full: seen() }; P.hp = hp; DW.step(1); out.after = seen(); DW.step(90); out.later = seen(); IconArt.draw = old; return out;
  }, hp);
  r = await masks(4);
  ok('a mask that has just gone shows cracked for a moment, then as an empty one', r.full === 0 && r.after === 1 && r.later === 0, r);
  r = await masks(1);
  ok('and the last mask left is cracked and stays so', r.full === 0 && r.after >= 1 && r.later === 1, r);
  r = await ev(() => { const { P, G } = DW; P.hp = 5; G.hpSeen = 5; const c = document.createElement('canvas'); c.width = 420; c.height = 90; const g = c.getContext('2d'); Guard.track(g); g.fillStyle = '#334'; g.fillRect(0, 0, 420, 90); for (let i = 0; i < 4; i++) drawMaskIcon(g, 30 + i * 60, 45, i < 2, 0, i === 3 ? 1 : 0); const d = g.getImageData(0, 0, 420, 90).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200) n++; return n; });
  ok('the cracked picture draws on its own too', r > 100, r);
  // a look: hurt, the cracked one, and a dead creature in pieces
  await ev(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom('cx1', { door: WORLD.rooms.cx1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; P.invuln = 1e9; P.maxHp = 5; P.hp = 1; DW.step(5);
    G.enemies = []; for (const k of ['husk', 'ram', 'crawler']) { const e = new ENEMY_TYPES[k]({ x: Math.round(P.cx / TILE) + 3 + (k === 'ram' ? 3 : k === 'crawler' ? 6 : 0), y: Math.round((P.y + P.h) / TILE) - 1 }); e.kind = k; G.enemies.push(e); e.hp = 0; e.kill(); }
    DW.step(14); DW.draw();
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: shot('shards.png') });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
