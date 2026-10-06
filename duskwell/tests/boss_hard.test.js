// Harder guardians that move like living things. Health, tempo and pace by setting; the last fifth of its health enrages a guardian (a roar, quicker, red glow); the hall
// itself strikes during a fight with columns that are shown before they rise (none on Easy, more on Hard); and the pictures of the guardians are bent by their
// motion: they sway when still, trail a hem when they move, beat their wings, leave echoes behind a fast move, squash and raise dust when they land.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 15000 });

  // ---- the numbers
  let r = await ev(() => {
    const out = {}; for (const m of ['easy', 'normal', 'hard']) { Diff.setMode(m); out[m] = { hp: Diff.bossHp('hushvale'), hpDeep: Diff.bossHp('throne'), tempo: Diff.bossTempo('hushvale'), tempoDeep: Diff.bossTempo('throne'), pace: Diff.bossPace, haz: Diff.hazard, creature: Diff.tempo('hushvale') }; }
    Diff.setMode('normal'); return out;
  });
  const n = r.normal;
  ok('normal: a guardian has about half as much health again as before (1.2 became 1.55) and more the deeper it is', Math.abs(n.hp - 1.55) < 1e-9 && n.hpDeep > n.hp && Math.abs(n.hpDeep - (1.55 + 0.03 * 14)) < 1e-9, n);
  ok('a guardian is quicker than the creatures of its hall, and quicker the deeper it is', n.tempo > n.creature && n.tempoDeep > n.tempo, n);
  ok('easy is gentler and hard harder in health, tempo, pace and the hall\'s strikes', r.easy.hp < n.hp && n.hp < r.hard.hp && r.easy.tempo < n.tempo && n.tempo < r.hard.tempo && r.easy.pace > n.pace && n.pace > r.hard.pace && r.easy.haz === 0 && n.haz === 1 && r.hard.haz > n.haz, [r.easy, r.hard]);

  // ---- a fight, set up in a hall
  const fight = (room, mode) => ev(([room, mode]) => {
    const { G, P, enterRoom } = DW; Diff.setMode(mode || 'normal'); G.flags = {}; Charms.reset(); Powers.reset();
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    const d = WORLD.rooms[room]; enterRoom(room, { door: d.doors[0].id }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.toast = null; G.slowmo = 0; P.invuln = 1e9; P.hp = P.maxHp = 9; P.nail = 5; DW.step(5);
    const a = d.arena; P.x = (a.trigger + (a.triggerDir === -1 ? -3 : 3)) * 32; DW.step(1);
    for (let i = 0; i < 600 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const b = G.boss; return { key: b.bossKey, hp: b.maxHp, spd: b.spd, tempo: b.tempo, area: G.level.def.area, state: b.state };
  }, [room, mode]);
  r = await fight('cx3', 'normal');
  const want = await ev(() => Math.round(new BOSS_TYPES.guardian({ x: 0, y: 0 }).hp * Diff.bossHp('crossroads')));
  ok('the guardian of the crossroads has the health the setting asks for (130 times 1.58 at that depth)', r.key === 'guardian' && r.hp === want && want === Math.round(130 * (1.55 + 0.03)), [r, want]);
  r = await ev(() => { const { G } = DW; const b = G.boss; return { spd: b.spd, tempo: b.tempo, want: Diff.bossTempo(G.level.def.area), pace: Diff.bossPace }; });
  ok('its clock is the guardian\'s tempo and its pauses the setting\'s pace', Math.abs(r.tempo - r.want) < 1e-9 && r.spd === r.pace, r);

  // ---- enrage
  r = await ev(() => {
    const { G } = DW; const b = G.boss; const spd0 = b.spd, tempo0 = b.tempo; b.invul = false; b.hp = Math.floor(b.maxHp * 0.3);
    b.hurt(1, 1, 'side');                                                           // the last phase begins, if there is one
    for (let i = 0; i < 160; i++) DW.step(1); b.invul = false; b.state = 'fight';
    const before = { enraged: !!b.enraged, phase: b.phase };
    b.hp = Math.floor(b.maxHp * 0.2); G.toast = null; b.hurt(1, 1, 'side');
    DW.step(12); const out = { before, enraged: !!b.enraged, spd: b.spd, spd0, tempo: b.tempo, tempo0, toast: G.toast && G.toast.text, invul: b.invul };
    for (let i = 0; i < 200; i++) DW.step(1); out.invulLater = b.invul; return out;
  });
  ok('below a fifth of its health a guardian is enraged: quicker pauses, a quicker clock, a toast, and it can be hurt again after the roar', !r.before.enraged && r.enraged && r.spd < r.spd0 * 0.9 && r.tempo > r.tempo0 && /غاضب/.test(r.toast || '') && r.invul && !r.invulLater, r);
  r = await ev(() => { const { G } = DW; const b = G.boss; const px = []; DW.draw(); return { glow: b.enraged && b.state === 'fight' }; });
  ok('and it glows red (drawn without a throw)', r.glow, r);

  // ---- the hall strikes
  const strikes = (room, mode, secs) => ev(([room, mode, secs]) => {
    const { G, P } = DW; const seen = new Set(); let n = 0, tele = 0;
    for (let i = 0; i < secs * 60; i++) { DW.step(1); for (const p of G.projs) if (p.kind === 'pillar' && !seen.has(p)) { seen.add(p); n++; tele = Math.max(tele, p.tele || 0); } }
    return { n, tele, hazT: G.boss && G.boss.hazT };
  }, [room, mode, secs]);
  await fight('mg3', 'easy'); await ev(() => { DW.G.boss.co = (function* () { while (true) yield; })(); });
  r = await strikes('mg3', 'easy', 16);
  ok('Easy: the hall does not strike', r.n === 0, r);
  await fight('mg3', 'normal'); await ev(() => { DW.G.boss.co = (function* () { while (true) yield; })(); });
  const rn = await strikes('mg3', 'normal', 16);
  await fight('mg3', 'hard'); await ev(() => { DW.G.boss.co = (function* () { while (true) yield; })(); });
  const rh = await strikes('mg3', 'hard', 16);
  ok('Normal: the hall strikes now and then, each column shown a moment before it rises; Hard: oftener', rn.n >= 2 && rn.tele >= 0.7 && rh.n > rn.n, [rn, rh]);
  await ev(() => { Diff.setMode('normal'); });

  // ---- the motion of the pictures
  r = await ev(() => {
    const { G, P, enterRoom } = DW; const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d'); Guard.track(g);
    enterRoom('cx3', { door: 'l' }); G.state = 'play'; G.trans = null; G.fadeA = 0; DW.step(3);
    const sig = (key, t, setup) => {
      const b = new BOSS_TYPES[key]({ x: 0, y: 0 }); b.x = 250; b.y = 120; b.state = 'fight'; b.face = 1; b.onGround = true; if (setup) setup(b);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 600, 400); g.save(); g.translate(0, 0); Art.boss[key](g, b, t); g.restore();
      const d = g.getImageData(0, 0, 600, 400).data; let h = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 30) { n++; h = (h * 31 + d[i] + 3 * d[i + 1] + 7 * d[i + 2] + (i >> 2)) % 1000003; } return { h, n };
    };
    const out = {};
    for (const key of ['weaver', 'duelist', 'roc', 'queen', 'drowned']) { const a = sig(key, 100.0), b = sig(key, 100.9), c2 = sig(key, 101.8); out[key] = { moves: a.h !== b.h || b.h !== c2.h, n: a.n }; }
    return out;
  });
  ok('a boss standing still is not a still picture: it sways, breathes, or beats its wings', Object.values(r).every(v => v.moves && v.n > 500), r);
  r = await ev(() => {
    const { G } = DW; const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d'); Guard.track(g);
    const b = new BOSS_TYPES.duelist({ x: 0, y: 0 }); b.x = 100; b.y = 120; b.state = 'fight'; b.face = 1; b.onGround = true; let t = 100;
    for (let i = 0; i < 4; i++) { t += 1 / 60; Art.boss.duelist(g, b, t); }
    const rig = b._pr, still = !rig.trail || rig.trail.length === 0;
    for (let i = 0; i < 10; i++) { b.x += 14; t += 1 / 60; Art.boss.duelist(g, b, t); }                      // 840 px a second
    const fast = rig.trail ? rig.trail.length : 0; const lag = rig.vxs;
    for (let i = 0; i < 40; i++) { t += 1 / 60; Art.boss.duelist(g, b, t); }
    return { still, fast, lag: Math.round(lag), after: rig.trail ? rig.trail.length : 0 };
  });
  ok('a fast move leaves echoes of the guardian behind it, and they fade when it stops', r.still && r.fast >= 2 && r.lag > 300 && r.after === 0, r);
  r = await ev(() => {
    const { G } = DW; const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d'); Guard.track(g);
    const b = new BOSS_TYPES.colossus({ x: 0, y: 0 }); b.x = 200; b.y = 120; b.state = 'fight'; b.face = 1; b.onGround = false; let t = 100;
    for (let i = 0; i < 30; i++) { t += 1 / 60; Art.boss.colossus(g, b, t); }
    const parts0 = G.parts.length, sy0 = b._pr.s.sy.v; b.onGround = true; t += 1 / 60; Art.boss.colossus(g, b, t);
    return { dust: G.parts.length - parts0, squash: b._pr.s.sy.v < sy0 - 1 };
  });
  ok('landing from the air: dust and a squash of the body', r.dust >= 5 && r.squash, r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
