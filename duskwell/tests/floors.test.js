// Floors painted in code (js/art_floors.js): every area but the crystal one lays its own rock, tops, fringes and ledges.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = f => page.evaluate(f);
  const themes = await ev(() => FloorTiles.themes);
  ok('fourteen themes have a floor of their own (the crystal one has its tileset)', themes.length === 14 && !themes.includes('crystal'), themes);
  for (const th of themes) {
    const r = await page.evaluate(th => {
      const id = DW.WORLD.order.find(i => DW.WORLD.rooms[i].theme === th);
      if (!id) return { missing: true };
      DW.enterRoom(id, { pos: { x: 100, y: 100 } }); DW.G.state = 'play'; DW.G.trans = null;
      const L = DW.G.level, c = Art.renderLevel(L, 1), g = c.getContext('2d');
      const sheet = MossTiles.has(THEMES[th]), st = sheet ? MossTiles.stats : FloorTiles.stats;               // four areas are laid from the mossy sheet (moss_tiles.test.js), the rest by the painter
      // colours of the rock tiles: a real texture varies from tile to tile and inside a tile
      const lum = []; let solid = 0;
      for (let y = 1; y < L.h - 1 && lum.length < 400; y++) for (let x = 1; x < L.w - 1; x++) {
        if (L.get(x, y) !== 1 || L.get(x - 1, y) !== 1 || L.get(x + 1, y) !== 1 || L.get(x, y - 1) !== 1 || L.get(x, y + 1) !== 1) continue;
        solid++; const d = g.getImageData(x * 32 + 4, y * 32 + 4, 24, 24).data;
        for (let i = 0; i < d.length; i += 4 * 9) lum.push(0.3 * d[i] + 0.6 * d[i + 1] + 0.1 * d[i + 2]);
      }
      const mean = lum.reduce((a, b) => a + b, 0) / (lum.length || 1), sd = Math.sqrt(lum.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (lum.length || 1));
      return { id, sheet, theme: st.theme, tops: st.tops, fringes: st.fringes, solid, sd: +sd.toFixed(2), mean: +mean.toFixed(1) };
    }, th);
    ok(th + ': the room is laid (by the floor painter, or from the mossy sheet in its four areas), with tops and a textured rock', !r.missing && r.theme === th && r.tops > 0 && r.sd > 3, r);
  }
  // a room of ledges: they are drawn too
  const led = await ev(() => {
    const id = DW.WORLD.order.find(i => DW.WORLD.rooms[i].theme === 'frost' && DW.WORLD.rooms[i].t.some(v => v === 2));
    DW.enterRoom(id, { pos: { x: 100, y: 100 } }); Art.renderLevel(DW.G.level, 1); return FloorTiles.stats.ledges;
  });
  ok('one-way plates are drawn as ledges', led > 0, led);
  // the textures tile without a seam: the edge columns of each texture meet
  const seam = await ev(() => {
    const out = [];
    for (const th of FloorTiles.themes) for (const tex of FloorTiles.textures(th)) {
      const g = tex.getContext('2d'), a = g.getImageData(0, 0, 1, 128).data, b = g.getImageData(127, 0, 1, 128).data, c = g.getImageData(0, 0, 128, 1).data, d = g.getImageData(0, 127, 128, 1).data;
      let e = 0; for (let i = 0; i < a.length; i += 4) e += Math.abs(a[i + 3] - b[i + 3]); for (let i = 0; i < c.length; i += 4) e += Math.abs(c[i + 3] - d[i + 3]);
      out.push(e / 256);
    }
    return Math.max(...out);
  });
  ok('the texture edges match (no hard seam in the transparency)', seam < 120, seam);
  await ev(() => { DW.enterRoom('fr1', { pos: { x: 8 * 32, y: 17 * 32 } }); DW.G.state = 'play'; DW.G.areaBanner = null; DW.G.fadeA = 0; DW.G.trans = null; DW.G.enemies = []; DW.step(2); });
  await page.waitForTimeout(150); await page.screenshot({ path: shot('floors_frost.png') });
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
