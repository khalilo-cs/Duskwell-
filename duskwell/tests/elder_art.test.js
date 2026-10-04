// The town's Elder (js/art_elder.js): faces the hero, glows, the cloak flutters without a seam, and the old Elder is
// drawn when the picture is off.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => typeof ElderArt !== 'undefined' && ElderArt.ready(), null, { timeout: 15000 });
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => {
    const { G, P, enterRoom } = DW; enterRoom('town', { pos: { x: 13 * 32, y: 17 * 32 + 30 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.enemies = []; P.invuln = 1e9; DW.step(30);
    // one picture of the Elder: what was drawn of the wizard picture (the transform it was drawn with, where, which part), and the glows
    window.elder = () => G.npcs.find(n => n.type === 'elder');
    window.look = (t) => {
      const e = elder(), calls = [], glows = [], ctx = CanvasRenderingContext2D.prototype, df = ctx.drawImage, ob = window.bloom;
      ctx.drawImage = function (im, ...a) { if (im && im.src && im.src.endsWith('wizard.webp')) calls.push({ sx: a[0], dx: a[4], dy: a[5], flip: this.getTransform().a < 0 }); return df.call(this, im, ...a); };
      window.bloom = function (g, x, y, r, c, a) { glows.push({ r, c, a }); return ob.apply(this, arguments); };
      try { Art.drawNPC(document.createElement('canvas').getContext('2d'), e, t); } finally { ctx.drawImage = df; window.bloom = ob; }
      return { calls, glows };
    };
  });

  let r = await ev(() => look(1));
  ok('the Elder is drawn from the wizard picture: the figure in one piece and the cloak in strips', r.calls.length > 20 && r.calls[0].sx === 0, r.calls.length);

  // facing: the drawing looks left, so with the hero on his left the picture is as drawn, on his right it is turned
  const faces = await ev(() => { const e = elder(), out = {}; for (const [k, dx] of [['hero left', -100], ['hero right', 100]]) { G.player.x = e.px - G.player.w / 2 + dx; out[k] = look(1).calls[0].flip; } return out; });
  ok('he faces the hero, on whichever side the hero stands', faces['hero left'] === false && faces['hero right'] === true, faces);

  // the cloak flutters: at two moments the strips are at different heights, growing toward the tip; the figure itself stays where it is
  r = await ev(() => { const a = look(1.0).calls, b = look(1.9).calls, c = a.slice(1), d = b.slice(1); const diff = c.map((x, i) => Math.abs(x.dy - d[i].dy)); return { n: c.length, first: diff[0], last: Math.max(...diff.slice(-6)), most: Math.max(...diff), body: a[0].dy === b[0].dy && a[0].dx === b[0].dx }; });
  ok('the cloak flutters, more toward its tip, and starts without a seam (its first strip barely moves)', r.n > 20 && r.most > 0.8 && r.first < 0.3 && r.last > r.first * 3 && r.body, r);

  // the lights: the crystal on the staff and the lantern on his pack, brighter while he talks
  const g1 = await ev(() => look(2).glows), g2 = await ev(() => { DW.G.state = 'dialog'; DW.G.dialog = { lines: ['x'], i: 0, t: 1 }; const out = look(2).glows; DW.G.state = 'play'; DW.G.dialog = null; return out; });
  ok('the staff\'s crystal and the lantern glow amber, the crystal brighter while he talks', g1.length === 2 && g1.every(x => /^#ff[bd]/.test(x.c)) && g2[0].a > g1[0].a && g2[0].r > g1[0].r, [g1, g2]);

  // without the picture the older Elder is drawn, and nothing breaks
  r = await ev(() => { ElderArt.state.off = true; let err = null, n = 0; try { const c = document.createElement('canvas'); c.width = 200; c.height = 200; const g = c.getContext('2d'); g.translate(100, 150); const old = look(1); n = old.calls.length; Art.drawNPC(g, { ...elder(), px: 0, py: 0 }, 1); const d = g.getImageData(0, 0, 200, 200).data; let any = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) any++; if (!any) err = 'blank'; } catch (e) { err = String(e); } finally { ElderArt.state.off = false; } return { err, fromPicture: n }; });
  ok('without the picture the older Elder is drawn, nothing breaks', !r.err && r.fromPicture === 0, r);

  // the other townsfolk are untouched
  r = await ev(() => { const out = []; for (const n of G.npcs) { const c = document.createElement('canvas'); c.width = 200; c.height = 200; const g = c.getContext('2d'); g.translate(100, 150); const m = { ...n, px: 0, py: 0 }; try { Art.drawNPC(g, m, 1); out.push(n.type); } catch (e) { out.push('ERR ' + n.type + e); } } return out; });
  ok('every other townsperson still draws (' + r.join(', ') + ')', r.length >= 3 && !r.some(x => x.startsWith('ERR')), r);

  await ev(() => { const { G, P } = DW; P.x = 13 * 32; DW.step(5); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('elder_art.png') });
  ok('no page errors', errors.length === 0, errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
