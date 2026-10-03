// Draws every boss (the drawn ones) standing, with the Stone Guardian first: docs/gallery/bosses_drawn.webp. usage: node tools/bosses_poses.js [out]
const fs = require('fs'), path = require('path');
const { open } = require('../tests/lib');
(async () => {
  const out = process.argv[2] || path.join(__dirname, '..', 'docs', 'gallery', 'bosses_drawn.webp');
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => BossPoses.ready() && GuardianArt.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const keys = ['guardian', 'spore', 'weaver', 'drowned', 'brood', 'queen', 'colossus', 'thunderhoof', 'roc', 'regent', 'wraith', 'duelist', 'twin', 'bonewright', 'marrow', 'stargazer', 'king'];
    const cw = 400, ch = 360, cols = 4, rows = Math.ceil(keys.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    keys.forEach((k, i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      g.fillStyle = '#2a3248'; g.fillRect(x0 + 2, y0 + ch - 40, cw - 4, 38);
      const e = Art.creatureDummy(k, true); e._pr = null; e._rig = null; e.face = 1; e.flash = 0; e.tele = 0; e.stunned = false; e.melee = null; e.isDummy = false; e.state = 'fight'; e.vx = 0; e.vy = 0; e.onGround = true;
      const fly = FLYING.has(k), s = Math.min(1.25, 250 / (e.h * 2.3));
      g.save(); g.translate(x0 + cw / 2, y0 + ch - 40 - (fly ? e.h * 1.1 * s : 0)); g.scale(s, s); e.x = -e.w / 2; e.y = fly ? -e.h / 2 : -e.h;
      Art.boss[k](g, e, 1.3 + i * 0.4); g.restore();
      g.fillStyle = '#d6e0f4'; g.font = '700 14px sans-serif'; g.fillText(k + (fly ? ' (flies)' : ''), x0 + 8, y0 + 18);
    });
    return c.toDataURL('image/webp', 0.9);
  });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('written', out, errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
