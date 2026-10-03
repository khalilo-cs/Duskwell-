// Draws the Stone Guardian in every pose (docs/gallery/guardian_poses.webp). usage: node tools/guardian_poses.js [out file]
const { open } = require('../tests/lib');
const fs=require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => GuardianArt.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const poses = [['idle', {}], ['walk', { vx: 300 }], ['slam tele', { tele: 1, last: 'slam' }], ['slam hit', { melee: { t: 0.1 } }], ['leap tele', { tele: 1, last: 'leap' }], ['air up', { onGround: false, vy: -300 }], ['air down', { onGround: false, vy: 300 }], ['charge tele', { tele: 1, last: 'charge' }], ['stunned', { stunned: true }], ['phase 2', { phase: 2 }], ['flash', { flash: 1 }], ['dying', { state: 'dying' }]];
    const cw = 420, ch = 330, cols = 3, rows = Math.ceil(poses.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    poses.forEach(([name, o], i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      g.fillStyle = '#2a3248'; g.fillRect(x0 + 2, y0 + ch - 40, cw - 4, 38);
      const e = Art.creatureDummy('guardian', true);
      Object.assign(e, { isDummy: false, tele: 0, melee: null, stunned: false, last: '', onGround: true, vx: 0, vy: 0, phase: 1, flash: 0, state: 'fight' }, o);
      g.save(); g.translate(x0 + cw / 2, y0 + ch - 40); g.scale(1.75, 1.75); e.x = -e.w / 2; e.y = -e.h; e.face = 1;
      Art.boss.guardian(g, e, 1.3 + i * 0.4);
      g.restore();
      g.fillStyle = '#d6e0f4'; g.font = '700 14px sans-serif'; g.fillText(name, x0 + 8, y0 + 18);
    });
    Object.assign(Art.creatureDummy('guardian', true), { tele: 0, melee: null, stunned: false, last: '', phase: 1, flash: 0, state: 'fight' });
    return c.toDataURL('image/webp', 0.9);
  });
  fs.writeFileSync(process.argv[2] || require('path').join(__dirname, '..', 'docs', 'gallery', 'guardian_poses.webp'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
