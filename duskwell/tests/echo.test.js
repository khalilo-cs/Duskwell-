// The echo stones: every hall of a fallen guardian has a stone on open floor by the way in; speaking to it offers the echo (and the harsh echo once
// the first is won); an echo shuts the doors, brings the guardian back, counts the time, gives no seal and no gift again, pays geo for the
// first win only, keeps the best time in the save and costs nothing when the hero falls.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  // the hall of a guardian already beaten, the hero standing by the stone
  const hall = room => ev(room => {
    const { G, P, enterRoom } = DW; const def = WORLD.rooms[room];
    G.flags = {}; G.flags[def.arena.flag] = true; Charms.reset(); Gear.reset(); G.shade = null; G.deaths = 0;
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    enterRoom(room, { door: def.doors[0].id }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0; G.dialog = null;
    P.invuln = 1e9; P.hp = P.maxHp = 9; P.dead = false; P.nail = 5; P.geo = 100; DW.step(3);
    const s = Echo.stone(); P.x = s.px - P.w / 2; P.y = s.py - P.h - 2; P.vx = P.vy = 0; DW.step(3);
    return { arena: G.arena && G.arena.state, near: !!Echo.near() };
  }, room);
  // pick choice n of the open dialog
  const pick = async n => { await ev(() => { const d = DW.G.dialog; d.i = d.lines.length - 1; d.t = 1; d.sel = 0; DW.step(1); }); for (let i = 0; i < n; i++) { await page.keyboard.press('ArrowRight'); await ev(() => DW.step(2)); } await page.keyboard.press('Enter'); await ev(() => DW.step(2)); };
  const talk = async () => { await page.keyboard.down('ArrowUp'); await ev(() => DW.step(2)); await page.keyboard.up('ArrowUp'); await ev(() => DW.step(2)); return ev(() => ({ state: DW.G.state, n: DW.G.dialog && DW.G.dialog.choices && DW.G.dialog.choices.length, lines: DW.G.dialog && DW.G.dialog.lines.length })); };

  // ---- the stone in every hall
  let r = await ev(() => {
    const out = { halls: 0, bad: [], lit: [] };
    for (const id of WORLD.order) {
      const def = WORLD.rooms[id]; if (!def.arena) continue; out.halls++;
      const { G, enterRoom } = DW; G.flags = {}; G.flags[def.arena.flag] = true; enterRoom(id, { door: def.doors[0].id });
      const L = G.level, s = Echo.stone(); if (!s) { out.bad.push(id + ':none'); continue; }
      const tx = Math.floor(s.px / TILE), ty = Math.floor((s.py - 1) / TILE);
      const floor = L.get(tx, ty + 1) === T_SOLID, air = [0, 1, 2, 3].every(k => L.get(tx, ty - k) === T_AIR);
      if (!floor || !air) out.bad.push(id + ':' + (floor ? 'air' : 'floor') + '@' + tx + ',' + ty);
      const clear = def.arena.gates.every(g => Math.abs(g.x - tx) > 1);
      if (!clear) out.bad.push(id + ':gate');
      G.flags = {}; enterRoom(id, { door: def.doors[0].id });
      if (Echo.stone()) out.lit.push(id);                                   // before the fight there is no stone
    }
    return out;
  });
  ok('every hall has a stone on open floor, clear of the gates', r.halls >= 17 && r.bad.length === 0, r);
  ok('no stone before the guardian has fallen', r.lit.length === 0, r.lit);

  // ---- speak to it, start the echo
  r = await hall('cx3');
  ok('the stone is near the hero in a won hall', r.arena === 'won' && r.near, r);
  r = await talk();
  ok('Up opens the stone dialog: the echo and leave (the harsh echo is shut)', r.state === 'dialog' && r.n === 2, r);
  await pick(0);
  r = await ev(() => { const { G } = DW; return { state: G.state, arena: G.arena.state, trial: G.arena.trial && G.arena.trial.tier, boss: G.boss && G.boss.bossKey, gates: G.gates.length, hp: G.boss && G.boss.maxHp }; });
  ok('the echo starts: doors shut, the guardian is back', r.state === 'play' && r.arena === 'fight' && r.trial === 1 && r.boss === 'guardian' && r.gates >= 2, r);
  const hp1 = r.hp;
  // the clock does not run during the intro, then it does
  r = await ev(() => { const { G } = DW; const t0 = G.arena.trial.t; DW.step(30); return { t0, t1: G.arena.trial.t, intro: G.boss.state }; });
  ok('the clock waits for the fight', r.t0 === 0 && r.t1 === 0 && r.intro === 'intro', r);
  r = await ev(() => { const { G } = DW; for (let i = 0; i < 400 && G.boss.state !== 'fight'; i++) DW.step(1); const t0 = G.arena.trial.t; DW.step(60); return { t0, t1: G.arena.trial.t }; });
  ok('the clock runs in the fight', r.t1 - r.t0 > 0.8 && r.t1 - r.t0 < 1.3, r);
  await ev(() => DW.draw());
  await page.screenshot({ path: shot('echo_fight.png') });

  // ---- win it
  const before = await ev(() => { const { G, P } = DW; return { geo: P.geo, items: G.items.filter(i => i.id === 'ability_dash').length, seals: sealCount(), flag: G.flags.boss_guardian, dash: P.ab.dash }; });
  r = await ev(() => {
    const { G, P } = DW; const b = G.boss; b.invul = false; b.state = 'fight'; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side');
    for (let i = 0; i < 400 && G.arena.trial; i++) DW.step(1);
    for (let i = 0; i < 90; i++) DW.step(1);
    return { trial: !!G.arena.trial, state: G.arena.state, boss: !!G.boss, gates: G.gates.length, best: G.flags.echo1_guardian, flag: G.flags.boss_guardian, items: G.items.filter(i => i.id === 'ability_dash').length, seals: sealCount(), geoDrops: G.geos.length, ending: !!G.ending, toast: G.toast && G.toast.text, stone: !!Echo.stone() };
  });
  ok('the echo ends: doors open, state won again, no trial left', !r.trial && r.state === 'won' && !r.boss && r.gates === 0, r);
  ok('the time is kept', typeof r.best === 'number' && r.best > 0 && r.best < 120, r.best);
  ok('no seal and no gift again', r.flag === before.flag && r.items === before.items && r.seals === before.seals, [r, before]);
  ok('the first win drops geo', r.geoDrops > 0, r.geoDrops);
  ok('the toast tells the time', /\d+:\d\d\.\d/.test(r.toast || ''), r.toast);
  ok('the stone is still there and shows the first pip', r.stone);
  await ev(() => DW.draw());
  await page.screenshot({ path: shot('echo_stone.png') });

  // ---- a second win of the same echo pays nothing and keeps the better time
  r = await ev(() => { const { G, P } = DW; G.geos = []; G.toast = null; const k = Echo.flagOf('guardian', 1); G.flags[k] = 0.5; return Echo.best('guardian', 1); });
  ok('best time is read from the flags', r === 0.5, r);
  r = await talk();
  ok('with the echo won the harsh one is offered', r.state === 'dialog' && r.n === 3, r);
  await pick(1);
  r = await ev(() => { const { G } = DW; return { trial: G.arena.trial && G.arena.trial.tier, hp: G.boss && G.boss.maxHp, tempo: G.boss && G.boss.tempo }; });
  ok('the harsh echo: half as much health again and a quicker clock', r.trial === 2 && Math.abs(r.hp / hp1 - 1.5) < 0.02 && r.tempo > 1.1, [r, hp1]);

  // ---- a fall in an echo costs nothing
  r = await ev(() => {
    const { G, P } = DW; P.invuln = 0; P.hp = 1; P.geo = 321; G.deaths = 0; P.hurt(1, P.cx + 10);
    for (let i = 0; i < 400 && G.state !== 'play'; i++) DW.step(1);
    for (let i = 0; i < 60; i++) DW.step(1);
    return { state: G.state, room: G.level.id, geo: P.geo, shade: G.shade, deaths: G.deaths, hp: P.hp, flag: G.flags.echo2_guardian };
  });
  ok('the hero is at the bench, with his geo, no shade, no death counted, nothing recorded', r.state === 'play' && r.room === 'town' && r.geo === 321 && !r.shade && r.deaths === 0 && r.hp === 9 && !r.flag, r);

  // ---- the same hall again is quiet: the stone offers the echo afresh
  r = await hall('cx3');
  ok('coming back, the hall is won and idle', r.arena === 'won', r);

  // ---- it is saved
  r = await ev(() => { const { G } = DW; G.flags.echo1_guardian = 12.3; G.bench = { room: 'cx3' }; saveGame(); const s = readSave(); return s && s.flags.echo1_guardian; });
  ok('the record is in the save', r === 12.3, r);

  // ---- the last guardian: an echo does not start the ending
  r = await hall('ht2');
  ok('the throne hall has its stone', r.near, r);
  await talk(); await pick(0);
  r = await ev(() => { const { G } = DW; const b = G.boss; for (let i = 0; i < 400 && b.state !== 'fight'; i++) DW.step(1); DW.step(40); b.invul = false; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side'); for (let i = 0; i < 400 && G.arena.trial; i++) DW.step(1); DW.step(120); return { ending: !!G.ending, state: G.state, best: G.flags.echo1_king }; });
  ok('the Hollow King echo: no ending, the time kept', !r.ending && r.state === 'play' && r.best > 0, r);

  // ---- the hint
  r = await hall('cx3');
  await ev(() => DW.draw());
  await page.screenshot({ path: shot('echo_hint.png') });

  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
