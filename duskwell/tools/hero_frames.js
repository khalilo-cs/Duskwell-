// Every frame of the hero the owner drew, as the game holds them (docs/gallery/hero_frames.webp). usage: node tools/hero_frames.js [out]
const { open } = require('../tests/lib');
const fs = require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => HeroFrames.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const NAMES = { idle: 'idle', run: 'run', jump: 'jump', slash1: 'slash 1', slash2: 'slash 2', hit: 'hit', death: 'death', sit: 'bench' };
    const rows = Object.keys(HERO_FRAMES), k = 1.6, cw = 120, rh = 120, lab = 90;
    const c = document.createElement('canvas'); c.width = lab + Math.max(...rows.map(r => HERO_FRAMES[r].length)) * cw + 20; c.height = rows.length * rh + 10;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    rows.forEach((r, i) => {
      const y = 10 + i * rh + rh - 14;
      g.fillStyle = '#d6e0f4'; g.font = '700 15px sans-serif'; g.fillText(NAMES[r] || r, 10, y - rh / 2 + 10);
      g.fillStyle = '#2a3248'; g.fillRect(lab, y, HERO_FRAMES[r].length * cw, 3);
      HERO_FRAMES[r].forEach((f, j) => HeroFrames.frame(g, f, lab + cw / 2 + j * cw, y, 1, 1, Math.min(HeroFrames.scale() * k, (cw - 6) / f[2], (rh - 14) / f[3])));
    });
    return c.toDataURL('image/webp', 0.9);
  });
  fs.writeFileSync(process.argv[2] || require('path').join(__dirname, '..', 'docs', 'gallery', 'hero_frames.webp'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
