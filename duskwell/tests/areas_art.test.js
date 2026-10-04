// What was cut from the concept sheets (js/art_areas.js): area pictures and strips, palettes, prop silhouettes, the village layers.
const { open } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = f => page.evaluate(f);
  // every area has its picture, its strip and a four-colour palette
  const themes = await ev(() => Object.values(AreaArt.THEME_OF));
  ok('fifteen areas are mapped to a theme', themes.length === 15, themes.length);
  await page.waitForFunction(() => Object.values(AreaArt.THEME_OF).every(t => AreaArt.picture(t) && AreaArt.strip(t)), null, { timeout: 60000 });
  const pics = await ev(() => Object.values(AreaArt.THEME_OF).map(t => { const p = AreaArt.picture(t), s = AreaArt.strip(t), pal = AreaArt.palette(t); return { t, pw: p.naturalWidth, sw: s.naturalWidth, pal: pal && pal.length }; }));
  ok('each area has a picture, a strip wider than tall, and four palette colours', pics.every(p => p.pw > 200 && p.sw > p.pw * 0.2 && p.pal === 4), pics.filter(p => !(p.pw > 200 && p.pal === 4)));
  ok('the village and the road have their own big pictures', await ev(() => !!AreaArt.picture('townb') && !!AreaArt.picture('cave')));
  // the palette tints the banner colours
  const col = await ev(() => { const c = {}; AreaArt.applyColors(c); return c; });
  ok('every area gets an accent colour from its palette', Object.keys(col).length === 15 && Object.values(col).every(v => /^(#[0-9a-f]{6}|rgb\(\d+,\s*\d+,\s*\d+\))$/i.test(v)), col);
  // the village has four layers, the road a panorama sky only
  await ev(() => Art.loadPainted('town')); await ev(() => Art.loadPainted('townb')); await ev(() => Art.loadPainted('cave'));
  await page.waitForFunction(() => Art.paintedReady('town') && Art.paintedReady('townb') && Art.paintedReady('cave'), null, { timeout: 60000 });
  ok('painted backdrops of the village, the road and the cavern are ready', true);
  const bgs = await ev(() => ['tw1', 'tw2'].map(id => DW.WORLD.rooms[id].bg));
  ok('the two village roads use the panorama backdrop', bgs.every(b => b === 'townb'), bgs);
  // props: the atlas is cut into silhouettes and placed on floors
  await page.waitForFunction(() => AreaArt.propsReady(), null, { timeout: 30000 });
  const props = await ev(() => Object.fromEntries(Object.entries(PROP_RECTS).map(([k, v]) => [k, v.length])));
  ok('props were cut for the themes', Object.keys(props).length >= 13 && Object.values(props).every(n => n > 0), props);
  const placed = await ev(() => {
    const out = {};
    for (const th of Object.keys(PROP_RECTS)) {
      const id = DW.WORLD.order.find(i => DW.WORLD.rooms[i].theme === th && DW.WORLD.rooms[i].w >= 36); if (!id) continue;
      DW.enterRoom(id, { pos: { x: 100, y: 100 } }); DW.G.state = 'play'; DW.G.trans = null;
      Art.renderLevel(DW.G.level, 1); out[th] = AreaArt.stats.placed;
    }
    return out;
  });
  ok('props stand on the floors of wide rooms', Object.keys(placed).length >= 12 && Object.values(placed).filter(n => n > 0).length >= Object.keys(placed).length - 2, placed);
  // the banner and the map draw with the pictures without errors
  const draw = await ev(() => {
    DW.enterRoom('town', { pos: { x: 100, y: 100 } }); DW.G.state = 'play'; DW.G.trans = null;
    DW.G.areaBanner = { t: 60, name: 'x' }; DW.step(2); DW.draw();
    DW.G.state = 'map'; DW.draw(); DW.G.state = 'play'; return true;
  });
  ok('the banner and the map draw', draw);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
