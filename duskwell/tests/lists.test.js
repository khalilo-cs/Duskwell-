// Long lists: the travel list shows a window of rows that follows the cursor (all 15 stations reachable, arrows when rows are
// out of view), rows and arrows can be tapped, and the shop, gear, music and quest lists answer taps too.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  const tap = (x, y) => ev(([x, y]) => { const c = G.canvas, r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + x * r.width / VW, clientY: r.top + y * r.height / VH, bubbles: true })); }, [x, y]);
  const frame = () => ev(() => { DW.step(1); DW.draw(); });

  await ev(() => { const { G, P, enterRoom } = DW; G.flags = {}; for (const id of WORLD.order) if (WORLD.rooms[id].stations.length) G.flags['station_' + id] = true; enterRoom('cx2', { station: true }); G.state = 'play'; G.trans = null; G.areaBanner = null; P.geo = 9999; G.state = 'travel'; G.menuSel = 0; DW.step(2); DW.draw(); });
  let r = await ev(() => ({ n: stationList().length, hits: G.menuHits.filter(h => h.i !== undefined).length }));
  ok('14 stations plus "leave" are listed; six rows are drawn and tappable', r.n === 14 && r.hits === 6, r);

  // every row can be reached by the cursor and is in view when it is selected
  r = await ev(() => { const bad = []; for (let s = 0; s < 15; s++) { G.menuSel = s; DW.draw(); const h = G.menuHits.find(h => h.i === s); if (!h || h.y < 150 || h.y + h.h > 460) bad.push(s); } return bad; });
  ok('each of the 15 rows is inside the panel when selected', r.length === 0, r);

  // keys: down from the top walks the whole list, wrapping at the end
  await ev(() => { G.menuSel = 0; });
  for (let i = 0; i < 14; i++) { await page.keyboard.press('ArrowDown'); await frame(); }
  r = await ev(() => ({ sel: G.menuSel, top: G.scr.travel }));
  ok('Down fourteen times reaches "leave" with the window scrolled to the end', r.sel === 14 && r.top === 9, r);
  await page.keyboard.press('ArrowDown'); await frame();
  r = await ev(() => ({ sel: G.menuSel, top: G.scr.travel }));
  ok('and one more wraps to the first row', r.sel === 0 && r.top === 0, r);

  // taps: the down arrow pages, a row travels
  await frame(); await tap(480, 462); await frame();
  r = await ev(() => ({ sel: G.menuSel, top: G.scr.travel }));
  ok('a tap on the lower arrow moves a page down', r.sel === 6 && r.top === 1, r);
  await ev(() => { G.menuSel = 3; DW.draw(); });
  const dest = await ev(() => { const h = G.menuHits.find(h => h.i === 3); return { x: h.x + h.w / 2, y: h.y + h.h / 2, id: stationList()[3].id }; });
  await tap(dest.x, dest.y); await ev(() => DW.step(150));
  r = await ev(() => ({ room: G.level.id, state: G.state }));
  ok('a tap on a row travels there', r.room === dest.id && r.state === 'play', [r, dest.id]);

  // the wheel moves the cursor
  await ev(() => { G.state = 'travel'; G.menuSel = 0; });
  await page.mouse.move(480, 270); await page.mouse.wheel(0, 100); await ev(() => DW.step(1));
  r = await ev(() => G.menuSel);
  ok('the wheel moves down the list', r === 1, r);
  await ev(() => { G.menuSel = 8; DW.draw(); }); await page.waitForTimeout(100); await page.screenshot({ path: shot('travel_list.png') });

  // pause menu: sixteen rows all inside the screen and clear of the hint line
  r = await ev(() => { G.state = 'pause'; G.menu = 'pause'; G.menuSel = 15; DW.draw(); const hs = G.menuHits.filter(h => h.i !== undefined); return { n: hs.length, last: Math.max(...hs.map(h => h.y + h.h)) }; });
  ok('the pause menu lists all its entries above the control hint', r.n >= 15 && r.last < 510, r);

  // shop and gear rows answer taps
  await ev(() => { G.state = 'shop'; G.shopId = 'general'; G.menuSel = 0; G.shopTop = 0; DW.step(1); DW.draw(); });
  r = await ev(() => { const hs = G.menuHits.filter(h => h.i !== undefined); return { n: hs.length }; });
  ok('the shop rows can be tapped', r.n >= 3, r);
  await ev(() => { DW.P.geo = 0; });
  const row = await ev(() => { const h = G.menuHits.find(h => h.i === 2); return h && { x: h.x + h.w / 2, y: h.y + h.h / 2 }; });
  await tap(row.x, row.y); await frame();
  r = await ev(() => G.menuSel);
  ok('the first tap on a shop row selects it without buying', r === 2, r);
  await ev(() => { G.state = 'gear'; G.gearSel = 0; G.gearTab = 0; DW.step(1); DW.draw(); });
  r = await ev(() => ({ rows: G.menuHits.filter(h => h.gear).length, tabs: G.menuHits.filter(h => h.fn && h.y === 70).length }));
  ok('gear rows and tabs can be tapped', r.rows >= 1 && r.tabs === 3, r);
  const tab = await ev(() => G.menuHits.find(h => h.fn && h.y === 70 && h.x > 700)); await tap(tab.x + 5, tab.y + 5);
  r = await ev(() => G.gearTab); ok('a tap on a tab switches it', r === 2, r);

  // the music list pages with its arrows
  await ev(() => { G.state = 'jukebox'; G.jukeSel = 0; G.jukeT = 0; DW.step(1); DW.draw(); });
  await frame(); await tap(243, 506); await frame();
  r = await ev(() => G.jukeSel); ok('the music list pages down on a tap', r === 8, r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
