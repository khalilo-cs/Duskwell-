// The Dusk powers: six great deeds, each usable once between two rests. The Elder teaches them as the seals grow; the keys 1 to 6 and a tap on their pictures
// use them; resting renews them; each one does what it says (Time Stop holds the foes and their shots, Star Fall rains stars on the nearest, the Phoenix
// heals, shields and rises on its own, the Twin fights, the Black Hole drags and collapses, Storm Rage doubles and chains); the Moves screen has a Powers tab.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 15000 });
  const key = async (k, n) => { await page.keyboard.down(k); await ev(() => DW.step(2)); await page.keyboard.up(k); await ev(n => DW.step(n), n || 2); };
  // a quiet room with the hero standing and some creatures that cannot hurt him, each with plenty of health
  const arena = (seals, known) => ev(([seals, known]) => {
    const { G, P, enterRoom } = DW; G.flags = {}; SEAL_FLAGS.slice(0, seals).forEach(f => { G.flags[f] = true; }); Charms.reset(); Gear.reset(); Powers.reset();
    (known || []).forEach(id => { G.flags['pw_' + id] = true; });
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false }; P.nail = 5; P.soulGain = 11;
    enterRoom('cx2', { door: WORLD.rooms.cx2.doors[0].id }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.toast = null; G.dialog = null; G.slowmo = 0;
    P.invuln = 0; P.hp = P.maxHp = 9; P.dead = false; P.sitting = null; DW.step(20); G.enemies = []; G.projs = [];
    window.__mk = (kind, dx, dy, hp) => { const e = new ENEMY_TYPES[kind]({ x: 0, y: 0 }); e.kind = kind; e.x = P.cx + dx; e.y = P.y + (dy || 0); e.hp = e.maxHp = hp || 500; e.dmg = 0; G.enemies.push(e); return e; };
    return { seals: sealCount() };
  }, [seals, known]);
  const ALL = ['time', 'stars', 'phoenix', 'twin', 'hole', 'rage'];

  // ---- the data
  let r = await ev(() => {
    const out = { n: POWERS.length, bad: [], glyphs: 0 };
    const c = document.createElement('canvas'); c.width = c.height = 80; const g = c.getContext('2d');
    for (const p of POWERS) {
      if (![p.ar, p.en].every(s => typeof s === 'string' && s.length > 3) || ![p.dAr, p.dEn].every(s => typeof s === 'string' && s.length > 40)) out.bad.push(p.id + ':text');
      if (!(p.seals >= 1 && p.seals <= SEAL_FLAGS.length)) out.bad.push(p.id + ':seals');
      if (!/^#[0-9a-f]{6}$/i.test(p.color)) out.bad.push(p.id + ':color');
      g.clearRect(0, 0, 80, 80); Powers.glyph(g, p.id, 40, 40, 30, p.color); const d = g.getImageData(0, 0, 80, 80).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; if (n > 100) out.glyphs++; else out.bad.push(p.id + ':glyph');
    }
    out.ids = new Set(POWERS.map(p => p.id)).size; out.rising = POWERS.every((p, i) => !i || p.seals > POWERS[i - 1].seals);
    return out;
  });
  ok('six powers, each with two languages, a seal count, a colour and a picture', r.n === 6 && r.ids === 6 && r.rising && r.glyphs === 6 && r.bad.length === 0, r);

  // ---- the Elder teaches
  await arena(0, []);
  const talk = async () => {
    await ev(() => { const { G, P, enterRoom } = DW; enterRoom('town', { pos: { x: 100, y: 100 } }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.dialog = null; G.toast = null; DW.step(30); const n = G.npcs.find(q => q.type === 'elder'); P.x = n.px - P.w / 2 - 36; P.y = n.py - P.h - 2; P.vx = 0; P.vy = 0; DW.step(5); });
    await key('ArrowUp');
    return ev(() => { const d = DW.G.dialog; return d ? { lines: d.lines.length, text: d.lines.join(' ') } : null; });
  };
  await ev(() => { const { G } = DW; G.flags = {}; Powers.reset(); });
  r = await talk();
  ok('with no seal the Elder says what he always says', r && r.lines === 4 && !/توقّف الزمن/.test(r.text), r && r.lines);
  await ev(() => { const { G } = DW; G.flags = { [SEAL_FLAGS[0]]: true }; Powers.reset(); });
  r = await talk();
  let known = await ev(() => POWERS.map(p => Powers.known(p.id)));
  ok('with one seal he teaches Time Stop (a line to tell it, a line for each, a line for the keys)', r && r.lines === 3 && /توقّف الزمن/.test(r.text) && known.filter(Boolean).length === 1 && known[0], [r && r.lines, known]);
  await ev(() => { const { G } = DW; G.flags = {}; SEAL_FLAGS.slice(0, 6).forEach(f => { G.flags[f] = true; }); Powers.reset(); });
  r = await talk();
  known = await ev(() => POWERS.map(p => Powers.known(p.id)));
  ok('with six seals he teaches the first three at once', r && r.lines === 5 && known.join() === 'true,true,true,false,false,false', [r && r.lines, known]);
  r = await talk();
  ok('and then says what he always says', r && r.lines === 4, r && r.lines);
  await ev(() => { const { G } = DW; SEAL_FLAGS.forEach(f => { G.flags[f] = true; }); });
  r = await talk();
  known = await ev(() => POWERS.map(p => Powers.known(p.id)));
  ok('with all the seals, all six', known.every(Boolean) && r.lines === 5, [r && r.lines, known]);
  r = await ev(() => { const { G } = DW; G.bench = { room: 'town' }; saveGame(); const s = readSave(); return POWERS.every(p => s.flags['pw_' + p.id]); });
  ok('what he taught is in the save', r);

  // ---- using, spending, renewing
  await arena(12, []);
  r = await ev(() => { const { G } = DW; const a = Powers.use('time'); return { a, toast: G.toast && G.toast.text, used: Powers.state().used.time }; });
  ok('a power not learned does not work, and the toast says where to learn it', r.a === false && !r.used && /الشيخ/.test(r.toast || ''), r);
  await arena(12, ALL);
  await key('Digit1', 3);
  r = await ev(() => ({ time: Powers.state().time, used: Powers.state().used.time, ready: Powers.ready('time'), shown: !!Powers.state().shown }));
  ok('the key 1 uses Time Stop, and it is spent', r.time > 4 && r.used && !r.ready && r.shown, r);
  r = await ev(() => { const { G } = DW; G.toast = null; const a = Powers.use('time'); return { a, toast: G.toast && G.toast.text }; });
  ok('a spent power does not work again, and the toast says to rest', r.a === false && /استرح/.test(r.toast || ''), r);
  r = await ev(() => { const { P } = DW; const b = { px: P.cx, py: P.y + P.h, x: 0, y: 0, room: 'cx2' }; P.sit(b); const s = Powers.state(); return { used: Object.keys(s.used).length, time: s.time, sitting: !!P.sitting }; });
  ok('resting on a bench renews every power and ends what runs', r.used === 0 && r.time === 0, r);
  await arena(12, ALL);
  r = await ev(() => { const { G, P } = DW; Powers.use('stars'); Powers.use('rage'); const u = Object.keys(Powers.state().used).length; G.bench = { room: 'cx2' }; P.hp = 1; P.dead = true; P.dead = false; DW.startGame(false); return { u, after: Object.keys(Powers.state().used).length }; });
  ok('a new game starts with none spent', r.u === 2 && r.after === 0, r);

  // ---- Time Stop
  await arena(12, ALL);
  r = await ev(() => {
    const { G, P } = DW; const e1 = window.__mk('husk', 220, 0), e2 = window.__mk('flyer', 300, -70);
    const shot = new Proj({ x: P.cx + 400, y: P.cy, vx: -120, vy: 0, dmg: 1, life: 20, r: 8, passWalls: true }); G.projs.push(shot);
    const mine = new Proj({ x: P.cx, y: P.cy - 40, vx: 120, vy: 0, dmg: 1, friendly: true, life: 20, r: 6, passWalls: true }); G.projs.push(mine);
    const x1 = e1.x, sx0 = shot.x, mx0 = mine.x, dmg0 = P.nailDamage();
    Powers.use('time'); DW.step(60);
    const during = { e1moved: Math.abs(e1.x - x1), shot: Math.abs(shot.x - sx0), mine: Math.abs(mine.x - mx0), frozen: e1.frozenT > 0 && e2.frozenT > 0, dmg: P.nailDamage(), dmg0 };
    DW.step(300);
    const after = { frozen: e1.frozenT > 0.05, shotMoved: Math.abs(shot.x - sx0), dmg: P.nailDamage() };
    return { during, after };
  });
  ok('Time Stop: the foes and their shots stand still, the hero\'s own shots fly', r.during.frozen && r.during.e1moved < 2 && r.during.shot < 2 && r.during.mine > 100, r.during);
  ok('and a blow on the stilled lands half again as hard', r.during.dmg === Math.round(r.during.dmg0 * 1.5) || r.during.dmg > r.during.dmg0, [r.during.dmg0, r.during.dmg]);
  ok('after five seconds it ends: they move, the shots fly, the blow is as before', !r.after.frozen && r.after.shotMoved > 60 && r.after.dmg === r.during.dmg0, r.after);
  // a guardian dying while time is stopped still finishes dying
  r = await ev(() => {
    const { G, P, enterRoom } = DW; const d = WORLD.rooms.cx3; G.flags = {}; POWERS.forEach(p => { G.flags['pw_' + p.id] = true; }); Powers.reset();
    enterRoom('cx3', { door: d.doors[0].id }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; P.invuln = 1e9; P.hp = P.maxHp = 9; DW.step(5);
    P.x = (d.arena.trigger + 3) * 32; DW.step(1); for (let i = 0; i < 600 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const b = G.boss; Powers.use('time'); DW.step(10); b.invul = false; b.hp = 1; b.hurt(5, 1, 'side');
    for (let i = 0; i < 400 && G.arena.state !== 'won'; i++) DW.step(1);
    return { arena: G.arena.state, time: Powers.state().time };
  });
  ok('a guardian that falls during Time Stop still finishes dying (the arena is won)', r.arena === 'won' && r.time > 0, r);

  // ---- Star Fall
  await arena(12, ALL);
  r = await ev(() => {
    const { G, P } = DW; const e1 = window.__mk('husk', 260, 0, 900), e2 = window.__mk('crawler', 330, 0, 900), hp0 = [e1.hp, e2.hp];
    Powers.use('stars'); const seen = new Set(); let maxMeteors = 0;
    for (let i = 0; i < 260; i++) { DW.step(1); const m = Powers.state().fx.filter(f => f.type === 'meteor'); maxMeteors = Math.max(maxMeteors, m.length); }
    return { lost: [hp0[0] - e1.hp, hp0[1] - e2.hp], maxMeteors, left: Powers.state().fx.length, stars: Powers.state().stars };
  });
  ok('Star Fall: stars fall and burst on the creatures, then it is over', r.lost[0] + r.lost[1] >= 150 && r.maxMeteors >= 2 && r.left === 0 && !r.stars, r);
  r = await ev(() => {
    const { G, P } = DW; Powers.rest(); G.enemies = []; const far = window.__mk('husk', 5000, 0, 100); const b = new BOSS_TYPES.guardian({ x: 0, y: 0 }); b.x = P.cx + 200; b.y = P.y + P.h - b.h; b.state = 'fight'; b.introT = 0; b.invul = false; b.hp = b.maxHp = 1200; b.dmg = 0; b.co = (function* () { while (true) yield; })(); G.enemies.push(b);
    const hp0 = b.hp; Powers.use('stars'); DW.step(260); return { bossLost: hp0 - b.hp };
  });
  ok('and most of the stars go for a guardian when there is one', r.bossLost >= 150, r);

  // ---- Phoenix Heart
  await arena(12, ALL);
  r = await ev(() => {
    const { G, P } = DW; P.hp = 2; const sh = new Proj({ x: P.cx + 60, y: P.cy, vx: -50, dmg: 1, life: 9, r: 8, passWalls: true }); G.projs.push(sh); const e = window.__mk('husk', 70, 0, 300);
    Powers.use('phoenix'); DW.step(2);
    const out = { hp: P.hp, max: P.maxHp, invuln: P.invuln, aura: Powers.state().aura, shots: G.projs.filter(p => !p.friendly).length, burnt: 300 - e.hp };
    const hurt = P.hurt(1, P.cx + 10);                                       // the aura keeps him unhurt
    out.hurt = hurt; DW.step(300); out.auraEnd = Powers.state().aura; out.hpEnd = P.hp;
    return out;
  });
  ok('Phoenix Heart: all the masks, a long invulnerability, the shots swallowed, the foes close by burnt', r.hp === r.max && r.invuln > 3 && r.aura > 3.5 && r.shots === 0 && r.burnt > 0, r);
  ok('and nothing hurts him while the fire lasts, which ends after four seconds', r.hurt === false && r.auraEnd <= 0, r);
  await arena(12, ALL);
  r = await ev(() => {
    const { G, P } = DW; P.hp = 1; P.invuln = 0; const a = P.hurt(1, P.cx + 10);
    const out = { a, dead: P.dead, hp: P.hp, state: G.state, used: Powers.state().used.phoenix, toast: G.toast && G.toast.text };
    DW.step(300); P.hp = 1; P.invuln = 0; P.hurt(1, P.cx + 10); out.dead2 = P.dead; out.state2 = G.state; return out;
  });
  ok('a deadly blow while it is ready: the Phoenix rises on its own, once', r.a === true && !r.dead && r.hp === 9 && r.state === 'play' && r.used && /العنقاء/.test(r.toast || '') && r.dead2 && r.state2 === 'dying', r);
  await arena(12, ALL);
  r = await ev(() => { const { G, P } = DW; P.hp = 1; P.invuln = 0; P.spikeHurt(); const out = { dead: P.dead, hp: P.hp, used: Powers.state().used.phoenix }; DW.step(60); out.hp2 = P.hp; return out; });
  ok('and a fall on spikes too', !r.dead && r.hp === 9 && r.used, r);

  // ---- Shadow Twin
  await arena(12, ALL);
  r = await ev(() => {
    const { G, P } = DW; const e = window.__mk('husk', 190, 0, 900), hp0 = e.hp; Powers.use('twin'); const t0 = Powers.state().twin && Powers.state().twin.t;
    let first = -1; for (let i = 0; i < 120; i++) { DW.step(1); if (first < 0 && e.hp < hp0) first = i; }
    const mid = hp0 - e.hp, still = !!Powers.state().twin; P.invuln = 1e9;
    DW.draw(); const c = Powers.twinCanvas(); let px = 0; if (c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) px++; }
    DW.step(900);
    return { t0, first, mid, still, px, gone: !Powers.state().twin, total: hp0 - e.hp };
  });
  ok('Shadow Twin: it appears, runs to the foe and strikes it again and again, is drawn, and goes after twelve seconds', r.t0 > 11 && r.first >= 0 && r.mid >= 10 && r.still && r.px > 300 && r.gone && r.total >= r.mid, r);

  // ---- Black Hole
  await arena(12, ALL);
  r = await ev(() => {
    const { G, P } = DW; const e = window.__mk('husk', 380, 0, 900), f = window.__mk('flyer', 200, -60, 900), hp0 = [e.hp, f.hp];
    const sh = new Proj({ x: P.cx + 215, y: P.cy - 30, vx: 0, dmg: 1, life: 9, r: 8, passWalls: true }); G.projs.push(sh);
    Powers.use('hole'); const h = Powers.state().hole, d0 = Math.hypot(e.cx - h.x, e.cy - h.y);
    DW.step(120); const d1 = Math.hypot(e.cx - h.x, e.cy - h.y), mid = [hp0[0] - e.hp, hp0[1] - f.hp], shotGone = !G.projs.includes(sh) || sh.dead;
    for (let i = 0; i < 400 && Powers.state().hole; i++) DW.step(1); const end = [hp0[0] - e.hp, hp0[1] - f.hp];
    return { d0, d1, mid, end, shotGone, gone: !Powers.state().hole };
  });
  ok('Black Hole: it drags the foes in, grinds them, swallows shots, and collapses with a heavy blow', r.d1 < r.d0 && r.mid[0] > 0 && r.shotGone && r.gone && r.end[0] - r.mid[0] >= 30, r);

  // ---- Storm Rage
  await arena(12, ALL);
  r = await ev(() => {
    const { G, P } = DW; const gap0 = P.strikeGap(), dmg0 = P.nailDamage(); const a = window.__mk('husk', 40, 0, 500), b = window.__mk('crawler', 150, 0, 500), c = window.__mk('crawler', 600, 0, 500);
    Powers.use('rage'); const gap1 = P.strikeGap(), dmg1 = P.nailDamage();
    P.face = 1; P.atkT = 0.1; P.hits = new Set(); P.atkDir = 'side'; P.atkBox = null; P.attackHits();
    const out = { gap0, gap1, dmg0, dmg1, a: 500 - a.hp, b: 500 - b.hp, c: 500 - c.hp, arcs: Powers.state().fx.filter(f => f.type === 'arc').length };
    DW.step(780); out.endDmg = P.nailDamage(); out.rage = Powers.state().rage; return out;
  });
  ok('Storm Rage: double blows, a quicker hand, lightning from the struck to the near one (not to the far one)', r.dmg1 === r.dmg0 * 2 && r.gap1 < r.gap0 * 0.7 && r.a >= r.dmg1 && r.b > 0 && r.c === 0 && r.arcs >= 1, r);
  ok('and after twelve seconds it is over', r.endDmg === r.dmg0 && r.rage <= 0, r);

  // ---- rooms and the strip
  await arena(12, ALL);
  r = await ev(() => { const { G, enterRoom } = DW; Powers.use('twin'); Powers.use('rage'); Powers.use('hole'); const a = ['twin', 'rage', 'hole'].map(id => Powers.active(id)); enterRoom('cx3', { door: WORLD.rooms.cx3.doors[0].id }); const b = ['twin', 'rage', 'hole'].map(id => Powers.active(id)); return { a, b, spent: Object.keys(Powers.state().used).length }; });
  ok('a new room ends what was running, and what was used stays spent', r.a.every(Boolean) && r.b.every(x => !x) && r.spent === 3, r);
  await arena(12, ['time', 'stars', 'phoenix']);
  r = await ev(() => { const { G } = DW; G.menuHits = []; DW.draw(); const hits = G.menuHits.filter(h => h.fn && h.y > 150 && h.y < 200 && h.x < 200); return { n: hits.length, hits: hits.map(h => [Math.round(h.x), Math.round(h.y)]) }; });
  ok('the strip under the gear has a picture for each power learned, and each is a button', r.n === 3, r);
  await ev(() => { const { G } = DW; G.menuHits = []; DW.draw(); });
  const tap = async (lx, ly) => { const b = await ev(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }); await page.mouse.click(b.l + lx * b.w / 960, b.t + ly * b.h / 540); await ev(() => DW.step(1)); };
  r = await ev(() => { const h = DW.G.menuHits.filter(h => h.fn && h.y > 150 && h.y < 200 && h.x < 200).sort((a, b) => a.x - b.x)[1]; return [h.x + h.w / 2, h.y + h.h / 2]; });
  await tap(r[0], r[1]);
  r = await ev(() => ({ stars: !!Powers.state().stars, used: Powers.state().used.stars }));
  ok('a tap on a picture uses that power (the second here: Star Fall)', r.stars && r.used, r);
  await ev(() => { const { G } = DW; G.state = 'pause'; G.menuHits = []; DW.draw(); });
  r = await ev(() => DW.G.menuHits.filter(h => h.fn && h.y > 150 && h.y < 200 && h.x < 200).length);
  ok('and no strip outside play', r === 0, r);
  await ev(() => { DW.G.state = 'play'; });

  // ---- the Powers tab of the Moves screen
  await arena(7, ['time', 'stars', 'phoenix', 'twin']);
  await ev(() => { const { G } = DW; G.state = 'pause'; G.menuSel = pauseItems().findIndex(i => i.id === 'moves'); G.menuHits = []; DW.draw(); });
  await key('Enter');
  r = await ev(() => ({ state: DW.G.state, tab: DW.G.movesTab, label: pauseItems().find(i => i.id === 'moves').label }));
  ok('the pause entry opens the Moves screen on the Moves tab (the entry now says moves and powers)', r.state === 'moves' && r.tab === 0 && /القوى/.test(r.label), r);
  await key('ArrowRight');
  r = await ev(() => DW.G.movesTab); ok('Right changes to the Powers tab', r === 1, r);
  await key('ArrowDown'); await key('ArrowDown');
  r = await ev(() => DW.G.powerSel); ok('Up and Down choose a power there', r === 2, r);
  await ev(() => { const { G } = DW; G.menuHits = []; DW.draw(); });
  await page.screenshot({ path: shot('powers_page.png') });
  r = await ev(() => {
    const { G } = DW, out = { err: null, rows: 0 };
    try { for (const lang of ['ar', 'en']) { LANG.cur = lang; for (let i = 0; i < 6; i++) { G.powerSel = i; G.menuHits = []; DW.draw(); out.rows = Math.max(out.rows, G.menuHits.length); } } } catch (e) { out.err = String(e); }
    LANG.cur = 'ar'; return out;
  });
  ok('every power draws on its page in both languages; the rows and the tabs are buttons', !r.err && r.rows >= 8, r);
  await ev(() => { const { G } = DW; G.powerSel = 5; G.menuHits = []; DW.draw(); const row = G.menuHits.find(h => h.fn && h.y > 70 && h.y < 100 && h.x < 100); row.fn(); });
  r = await ev(() => DW.G.powerSel); ok('a tap on a row chooses it', r === 0, r);
  await key('ArrowLeft');
  r = await ev(() => DW.G.movesTab); ok('Left goes back to the Moves tab', r === 0, r);
  await ev(() => { DW.G.state = 'play'; });

  // ---- a look at them, in the pictures for the gallery
  await arena(12, ALL);
  await ev(() => { window.__mk('husk', 170, 0, 900); window.__mk('crawler', 250, 0, 900); window.__mk('flyer', 320, -60, 900); Powers.use('hole'); Powers.use('rage'); DW.step(50); });
  await page.screenshot({ path: shot('powers_strip.png') });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
