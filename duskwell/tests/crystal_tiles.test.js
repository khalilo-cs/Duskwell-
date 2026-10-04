// The Crystal Spires drawn from the owner's tileset (js/art_tiles.js): the rooms of that theme lay their rock from the owner's fills
// (not the old procedural tiles), wear the tan trim on top and stalactite fringes below, have the drawn ledges for one-way plates,
// and scenery on their floors that never stands on a door, a bench or a thing to find; the other areas keep their own tiles, and
// without the atlas the old tiles are drawn.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => typeof CrystalTiles !== 'undefined' && CrystalTiles.ready(), null, { timeout: 15000 });
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => {
    window.enter = id => { const { G, P, enterRoom } = DW; enterRoom(id, {}); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; P.invuln = 1e9; };
    // the layer of the current room, with what was laid; tiles = the picture's pixels of one tile
    window.layer = () => { const L = DW.G.level, c = Art.renderLevel(L, 1); return { L, c, g: c.getContext('2d', { willReadFrequently: true }) }; };
    window.stats = () => JSON.parse(JSON.stringify(CrystalTiles.stats));
  });

  let r = await ev(() => Object.keys(CRYSTAL_TILES).sort().join());
  ok('thirty pieces: four fills, floors, walls, ceilings, corners, slopes, ledges, spikes and six scenes', Object.keys(await ev(() => CRYSTAL_TILES)).length === 30 && /fill_0/.test(r) && /prop_hall/.test(r) && /ledge_2/.test(r), r);

  // every room of the area lays its rock from the pieces; the cave's rooms do not
  const out = {};
  for (const id of ['cs1', 'cs2', 'cs3', 'cs4']) {
    out[id] = await ev(id => { enter(id); const b = stats().renders; const { L } = layer(); const s = stats(); return { laid: s.renders - b, fills: s.fills, trims: s.trims, fringes: s.fringes, ledges: s.ledges, props: s.placed.map(p => p.kind) }; }, id);
  }
  ok('the four rooms of the Crystal Spires are laid from the owner\'s pieces', Object.values(out).every(o => o.laid === 1 && o.fills > 200 && o.trims >= 1), out);
  ok('rock has its trim on top, stalactite fringes below, and the plates are the drawn ledges', out.cs1.fringes >= 1 && out.cs2.ledges >= 2 && out.cs3.ledges >= 4, out);
  r = await ev(() => { enter('cx1'); const b = stats().renders; layer(); return stats().renders - b; });
  ok('the other areas keep their own tiles (the hook is for the crystal theme only)', r === 0, r);

  // the picture: the rock is textured and teal (the old fill was a flat purple), the floor's top is tan, the underside has stalactites
  const probe = () => ev(() => {
    enter('cs2'); const { L, g } = layer(); const T = TILE, o = {};
    const solid = (x, y) => [1, 4, 5, 7].includes(L.get(x, y));
    // a tile deep in the rock: all its neighbours rock
    let deep = null; for (let y = 1; y < L.h - 1 && !deep; y++) for (let x = 1; x < L.w - 1 && !deep; x++) { let all = true; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (L.get(x + i, y + j) !== 1) all = false; if (all) deep = [x, y]; }
    const px = (x, y, w, h) => g.getImageData(x, y, w, h).data;
    const colours = d => { const s = new Set(); for (let i = 0; i < d.length; i += 4) s.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); return s.size; };
    const d = px(deep[0] * T, deep[1] * T, T, T); o.deepColours = colours(d); let gr = 0, bl = 0; for (let i = 0; i < d.length; i += 4) { gr += d[i + 1]; bl += d[i + 2]; } o.teal = gr / bl > 0.7;
    // the top of the first free-standing floor tile: tan pixels (red above blue)
    let top = null; for (let y = 1; y < L.h && !top; y++) for (let x = 3; x < L.w - 3 && !top; x++) if (L.get(x, y) === 1 && L.get(x - 1, y) === 1 && L.get(x + 1, y) === 1 && !solid(x, y - 1)) top = [x, y];
    const t = px(top[0] * T, top[1] * T - 2, T, 12); let tan = 0; for (let i = 0; i < t.length; i += 4) if (t[i + 3] > 200 && t[i] > t[i + 2] + 18 && t[i] > 80) tan++; o.tan = tan;
    return o;
  });
  const lit = await probe();
  ok('the rock is textured (many colours per tile) and teal, the floor\'s top wears the tan trim', lit.deepColours > 25 && lit.teal && lit.tan >= 20, lit);
  // the same room with the hook switched off: the old tiles are flat purple and have no tan
  const old = await ev(() => { const h = Art.tileHooks.crystal; Art.tileHooks.crystal = undefined; try { enter('cs2'); const { L, g } = layer(); const c = new Set(); const d = g.getImageData(8 * TILE, 20 * TILE, TILE, TILE).data; for (let i = 0; i < d.length; i += 4) c.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); return c.size; } finally { Art.tileHooks.crystal = h; } });
  ok('(for comparison: the older tile has few colours: ' + old + ' against ' + lit.deepColours + ')', old < lit.deepColours, [old, lit.deepColours]);

  // the scenery: stands on floor, in free air, away from doors, benches and things to find; the boss arena has crystals only
  r = await ev(() => {
    const bad = [], seen = new Set(); let total = 0;
    for (const id of ['cs1', 'cs2', 'cs3', 'cs4']) {
      enter(id); const { L } = layer(); const def = L.def;
      for (const p of stats().placed) {
        total++; seen.add(p.kind);
        for (let i = 0; i < p.fw; i++) {
          if (L.get(p.x0 + i, p.y) !== 1) bad.push([id, 'floor', p]);
          for (let j = 1; j <= p.nh; j++) if (L.get(p.x0 + i, p.y - j) !== 0) bad.push([id, 'air', p]);
        }
        const near = [].concat((def.doors || []).map(d => [d.x - 2, d.y - 1, d.w + 4, d.h + 2]), [].concat(def.benches || [], def.stations || [], def.signs || [], def.npcs || [], def.items || [], def.mech || []).map(q => [q.x - 3, q.y - 4, 7, 6]));
        for (const q of near) if (p.x0 < q[0] + q[2] && p.x0 + p.fw > q[0] && p.y - p.nh < q[1] + q[3] && p.y > q[1]) bad.push([id, 'clash', p]);
        if (def.arena && p.kind !== 'crystal') bad.push([id, 'arena', p]);
      }
    }
    return { total, kinds: [...seen], bad: bad.slice(0, 4) };
  });
  ok('scenery stands on floor in free air, clear of doors, benches and things to find; arenas have crystals only', r.total >= 3 && r.bad.length === 0, r);

  // the floors that only a dive breaks: the owner\'s rock with glowing cracks; other areas keep their drawing
  r = await ev(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const b = stats().cracks;
    Art.drawCrack(g, 0, 0, THEMES.crystal, 0); const a = stats().cracks; Art.drawCrack(g, 0, 0, THEMES.cave, 0);
    return [a - b, stats().cracks - a];
  });
  ok('a cracked floor in the Spires is the drawn rock with glowing cracks; elsewhere the old drawing', r[0] === 1 && r[1] === 0, r);

  // without the atlas the old tiles come back and nothing breaks
  r = await ev(() => {
    const h = Art.tileHooks.crystal, was = h.ready; h.ready = () => false; let err = null, n = 0;
    try { enter('cs1'); const b = stats().renders; const { c } = layer(); n = stats().renders - b; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let any = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i]) any++; if (!any) err = 'blank'; } catch (e) { err = String(e); } finally { h.ready = was; }
    return { err, laidByHook: n };
  });
  ok('without the atlas the older tiles are drawn, nothing breaks', !r.err && r.laidByHook === 0, r);

  // a look at the Spires in play
  await ev(() => { const { G, P } = DW; enter('cs2'); P.x = 8 * 32; P.y = 22 * 32; G.tileCanvas = null; DW.step(30); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('crystal_tiles.png') });
  ok('no page errors', errors.length === 0, errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
