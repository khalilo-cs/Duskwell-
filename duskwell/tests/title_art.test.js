// The title screen is the owner's Duskwell banner (js/art_title.js): the picture is drawn (it drifts a little), the logo is in the
// picture so the code does not write the name over it (in Arabic the Arabic name stands under the logo), the tagline and the menu
// are below it, the "new game?" question still opens as a panel, and without the picture the older title screen comes back.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => typeof TitleArt !== 'undefined' && TitleArt.ready(), null, { timeout: 15000 });
  const ev = (f, a) => page.evaluate(f, a);
  // one picture of the title screen: what image was drawn, from where on it, and every word written
  const look = (lang, o) => ev(([lang, o]) => {
    const { G } = DW; LANG.cur = lang; G.state = 'title'; G.hasSave = !!o.save; G.confirmNew = !!o.confirm; G.menuSel = 0; G.t = o.t || 3;
    const words = [], imgs = [], ctx = CanvasRenderingContext2D.prototype, df = ctx.drawImage, ft = ctx.fillText;
    ctx.drawImage = function (im, ...a) { if (im && im.src) imgs.push({ src: im.src.split('/').pop(), sx: a[0] }); return df.call(this, im, ...a); };
    ctx.fillText = function (s, ...a) { words.push(String(s)); return ft.call(this, s, ...a); };
    try { DW.draw(); } finally { ctx.drawImage = df; ctx.fillText = ft; }
    return { words, imgs, ar: { title: tr('title'), sub: tr('subtitle'), new: tr('newgame'), cont: tr('cont'), lang: tr('lang'), confirm: tr('confirmNew') } };
  }, [lang, o]);

  let r = await look('en', { save: false });
  ok('the banner is drawn as the picture of the title screen', r.imgs.some(i => i.src === 'banner.webp'), r.imgs);
  ok('English: the logo is in the picture, so the name is not written over it; the tagline and the menu are', !r.words.includes(r.ar.title) && r.words.includes(r.ar.sub) && r.words.includes(r.ar.new) && r.words.includes(r.ar.lang), r.words);
  r = await look('ar', { save: true });
  ok('Arabic: the Arabic name stands under the logo, with the tagline and the whole menu (continue, new game, language)', r.words.includes(r.ar.title) && r.words.includes(r.ar.sub) && [r.ar.cont, r.ar.new, r.ar.lang].every(w => r.words.includes(w)), r.words);
  const a = (await look('en', { t: 0 })).imgs.find(i => i.src === 'banner.webp').sx, b = (await look('en', { t: 13 })).imgs.find(i => i.src === 'banner.webp').sx;
  ok('the picture drifts slowly from side to side', Math.abs(a - b) > 20 && Math.abs(a - b) < 120, [a, b]);
  r = await look('en', { confirm: true });
  ok('the "new game?" question opens as a panel over the picture, with yes and no', r.words.includes(r.ar.confirm) && r.imgs.some(i => i.src === 'banner.webp'), r.words);

  // the title on the page, as a player sees it
  await ev(() => { LANG.cur = 'ar'; DW.G.state = 'title'; DW.G.hasSave = true; DW.G.t = 3; });
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot('title_art.png') });

  // without the picture (it cannot be loaded) the older title screen comes back: the hero on the hill and the name in code
  await page.route('**/banner.webp', route => route.abort());
  await page.reload(); await page.waitForTimeout(1200);
  await ev(() => { DW.G.manual = true; DW.startGame(false); });
  r = await ev(() => {
    const { G } = DW; LANG.cur = 'en'; G.state = 'title'; G.hasSave = false; G.confirmNew = false; G.t = 3;
    const words = [], ft = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { words.push(String(s)); return ft.call(this, s, ...a); };
    let err = null; try { DW.draw(); } catch (e) { err = String(e); } finally { CanvasRenderingContext2D.prototype.fillText = ft; }
    return { failed: TitleArt.failed(), err, name: words.includes(tr('title')) };
  });
  ok('without the picture the older title screen is drawn (the name written in code), nothing breaks', r.failed && !r.err && r.name, r);

  ok('no page errors', errors.filter(e => !/banner|ERR_FAILED|Failed to load/.test(e)).length === 0, errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
