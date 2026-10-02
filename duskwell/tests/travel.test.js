// Lantern stations (fast travel between lit stations) and the nail upgrade tiers.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const goto = (room) => page.evaluate(room => {
    const { G, P, enterRoom, Charms } = DW;
    enterRoom(room, { station: true }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; G.projs = [];
    P.invuln = 1e9; P.hp = P.maxHp = 5; P.dead = false; P.sitting = null; DW.step(40);
  }, room);
  const press = async code => { await page.keyboard.press(code); await ev(() => DW.step(1)); };

  // ---------- placement: one station per area, standing on the floor, clear above
  let r = await ev(() => {
    const out = []; const areas = new Set();
    for (const id of DW.WORLD.order) for (const s of DW.WORLD.rooms[id].stations) {
      const rm = DW.WORLD.rooms[id]; areas.add(rm.area);
      const air = [0, 1, 2].every(k => rm.at(s.x, s.y - k) === 0), below = rm.at(s.x, s.y + 1);
      const bench = rm.benches.some(b => Math.abs(b.x - s.x) >= 2 && Math.abs(b.x - s.x) <= 4 && b.y === s.y);
      out.push({ id, ok: air && (below === 1 || below === 2) && bench });
    }
    return { out, areas: areas.size, rooms: DW.WORLD.order.length };
  });
  ok('11 stations, one per area, on the floor beside a bench', r.out.length === 11 && r.areas === 11 && r.out.every(o => o.ok), r);

  // ---------- lighting
  await goto('cx2');
  r = await ev(() => ({ town: stationLit('town'), cx2: stationLit('cx2'), n: stationList().length }));
  ok('the hub station is lit from the start, others are dark', r.town === true && r.cx2 === false && r.n === 1, r);
  await ev(() => { const s = DW.G.stations[0]; DW.P.place(s.px, s.py, 1); DW.step(10); });
  await page.waitForTimeout(150); await page.screenshot({ path: shot('station_dark.png') });
  await press('ArrowUp');
  r = await ev(() => ({ lit: stationLit('cx2'), flag: !!DW.G.flags.station_cx2, toast: DW.G.toast && DW.G.toast.text, state: DW.G.state }));
  ok('Up at a dark station lights it', r.lit && r.flag && /أُضيئت|lit/i.test(r.toast || '') && r.state === 'play', r);
  await ev(() => DW.step(20)); await page.waitForTimeout(150); await page.screenshot({ path: shot('station_lit.png') });

  // ---------- travel
  await ev(() => { DW.P.geo = 100; });
  await press('ArrowUp');
  r = await ev(() => ({ state: DW.G.state, list: stationList().map(s => s.id) }));
  ok('Up at a lit station opens the travel list (hub only)', r.state === 'travel' && r.list.join() === 'town', r);
  await page.waitForTimeout(150); await page.screenshot({ path: shot('station_menu.png') });
  await press('Enter');                       // first entry: the hub
  await ev(() => DW.step(150));
  r = await ev(() => { const { G, P } = DW; const s = G.stations[0]; return { room: G.level.id, state: G.state, geo: P.geo, dx: Math.abs(P.cx - s.px), onGround: P.onGround }; });
  ok('travelled to the hub station for 25 geo', r.room === 'town' && r.state === 'play' && r.geo === 75 && r.dx < 3 && r.onGround, r);

  // from the hub the lit cx2 station is now listed; not enough geo refuses the trip
  await ev(() => { const s = DW.G.stations[0]; DW.P.place(s.px, s.py, 1); DW.step(10); DW.P.geo = 10; });
  await press('ArrowUp');
  r = await ev(() => ({ state: DW.G.state, list: stationList().map(s => s.id) }));
  ok('the hub lists the lit crossroads station', r.state === 'travel' && r.list.join() === 'cx2', r);
  await press('Enter'); await ev(() => DW.step(10));
  r = await ev(() => ({ room: DW.G.level.id, state: DW.G.state, geo: DW.P.geo }));
  ok('with 10 geo the trip is refused', r.room === 'town' && r.state === 'travel' && r.geo === 10, r);
  await press('Escape');
  r = await ev(() => DW.G.state); ok('Esc closes the list', r === 'play', r);

  // ---------- only the hub lit and standing in it: nothing to travel to
  await goto('town'); await ev(() => { DW.G.flags = {}; });
  await ev(() => { const s = DW.G.stations[0]; DW.P.place(s.px, s.py, 1); DW.step(10); });
  await press('ArrowUp');
  r = await ev(() => ({ state: DW.G.state, toast: DW.G.toast && DW.G.toast.text }));
  ok('with no other station lit, a toast explains', r.state === 'play' && !!r.toast, r);

  // ---------- saved flags survive a reload
  r = await ev(() => {
    const { G, P, Charms } = DW; G.flags = { station_cs2: true, station_aq3: true }; G.bench = { room: 'town' }; saveGame();
    G.flags = {}; startGame(true); G.state = 'play';
    return { cs2: stationLit('cs2'), aq3: stationLit('aq3'), wd2: stationLit('wd2') };
  });
  ok('lit stations are saved', r.cs2 && r.aq3 && !r.wd2, r);

  // ---------- the map shows the stations (smoke)
  await ev(() => { DW.G.state = 'map'; }); await page.waitForTimeout(150); await page.screenshot({ path: shot('station_map.png') });
  await ev(() => { DW.G.state = 'play'; });

  // ---------- nail tiers
  r = await ev(() => {
    const { G, P } = DW; G.flags = {}; P.nail = 5; P.geo = 5000; const out = {}; const buy = id => { const it = SHOP_ITEMS.find(i => i.id === id); P.geo -= it.price; G.flags[it.id] = true; it.apply(); };
    out.hidden = shopList().filter(i => i.id.startsWith('buy_nail')).map(i => i.id).join();
    buy('buy_nail'); out.n1 = P.nail; out.second = shopList().filter(i => i.id.startsWith('buy_nail') && !G.flags[i.id]).map(i => i.id).join();
    buy('buy_nail2'); out.n2 = P.nail; out.third = shopList().filter(i => i.id.startsWith('buy_nail') && !G.flags[i.id]).map(i => i.id).join();
    buy('buy_nail3'); out.n3 = P.nail;
    P.nail = 8; G.flags = {}; buy('buy_nail'); out.withFang = P.nail;     // a Brood Fang found first no longer gets overwritten
    return out;
  });
  ok('nail tiers appear one after another: 5 -> 9 -> 13 -> 17', r.hidden === 'buy_nail' && r.n1 === 9 && r.second === 'buy_nail2' && r.n2 === 13 && r.third === 'buy_nail3' && r.n3 === 17, r);
  ok('a nail with the Brood Fang (8) becomes 12, not 9', r.withFang === 12, r.withFang);

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
