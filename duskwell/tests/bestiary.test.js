// The bestiary: every creature and boss has an entry and drawn art, creatures are entered when first seen, the list is
// saved, and the screen opens from the pause menu and browses.
const { open, shot } = require('./lib');
let fails = 0, BESTN = 35 + 6 + 4;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  let r = await ev(() => {
    const keys = BESTIARY.map(b => (b.boss ? 'b:' : 'e:') + b.k), dup = keys.filter((k, i) => keys.indexOf(k) !== i);
    const noArt = BESTIARY.filter(b => { const c = document.createElement('canvas'); c.width = c.height = 400; return !Art.drawCreature(c.getContext('2d'), b.k, !!b.boss, 200, 300, 2, 1, {}); }).map(b => b.k);
    const missEnemy = Object.keys(ENEMY_TYPES).filter(k => !['slimelet', 'brood_child'].includes(k) && BESTIARY_INDEX['e:' + k] === undefined);
    const missBoss = Object.keys(BOSS_TYPES).filter(k => BESTIARY_INDEX['b:' + k] === undefined);
    const noText = BESTIARY.filter(b => !(b.ar[0] && b.ar[1] && b.en[0] && b.en[1] && b.ar[1].length > 30 && b.en[1].length > 30)).map(b => b.k);
    const areas = BESTIARY.filter(b => !STR.ar['area_' + b.area] && !['hushvale', 'crossroads', 'mossgrove', 'crystal', 'spore', 'aqueduct', 'webbed', 'throne'].includes(b.area)).map(b => b.k);
    return { n: BESTIARY.length, dup, noArt, missEnemy, missBoss, noText, areas };
  });
  ok('every creature and boss has an entry, art and text in both languages', r.n === BESTN && !r.dup.length && !r.noArt.length && !r.missEnemy.length && !r.missBoss.length && !r.noText.length, r);
  r = await ev(() => {                                        // a creature that comes into view is entered, once
    const { G, P, enterRoom } = DW; G.seen = {};
    enterRoom('cx1', { pos: { x: 10 * 32 + 16, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; P.invuln = 1e9; DW.step(5);
    const c = new ENEMY_TYPES.crawler({ type: 'crawler', x: 14, y: 39 }); c.kind = 'crawler'; G.enemies.push(c);
    const far = new ENEMY_TYPES.ram({ type: 'ram', x: 36, y: 39 }); far.kind = 'ram'; far.x = P.cx + 1500; G.enemies.push(far);
    DW.step(2); const toast = G.toast && G.toast.text; const seen = { ...G.seen }; DW.step(5);
    return { seen, toast, again: G.toast && G.toast.t < 0.3 };
  });
  ok('a creature in view is entered (once); a far one is not', r.seen['e:crawler'] && !r.seen['e:ram'] && /Added|دخل/.test(r.toast || ''), r);
  r = await ev(() => {                                        // the save keeps the list
    const { G, P } = DW; G.seen = { 'e:crawler': true, 'b:king': true }; G.bench = G.bench || { room: 'town' };
    saveGame(); const s = readSave(); return s && s.seen;
  });
  ok('the list is saved', r && r['e:crawler'] && r['b:king'], r);
  r = await ev(() => {                                        // the menu opens it, left/right browse and wrap, back returns
    const { G } = DW; G.state = 'pause'; G.menu = 'pause'; const items = pauseItems(); const idx = items.findIndex(i => i.id === 'bestiary'); G.menuSel = idx;
    return { idx, label: items[idx] && items[idx].label };
  });
  ok('the pause menu has the bestiary', r.idx >= 0, r);
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => ({ state: DW.G.state }));
  ok('Enter opens the bestiary screen', r.state === 'bestiary', r);
  await page.keyboard.press('ArrowLeft'); await ev(() => DW.step(1));
  r = await ev(() => DW.G.bestSel);
  ok('Left from the first entry wraps to the last', r === BESTN - 1, r);
  await ev(() => { DW.G.seen = {}; for (const b of BESTIARY) DW.G.seen[(b.boss ? 'b:' : 'e:') + b.k] = true; DW.G.bestSel = BESTIARY_INDEX['b:king']; });
  await page.waitForTimeout(200); await page.screenshot({ path: shot('bestiary_king.png') });
  await ev(() => { DW.G.bestSel = BESTIARY_INDEX['e:warden']; }); await page.waitForTimeout(200); await page.screenshot({ path: shot('bestiary_warden.png') });
  await page.keyboard.press('Escape'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.state);
  ok('Esc goes back to the pause menu', r === 'pause', r);
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
