// Every projectile and explosion frame as the game holds it, with a few re-coloured rows
// (docs/gallery/proj_frames.webp). usage: node tools/proj_art.js [out]
const { open } = require('../tests/lib');
const fs = require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => ProjArt.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const rows = ['ice', 'rock', 'void', 'acid', 'fire', 'bolt', 'bone', 'meteor'], F = ProjArt.FRAMES(), cw = 150, rh = 96, lab = 64;
    const extra = [['void', '#ff9bd6'], ['void', '#9fe8c0'], ['void', '#dfe6ff'], ['ice', '#c8b8ff'], ['fire', '#bfe8d0'], ['bolt', '#ff9bd6'], ['acid', '#ff8a3a']];
    const all = rows.map(r => [r, null]).concat(extra);
    const c = document.createElement('canvas'); c.width = lab + 8 * cw + 10; c.height = all.length * rh + 10;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    all.forEach(([r, tint], i) => {
      const y = 10 + i * rh + rh / 2;
      g.fillStyle = '#d6e0f4'; g.font = '700 14px sans-serif'; g.fillText(r, 8, y - 2); if (tint) { g.fillStyle = tint; g.fillRect(8, y + 6, 40, 8); }
      for (let j = 0; j < 8; j++) {
        const f = F[r][j], k = Math.min((cw - 14) / f[2], (rh - 10) / f[3], 1.4), cx = lab + j * cw + cw / 2;
        ProjArt.put(g, r, j, cx - (f[2] / 2 - f[4]) * k, y - (f[3] / 2 - f[5]) * k, k, { tint });                                      // (each frame centred in its cell)
      }
    });
    return c.toDataURL('image/webp', 0.9);
  });
  fs.writeFileSync(process.argv[2] || require('path').join(__dirname, '..', 'docs', 'gallery', 'proj_frames.webp'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
