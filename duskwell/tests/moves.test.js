// The Moves screen (pause menu): the five moves of the effects sheet, their keys and where they come from; the smith's prices;
// and the five effect strips draw once the atlas is loaded.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 15000 });
  // ---- the effects themselves
  let r = await ev(() => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d'), out = {};
    out.moon = FxArt.moon(g, { x: 200, y: 200, vx: 300, r: 20, t: 0.2 });
    out.rush = FxArt.rush(g, { face: 1, cx: 200, cy: 200, rushT: 0.1 });
    out.nova = FxArt.nova(g, { x: 300, y: 300, R: 340 }, 0.5);
    out.dive = FxArt.dive(g, { x: 300, y: 300 }, 0.4);
    out.comet = FxArt.comet(g, { cx: 300, cy: 300, sd: { dir: 1 } }, 0.3);
    out.loop = ['moon', 'rush', 'nova', 'dive', 'comet'].every(k => FxArt.loop(g, k, 300, 200, 200, 100, 0.7));
    return out;
  });
  ok('the five effect strips draw (crescent, slashes, nova, spikes, comet) and loop in a box', Object.values(r).every(Boolean), r);
  // ---- the smith
  r = await ev(() => Object.fromEntries(SHOPS.smith.items.filter(i => i.gear[0] === 'art').map(i => [i.gear[1], i.price])));
  ok('the smith teaches Moon Rend for 300, Dusk Rush for 400 and Soul Nova for 900', r.rend === 300 && r.rush === 400 && r.nova === 900, r);
  r = await ev(() => { const n = SHOPS.smith.items.find(i => i.gear[1] === 'nova'); for (const f of SEAL_FLAGS) DW.G.flags[f] = false; const a = shopLocked(n); DW.G.flags.boss_guardian = true; const b = shopLocked(n); DW.G.flags.boss_spore = true; const c = shopLocked(n); return { a, b, c }; });
  ok('Soul Nova needs two seals', r.a && r.b && !r.c, r);
  // ---- the pause menu opens the screen
  r = await ev(() => {
    const { G } = DW; DW.enterRoom('town', { pos: { x: 200, y: 300 } }); G.state = 'pause'; G.trans = null; G.fadeA = 0; G.areaBanner = null;
    const items = pauseItems(), i = items.findIndex(q => q.id === 'moves'); return { n: items.length, i, after: items[items.findIndex(q => q.id === 'gear') + 1].id };
  });
  ok('the pause menu has a Moves entry after Equipment', r.i > 0 && r.after === 'moves', r);
  await ev(() => { DW.G.menuSel = pauseItems().findIndex(q => q.id === 'moves'); });
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => ({ state: DW.G.state, sel: DW.G.moveSel }));
  ok('Enter opens it on the first move', r.state === 'moves' && r.sel === 0, r);
  // ---- five moves with names, keys, and a place to get each
  r = await ev(() => MOVES.map(m => ({ id: m.id, name: moveName(m), where: moveWhere(m), keys: m.keys.length, desc: moveDesc(m).length > 20 })));
  ok('five moves: Rend, Rush, Nova, Dive, Comet', r.map(m => m.id).join() === 'rend,rush,nova,dive,comet', r.map(m => m.id));
  ok('every move has a name, a description, keys in both languages and a place to get it', r.every(m => m.name && m.desc && m.keys === 2 && m.where.length > 10), r);
  ok('the dive and the comet say which area holds them, the arts say what the smith asks', /300/.test(r[0].where) && /400/.test(r[1].where) && /900/.test(r[2].where) && r[3].where !== r[4].where, r.map(m => m.where));
  // ---- known or not
  r = await ev(() => { const { P } = DW; P.ab.dive = false; P.ab.superdash = false; const before = MOVES.map(moveKnown); Gear.give('art', 'rend'); P.ab.dive = true; return { before, after: MOVES.map(moveKnown) }; });
  ok('a move reads as learned once the art is bought or the ability found', r.before.every(v => !v) && r.after.join() === 'true,false,false,true,false', r);
  // ---- Down and Up move the choice; Esc goes back to the pause menu
  await page.keyboard.press('ArrowDown'); await ev(() => DW.step(2));
  await page.keyboard.press('ArrowDown'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.moveSel); ok('Down twice selects the third move', r === 2, r);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowUp'); await ev(() => DW.step(2)); }
  r = await ev(() => DW.G.moveSel); ok('Up wraps round to the last move', r === 4, r);
  await ev(() => { DW.G.moveSel = 1; DW.G.movesT = 0.6; });
  await page.screenshot({ path: shot('moves_ar.png') });
  await page.keyboard.press('Escape'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.state); ok('Esc returns to the pause menu', r === 'pause', r);
  // ---- draws in both languages, learned or not
  r = await ev(() => {
    const out = [], { G } = DW;
    for (const lang of ['ar', 'en']) for (let i = 0; i < 5; i++) { setLang(lang); G.state = 'moves'; G.moveSel = i; G.movesT = i * 0.37; try { DW.draw(); } catch (e) { out.push(lang + i + ':' + e.message); } }
    setLang('ar'); G.state = 'play'; return out;
  });
  ok('the screen draws for every move in both languages', r.length === 0, r);
  // ---- the pause menu still fits on the screen with its extra entry
  r = await ev(() => { const { G } = DW; G.state = 'pause'; G.menuHits = []; DW.draw(); return { n: pauseItems().length, lowest: Math.max(...G.menuHits.map(h => h.y + h.h)) }; });
  ok('every entry of the pause menu is inside the picture', r.lowest < 540 && r.lowest > 400, r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
