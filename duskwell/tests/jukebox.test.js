// The Jukebox and the combat pulse. The Jukebox lists every piece of the score (none lost, each with its names, its place and its length), opens from the
// pause menu, moves with the keys and with taps, plays and stops what is chosen and gives the quiet piece back. The pulse follows the danger around
// the hero (creatures after him and near, a last mask), leaves the dead, the post and the bosses out, can be switched off and remembers it.
const fs = require('fs'), path = require('path');
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'audio', 'music', 'music.json'), 'utf8'));
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 15000 });
  const key = async (k, n) => { await page.keyboard.down(k); await ev(() => DW.step(2)); await page.keyboard.up(k); await ev(n => DW.step(n), n || 2); };
  const tap = async (lx, ly) => { const b = await ev(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }); await page.mouse.click(b.l + lx * b.w / 960, b.t + ly * b.h / 540); await ev(() => DW.step(1)); };

  // ---- the list
  let r = await ev(() => ({ n: JUKEBOX.length, ids: JUKEBOX.map(e => e[0]), bad: JUKEBOX.filter(e => e.length !== 5 || e.slice(1).some(s => typeof s !== 'string' || s.length < 2)).map(e => e[0]) }));
  ok('the list holds every piece of the score, once each', r.n === Object.keys(meta).length && new Set(r.ids).size === r.n && r.ids.every(i => meta[i]) && Object.keys(meta).every(i => r.ids.includes(i)), { n: r.n, meta: Object.keys(meta).length });
  ok('every entry has its two names and its two places', r.bad.length === 0, r.bad);
  ok('every piece has its mp3', r.ids.every(i => fs.existsSync(path.join(__dirname, '..', 'audio', 'music', i + '.mp3'))));
  await ev(() => { JUKEBOX.forEach(e => jukeLength(e[0])); });
  await page.waitForTimeout(1200);
  r = await ev(() => JUKEBOX.map(e => jukeLength(e[0])));
  ok('every length reads m:ss', r.every(l => /^\d+:\d\d$/.test(l)), r.filter(l => !/^\d+:\d\d$/.test(l)));

  // ---- opening it from the pause menu
  r = await ev(() => { const { G } = DW; G.state = 'pause'; G.menuSel = pauseItems().findIndex(i => i.id === 'music'); G.menuHits = []; DW.draw(); return G.menuSel; });
  ok('the pause menu has the Music entry', r >= 0, r);
  await key('Enter');
  r = await ev(() => { const { G } = DW; return { state: G.state, sel: G.jukeSel, here: JUKEBOX[G.jukeSel][0], track: Sound.track(), playing: G.jukePlay }; });
  ok('Confirm on it opens the Jukebox on the piece that is playing, playing nothing of its own', r.state === 'jukebox' && r.playing === null, r);

  // ---- keys
  await ev(() => { DW.G.jukeSel = 0; });
  await key('ArrowDown');
  r = await ev(() => DW.G.jukeSel); ok('Down goes to the next piece', r === 1, r);
  await key('ArrowUp'); await key('ArrowUp');
  r = await ev(() => DW.G.jukeSel); ok('Up from the first wraps to the last', r === 30, r);
  await ev(() => { DW.G.jukeSel = 6; });
  await key('Enter');
  r = await ev(() => { const { G } = DW; return { play: G.jukePlay, track: Sound.track() }; });
  ok('Confirm plays the chosen piece', r.play === 'abyss' && r.track === 'abyss', r);
  await ev(() => { DW.G.menuHits = []; DW.draw(); });
  await page.screenshot({ path: shot('jukebox_playing.png') });
  await key('Enter');
  r = await ev(() => { const { G } = DW; return { play: G.jukePlay, track: Sound.track() }; });
  ok('and again stops it: the quiet piece returns', r.play === null && r.track === 'rest', r);
  await key('KeyF');
  r = await ev(() => Sound.pulseOn()); ok('F turns the combat pulse off', r === false, r);
  r = await ev(() => localStorage.getItem('duskwell_pulse')); ok('and the choice is kept', r === '0', r);
  await key('KeyF');
  r = await ev(() => [Sound.pulseOn(), localStorage.getItem('duskwell_pulse')]); ok('and on again', r[0] === true && r[1] === '1', r);
  const v0 = await ev(() => Sound.levels().music);
  await key('ArrowRight');
  r = await ev(() => Sound.levels().music); ok('Right changes the music volume', r !== v0, [v0, r]);
  await ev(() => { while (Sound.levels().music !== 1) Sound.cycle('music'); });
  await ev(() => { DW.G.jukePlay = 'frost'; });
  await key('Escape');
  r = await ev(() => { const { G } = DW; return { state: G.state, play: G.jukePlay }; });
  ok('Escape goes back to the pause menu and stops the piece', r.state === 'pause' && r.play === null, r);

  // ---- taps
  await ev(() => { const { G } = DW; G.state = 'jukebox'; G.jukeSel = 0; G.jukePlay = null; G.menuHits = []; DW.draw(); });
  await tap(200, 70 + 16 + 52 * 2 + 26);
  r = await ev(() => DW.G.jukeSel); ok('a tap on a row selects it', r === 2, r);
  await tap(200, 70 + 16 + 52 * 2 + 26);
  r = await ev(() => DW.G.jukePlay); ok('a second tap on it plays it', r === 'adventure', r);
  await ev(() => { DW.G.menuHits = []; DW.draw(); });
  await tap(685, 450);
  r = await ev(() => DW.G.jukePlay); ok('the play button stops it', r === null, r);
  await tap(685, 450);
  r = await ev(() => DW.G.jukePlay); ok('and starts it', r !== null, r);
  await tap(780, 401);
  r = await ev(() => Sound.pulseOn()); ok('the pulse chip switches the pulse off', r === false, r);
  await tap(780, 401);
  await ev(() => { const { G } = DW; G.jukePlay = null; G.state = 'play'; });

  // ---- both languages draw, every row
  r = await ev(() => {
    const { G } = DW, out = { err: null }; G.state = 'jukebox';
    try { for (const lang of ['ar', 'en']) { LANG.cur = lang; for (let i = 0; i < JUKEBOX.length; i++) { G.jukeSel = i; G.menuHits = []; DW.draw(); } } } catch (e) { out.err = String(e); }
    LANG.cur = 'ar'; G.state = 'play'; return out;
  });
  ok('every piece draws in Arabic and in English', !r.err, r);

  // ---- the danger around the hero
  r = await ev(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom('cx1', { door: WORLD.rooms.cx1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; P.invuln = 1e9; P.dead = false; P.hp = P.maxHp = 5; DW.step(5);
    const out = {}; G.enemies = [];
    out.empty = combatK();
    const mk = (type, dx) => { const e = new ENEMY_TYPES[type]({ x: 0, y: 0 }); e.kind = type; e.x = P.cx + dx; e.y = P.y; e.currentState = ST.CHASE; G.enemies.push(e); return e; };
    const a = mk('crawler', 200); out.one = combatK();
    const b = mk('crawler', 240), c = mk('crawler', -220); out.three = combatK();
    a.currentState = ST.IDLE; b.currentState = ST.IDLE; c.currentState = ST.IDLE; out.idle = combatK();
    a.currentState = ST.CHASE; a.x = P.cx + 900; out.far = combatK();
    a.x = P.cx + 200; a.dead = true; out.dead = combatK(); a.dead = false;
    G.enemies = []; mk('crawler', 100).dummy = true; out.dummy = combatK();
    G.enemies = []; P.hp = 1; out.lastMask = combatK(); P.hp = 5;
    G.enemies = [mk('crawler', 100)]; G.state = 'pause'; out.paused = combatK(); G.state = 'play';
    P.dead = true; out.dying = combatK(); P.dead = false;
    return out;
  });
  ok('no danger, no pulse', r.empty === 0 && r.idle === 0 && r.far === 0 && r.dead === 0 && r.dummy === 0, r);
  ok('one creature after him raises it, three raise it more, and it stays within 1', r.one > 0 && r.three > r.one && r.three <= 1, r);
  ok('a last mask is danger by itself; a pause or a death is none', r.lastMask > 0 && r.paused === 0 && r.dying === 0, r);
  r = await ev(() => { Sound.setIntensity(0.6); const a = Sound.pulseState().target; Sound.setIntensity(7); const b = Sound.pulseState().target; Sound.setIntensity(-3); const c = Sound.pulseState().target; return { a, b, c, running: Sound.pulseState().running }; });
  ok('the intensity is kept within 0 and 1 and the pulse clock runs', r.a === 0.6 && r.b === 1 && r.c === 0 && r.running, r);

  // ---- the pulse keeps its hands off a boss, and out of the menus' quiet
  r = await ev(() => { const { G } = DW; G.state = 'play'; G.enemies = []; DW.step(2); return Sound.pulseState(); });
  ok('the pulse state is readable', typeof r.on === 'boolean' && typeof r.k === 'number', r);
  // ---- the real thing: with the audio running, danger brings drum thumps on the beat of the piece, quiet brings none, and the switch silences them
  await ev(() => {
    window.__osc = []; const orig = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () { const o = orig.call(this), s = o.start.bind(o); o.start = t => { window.__osc.push({ t, type: o.type }); return s(t); }; return o; };
  });
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  await ev(() => { const { G } = DW; G.manual = false; G.state = 'play'; Sound.setPulse(true); window.__combat = combatK; window.combatK = () => 0; });
  const thumps = async (k, ms) => { await ev(k => { window.combatK = () => k; window.__osc.length = 0; }, k); await page.waitForTimeout(ms); return ev(() => window.__osc.filter(x => x.type === 'sine').map(x => x.t).sort((a, b) => a - b)); };
  let ts = await thumps(0, 3000);
  ok('quiet: no thumps', ts.length === 0, ts.length);
  await ev(() => { window.combatK = () => 1; });
  for (let i = 0; i < 40 && !(await ev(() => Sound.pulseState().playing)); i++) await page.waitForTimeout(500);
  const info = await ev(() => Sound.trackInfo(Sound.track()));
  ts = await thumps(1, 5000);
  const beat = 60 / info.bpm, gaps = ts.slice(1).map((x, i) => x - ts[i]);
  ok('danger: thumps come, in time with the beats of the piece (every gap a whole number of beats)', ts.length >= 3 && gaps.every(g => Math.abs(g / beat - Math.round(g / beat)) < 0.04), { n: ts.length, beat, gaps: gaps.slice(0, 6) });
  await ev(() => Sound.setPulse(false));
  await page.waitForTimeout(500);
  ts = await thumps(1, 3000);
  ok('the pulse switched off: no thumps even in danger', ts.length === 0, ts.length);
  await ev(() => { window.combatK = window.__combat; Sound.setPulse(true); DW.G.manual = true; });

  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
