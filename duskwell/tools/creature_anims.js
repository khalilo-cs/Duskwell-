// Every frame of the creatures drawn frame by frame, as the game draws them (docs/gallery/creature_anims.webp).
// usage: node tools/creature_anims.js [out file]
const { open } = require('../tests/lib');
const fs = require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => AnimArt.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const kinds = Object.keys(CREATURE_ANIMS), parts = ['idle', 'walk', 'atk', 'hurt', 'death'];
    const NAMES = {};
    const same = (k, p) => p === 'walk' && String(CREATURE_ANIMS[k].walk) === String(CREATURE_ANIMS[k].idle);   // fliers: the walk is the wing beat
    const sc = 0.5, cw = 70, rh = 96, lab = 96;
    const cols = Math.max(...kinds.map(k => parts.reduce((n, p) => n + (same(k, p) ? 0 : CREATURE_ANIMS[k][p].length), 0)));
    const c = document.createElement('canvas'); c.width = lab + cols * cw + 40; c.height = kinds.length * rh + 30;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    const COL = { idle: '#3a4766', walk: '#35574a', atk: '#6a3a3a', hurt: '#6a5a2a', death: '#4a3a5a' };
    kinds.forEach((k, r) => {
      const y0 = 26 + r * rh, gy = y0 + rh - 14; let x = lab;
      g.fillStyle = '#d6e0f4'; g.font = '700 14px sans-serif'; g.fillText(NAMES[k] || k, 10, y0 + rh / 2);
      for (const p of parts) {
        if (same(k, p)) continue;
        const n = CREATURE_ANIMS[k][p].length;
        g.fillStyle = COL[p]; g.fillRect(x + 2, gy, n * cw - 4, 4);
        for (let i = 0; i < n; i++) {
          const f = CREATURE_ANIMS[k][p][i], s2 = Math.min(sc, (cw - 4) / f[2], (rh - 18) / f[3]);           // big frames are shrunk to fit their cell
          AnimArt.drawFrame(g, k, p, i, x + cw / 2 + i * cw - (f[2] / 2 - f[4]) * s2, gy - (f[3] - f[5]) * s2, s2, 1);
        }
        x += n * cw;
      }
    });
    let x = lab; g.font = '700 13px sans-serif';
    for (const p of parts) { const n = CREATURE_ANIMS.husk[p].length; g.fillStyle = COL[p]; g.fillText({ idle: 'idle', walk: 'walk', atk: 'attack: wind-up / strike / recovery', hurt: 'hurt', death: 'death' }[p], x + 6, 17); x += n * cw; }
    return c.toDataURL('image/webp', 0.9);
  });
  fs.writeFileSync(process.argv[2] || require('path').join(__dirname, '..', 'docs', 'gallery', 'creature_anims.webp'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
