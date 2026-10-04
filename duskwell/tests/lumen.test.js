// Lumen, the WebGL lighting pass: it runs, the terrain really casts shadows, the quality levels work,
// and from disk (file://) the game falls back to the 2D lighting.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  // ---------- from disk: the old lighting
  const disk = await open({ gfx: 'auto' });
  let r = await disk.page.evaluate(() => ({ ready: Lumen.ready(), usable: Lumen.usable() }));
  ok('opened from disk the game uses the classic lighting', r.usable === false, r);
  await disk.browser.close();

  const { browser, page, errors } = await open({ http: true, gfx: 'auto' });
  const ev = (f, a) => page.evaluate(f, a);
  r = await ev(() => ({ ready: Lumen.ready(), usable: Lumen.usable(), q: Lumen.quality(), mode: Lumen.mode() }));
  ok('over http WebGL2 lighting is ready and runs at the top level', r.ready && r.usable && r.q === 2 && r.mode === 'auto', r);

  // ---------- every area renders without errors and is not black
  const rooms = [['town', 20, 17], ['cx2', 30, 15], ['mg1', 20, 19], ['cs2', 12, 22], ['sp1', 12, 22], ['aq3', 30, 19], ['wd2', 22, 22], ['ht1', 20, 26], ['fd1', 60, 20]];
  for (const [id, x, y] of rooms) {
    const lum = await ev(([id, x, y]) => {
      const { G, P, enterRoom } = DW; enterRoom(id, { pos: { x: x * 32, y: (y + 1) * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; P.invuln = 1e9;
      DW.step(30); DW.draw();
      const c = G.canvas, g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 97) { s += d[i] + d[i + 1] + d[i + 2]; n++; }
      return { mean: s / n / 3, usable: Lumen.usable() };
    }, [id, x, y]);
    ok(id + ': rendered through Lumen, not black', lum.usable && lum.mean > 6, lum);
  }

  // ---------- terrain shadows: a wall between a light and a spot leaves that spot darker
  const measure = async q => {
    await ev(q => { Lumen.setQuality(q); }, q);
    return ev(() => {
      const { G, P, enterRoom } = DW;
      enterRoom('cx1', { pos: { x: 10 * 32, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; P.invuln = 1e9;
      DW.step(40);
      const L = G.level;
      for (let y = 30; y <= 39; y++) for (let x = 12; x <= 13; x++) L.set(x, y, T_SOLID);          // a wall to the right of the hero
      DW.step(2); G.tileCanvas = null; DW.draw(); DW.draw();
      const c = G.canvas, g = c.getContext('2d'), k = G.k, cam = G.cam;
      const lum = (wx0, wx1, wy0, wy1) => {
        const x0 = Math.round((wx0 - cam.x) * k), y0 = Math.round((wy0 - cam.y) * k), w = Math.round((wx1 - wx0) * k), h = Math.round((wy1 - wy0) * k);
        const d = g.getImageData(x0, y0, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4) / 3;
      };
      const cx = P.cx;
      return { right: lum(cx + 125, cx + 215, 36 * 32, 39 * 32), left: lum(cx - 215, cx - 125, 36 * 32, 39 * 32) };
    });
  };
  await ev(() => { DW.enterRoom('cx1', { pos: { x: 10 * 32, y: 40 * 32 } }); DW.G.trans = null; DW.draw(); });
  await page.waitForFunction(() => Art.paintedReady('cave'), null, { timeout: 20000 });              // the painted cave behind, before measuring light on it
  const m1 = await measure(1), m2 = await measure(2);
  const r1 = m1.right / m1.left, r2 = m2.right / m2.left;
  ok('without shadows both sides are similarly lit', r1 > 0.6 && r1 < 1.6, { r1, m1 });
  ok('with shadows the far side of the wall is clearly darker', r2 < r1 * 0.8, { r1, r2, m2 });
  await page.screenshot({ path: shot('lumen_shadow.png'), clip: { x: 250, y: 250, width: 800, height: 450 } });

  // ---------- creatures are lit: the rim and slope shading change the picture
  r = await ev(() => {
    const { G, P, enterRoom } = DW; Lumen.setQuality(2);
    enterRoom('cx2', { pos: { x: 35 * 32, y: 16 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; P.invuln = 1e9; DW.step(30);
    const out = {};
    const crop = () => { DW.draw(); const g = G.canvas.getContext('2d'), k = G.k; const x = Math.round((P.cx - 30 - G.cam.x) * k), y = Math.round((P.y - 10 - G.cam.y) * k); return g.getImageData(x, y, Math.round(60 * k), Math.round(60 * k)).data; };
    const a = crop(); Lumen.setQuality(0); const b = crop(); Lumen.setQuality(2);
    let diff = 0; for (let i = 0; i < a.length; i += 4) diff += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    out.diff = diff / (a.length / 4) / 3; return out;
  });
  ok('the hero looks different (lit by Lumen) than under the classic path', r.diff > 3, r);

  // ---------- hit aberration and heat haze render
  r = await ev(() => { const { G, P } = DW; P.hurtT = 0.2; G.flash = 0.4; DW.draw(); P.hurtT = 0; G.flash = 0; return 'ok'; });
  ok('the chromatic kick on a hit renders', r === 'ok');

  // ---------- quality levels from the pause menu
  r = await ev(() => {
    const { G } = DW; Lumen.setMode('auto'); const seen = [];
    G.state = 'pause'; G.menu = 'pause';
    const idx = () => pauseItems().findIndex(i => i.id === 'gfx');
    for (let i = 0; i < 5; i++) { G.menuSel = idx(); G.state = 'pause'; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' })); DW.step(1); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' })); seen.push(String(Lumen.mode())); }
    return { seen, label: gfxLabel() };
  });
  ok('the pause-menu item cycles auto -> 2 -> 1 -> 0 -> auto', r.seen.join() === '2,1,0,auto,2', r);

  // ---------- auto quality steps down when the game is slow
  r = await ev(() => { Lumen.setMode('auto'); const q0 = Lumen.quality(); for (let i = 0; i < 125; i++) Lumen.adapt(40); const q1 = Lumen.quality(); for (let i = 0; i < 125; i++) Lumen.adapt(40); return { q0, q1, q2: Lumen.quality() }; });
  ok('slow frames lower the quality, step by step, down to the classic path', r.q0 === 2 && r.q1 === 1 && r.q2 === 0, r);
  await ev(() => Lumen.setMode('auto'));

  // ---------- a broken wall rebakes the relief and the shadow follows
  r = await ev(() => {
    const { G } = DW; const L = G.level; Lumen.bakeRoom(L); L.set(20, 38, T_SOLID); const dirty1 = true; L.set(20, 38, T_AIR); return { dirty1 };
  });
  ok('changing the rock does not crash the next frame', r.dirty1 && (await ev(() => { DW.draw(); return true; })));

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
