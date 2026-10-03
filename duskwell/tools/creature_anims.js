// Every frame of the creatures drawn frame by frame, as the game draws them (docs/gallery/creature_anims.webp).
// usage: node tools/creature_anims.js [out file]
const { open } = require('../tests/lib');
const fs = require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => AnimArt.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const kinds = ['husk', 'crawler', 'flyer', 'hopper', 'spider', 'warden'], parts = ['idle', 'walk', 'atk', 'hurt', 'death'];
    const NAMES = { husk: 'Husk', crawler: 'Crawler', flyer: 'Flyer', hopper: 'Hopper', spider: 'Spider', warden: 'Shield Warden' };
    const sc = 0.62, cw = 82, rh = 112, lab = 120;
    const cols = Math.max(...kinds.map(k => parts.reduce((n, p) => n + (p === 'walk' && k === 'flyer' ? 0 : CREATURE_ANIMS[k][p].length), 0)));
    const c = document.createElement('canvas'); c.width = lab + cols * cw + 40; c.height = kinds.length * rh + 30;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    const COL = { idle: '#3a4766', walk: '#35574a', atk: '#6a3a3a', hurt: '#6a5a2a', death: '#4a3a5a' };
    kinds.forEach((k, r) => {
      const y0 = 26 + r * rh, gy = y0 + rh - 14; let x = lab;
      g.fillStyle = '#d6e0f4'; g.font = '700 15px sans-serif'; g.fillText(NAMES[k], 10, y0 + rh / 2);
      for (const p of parts) {
        if (p === 'walk' && k === 'flyer') continue;                                       // the flyer's walk is its wing beat
        const n = CREATURE_ANIMS[k][p].length;
        g.fillStyle = COL[p]; g.fillRect(x + 2, gy, n * cw - 4, 4);
        for (let i = 0; i < n; i++) { AnimArt.drawFrame(g, k, p, i, x + cw / 2 + i * cw, gy, sc, 1); }
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
