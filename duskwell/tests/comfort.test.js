// Eye comfort: the soft look is the default, three levels cycle from the title and the pause menus and are kept, the colour filter is on the canvas,
// the white flash, the shake, the chromatic kick, the glow and the lightning are scaled down by the level, and the Lumen pass is told so.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true, gfx: 2 });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 20000 });
  const key = async (k, n) => { await page.keyboard.down(k); await ev(() => DW.step(2)); await page.keyboard.up(k); await ev(n => DW.step(n), n || 2); };
  const filter = () => ev(() => getComputedStyle(document.getElementById('c')).filter);

  // ---- the default and the levels
  let r = await ev(() => ({ level: Comfort.level, label: Comfort.label(), n: Comfort.LEVELS.length }));
  ok('a first visit gets the soft look', r.level === 1 && r.n === 3, r);
  r = await filter();
  ok('and the colour filter is on the canvas', /saturate\(0\.74\)/.test(r) && /contrast/.test(r) && /brightness/.test(r), r);
  r = await ev(() => { const out = []; for (let i = 0; i < 3; i++) { Comfort.set(i); out.push({ i, flash: Comfort.flash, shake: Comfort.shake, aberr: Comfort.aberr, bloom: Comfort.bloom, bolt: Comfort.bolt, css: document.getElementById('c').style.filter }); } Comfort.set(1); return out; });
  ok('each level softens more: flash, shake, glow and lightning fall step by step', ['flash', 'shake', 'bloom', 'bolt'].every(k => r[0][k] === 1 && r[0][k] > r[1][k] && r[1][k] > r[2][k]) && r[0].aberr === 1 && r[1].aberr < 1 && r[2].aberr === 0, r);
  ok('standard has no filter, softest takes more colour than soft', r[0].css === '' && /saturate\(0\.55\)/.test(r[2].css), [r[0].css, r[2].css]);
  r = await ev(() => { Comfort.set(2); const a = localStorage.getItem('duskwell_comfort'); Comfort.set(7); const b = Comfort.level; Comfort.set(1); return { a, b }; });
  ok('the level is kept, and nonsense falls back to soft', r.a === '2' && r.b === 1, r);

  // ---- the menus
  r = await ev(() => { const { G } = DW; G.state = 'title'; G.hasSave = false; return titleItems().map(i => i.id); });
  ok('the title menu has the entry', r.includes('comfort'), r);
  r = await ev(() => { const { G } = DW; G.state = 'pause'; return pauseItems().map(i => i.id); });
  ok('the pause menu has the entry (and no longer the effects row, which moved to the music screen)', r.includes('comfort') && !r.includes('sfx') && r.length === 16, r);
  await ev(() => { const { G } = DW; G.state = 'pause'; G.menuSel = pauseItems().findIndex(i => i.id === 'comfort'); });
  await key('Enter');
  r = await ev(() => ({ level: Comfort.level, state: DW.G.state, label: comfortLabel() }));
  ok('Confirm on it goes to the next level and stays in the menu', r.level === 2 && r.state === 'pause' && /مريح جداً/.test(r.label), r);
  await ev(() => { LANG.cur = 'en'; });
  r = await ev(() => comfortLabel()); ok('the label is in English too', r === 'Eye comfort: Softest', r);
  await ev(() => { LANG.cur = 'ar'; });
  await key('Enter'); await key('Enter');
  r = await ev(() => Comfort.level); ok('it cycles all the way round', r === 1, r);
  await ev(() => { const { G } = DW; G.state = 'title'; G.menuHits = []; G.hasSave = false; G.menuSel = titleItems().findIndex(i => i.id === 'comfort'); });
  await key('Enter');
  r = await ev(() => Comfort.level); ok('and from the title menu', r === 2, r);
  await ev(() => { Comfort.set(1); DW.G.state = 'play'; });

  // ---- the white flash
  r = await ev(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom('cx1', { door: WORLD.rooms.cx1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; P.invuln = 1e9; DW.step(10);
    const out = {}; const probe = () => { DW.draw(); const c = document.getElementById('c'); const t = document.createElement('canvas'); t.width = 40; t.height = 40; const g = t.getContext('2d'); g.drawImage(c, c.width / 2 - 20, c.height / 2 - 20, 40, 40, 0, 0, 40, 40); const d = g.getImageData(0, 0, 40, 40).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3; };
    G.flash = 0; out.base = probe();
    for (const lv of [0, 1, 2]) { Comfort.set(lv); G.flash = 0.7; out['f' + lv] = probe(); }
    Comfort.set(1); G.flash = 0; return out;
  });
  ok('the white flash is weaker at each level', r.f0 - r.base > r.f1 - r.base && r.f1 - r.base > r.f2 - r.base && r.f0 - r.base > 60 && r.f2 - r.base < 0.3 * (r.f0 - r.base), r);

  // ---- Lumen is told how much glow, lightning and kick to use
  r = await ev(() => {
    if (!Lumen.usable()) return { skipped: true };
    const { G, P } = DW, seen = []; const orig = Lumen.render; Lumen.render = o => { seen.push({ bloom: o.bloom, aberr: o.aberr, dark: o.dark }); return orig(o); };
    for (const lv of [0, 2]) { Comfort.set(lv); P.hurtT = 0.28; G.flash = 0.8; G.bolt = 0; DW.draw(); }
    Lumen.render = orig; Comfort.set(1); G.flash = 0; P.hurtT = 0;
    return { skipped: false, seen };
  });
  ok('Lumen gets the glow and the kick scaled (or the 2D path is in use)', r.skipped || (r.seen.length >= 2 && r.seen[0].bloom === 1 && r.seen[1].bloom === 0.5 && r.seen[0].aberr > 0 && r.seen[1].aberr === 0), r);

  // ---- a look at each level
  r = await ev(() => { const { G, P, enterRoom } = DW; enterRoom('fr1', { door: WORLD.rooms.fr1.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.toast = null; DW.step(30); return true; });
  for (const lv of [0, 1, 2]) {
    await ev(lv => { Comfort.set(lv); DW.draw(); }, lv);
    await page.waitForTimeout(150);
    await page.screenshot({ path: shot('comfort_' + lv + '.png') });
  }
  await ev(() => Comfort.set(1));
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
