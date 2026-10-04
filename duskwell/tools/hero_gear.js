// The drawn hero with every weapon (in several poses) and every cloak (docs/gallery/hero_gear.webp). usage: node tools/hero_gear.js [out]
const { open } = require('../tests/lib');
const fs = require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => HeroFrames.ready() && HeroStyle.frames(), null, { timeout: 8000 });
  await page.waitForTimeout(400);
  const url = await page.evaluate(() => {
    const gear = DW.Gear, oldW = gear.weapon, oldC = gear.cloak;
    const W = gear.ORDER.weapon, C = gear.ORDER.cloak, poses = [['idle', 0], ['run', 2], ['slash1', 1], ['up', 3], ['down', 1], ['dash', 1]];
    const cw = 150, ch = 150, lab = 110, c = document.createElement('canvas'); c.width = lab + cw * Math.max(poses.length, C.length / 2 + 2); c.height = ch * W.length + 2 * ch + 40;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    const put = (f, x, y) => { const k = Math.min(1.1, 130 / f[3], 140 / f[2]); HeroFrames.frame(g, f, x + cw / 2 - (f[2] / 2 - f[4]) * k, y + ch - 10 - (f[3] - f[5]) * k, 1, 1, k); };
    g.font = '700 14px sans-serif';
    W.forEach((w, r) => {
      gear.weapon = () => w; g.fillStyle = '#d6e0f4'; g.fillText(gear.name ? gear.name('weapon', w) : w, 8, r * ch + ch / 2);
      poses.forEach(([a, i], ci) => put(HERO_FRAMES[a][i], lab + ci * cw, r * ch));
    });
    gear.weapon = oldW;
    const y0 = W.length * ch + 30;
    C.forEach((id, i) => { gear.cloak = () => id; const x = lab + (i % 4) * cw * 1.5, y = y0 + Math.floor(i / 4) * ch; g.fillStyle = '#d6e0f4'; g.fillText(gear.name ? gear.name('cloak', id) : id, x, y + 14); put(HERO_FRAMES.idle[0], x - 20, y); put(HERO_FRAMES.run[3], x + 70, y); });
    gear.cloak = oldC;
    return c.toDataURL('image/webp', 0.88);
  });
  fs.writeFileSync(process.argv[2] || require('path').join(__dirname, '..', 'docs', 'gallery', 'hero_gear.webp'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
