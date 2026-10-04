// Every world piece as the game holds it (docs/gallery/world_pieces.webp). usage: node tools/world_pieces.js [out]
const { open } = require('../tests/lib');
const fs = require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => WorldArt.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const names = Object.keys(WORLD_RECTS).sort(), cw = 230, ch = 210, cols = 7, rows = Math.ceil(names.length / cols);
    const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    names.forEach((n, i) => {
      const r = WORLD_RECTS[n], x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch, k = Math.min(1, (cw - 20) / r[2], (ch - 40) / r[3]);
      g.fillStyle = '#232b3e'; g.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
      WorldArt.put(g, n, x0 + cw / 2, y0 + ch - 12, k, 0.5, 1);
      g.fillStyle = '#d6e0f4'; g.font = '700 13px sans-serif'; g.fillText(n, x0 + 9, y0 + 20);
    });
    return c.toDataURL('image/webp', 0.88);
  });
  fs.writeFileSync(process.argv[2] || require('path').join(__dirname, '..', 'docs', 'gallery', 'world_pieces.webp'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
