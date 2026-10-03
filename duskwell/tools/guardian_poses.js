// Draws the Stone Guardian in every pose (docs/gallery/guardian_poses.webp). usage: node tools/guardian_poses.js [out file]
const { open } = require('../tests/lib');
const fs=require('fs');
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => GuardianArt.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(() => {
    const P = (n, s, t, d, o) => Object.assign({ actName: n, actStage: s, actT: t, actDur: d }, o || {});
    const poses = [['stand', {}], ['slam: wind-up', P('slam', 'wind', 0.35, 0.75)], ['slam: hammer high', P('slam', 'wind', 0.72, 0.75)], ['slam: impact', P('slam', 'hit', 0.1, 0.9)], ['slam: recover', P('slam', 'hit', 0.75, 0.9)],
      ['leap: crouch', P('leap', 'wind', 0.45, 0.5)], ['leap: rising', P('leap', 'air', 0.1, 0, { onGround: false, vy: -500 })], ['leap: falling', P('leap', 'air', 0.5, 0, { onGround: false, vy: 400 })], ['leap: landing', P('leap', 'land', 0.04, 0.55)],
      ['charge: dig in', P('charge', 'wind', 0.5, 0.55)], ['charge: run', P('charge', 'run', 0.3, 0, { vx: 480 })], ['charge: crash', P('charge', 'crash', 0.3, 1.1, { stunned: true })], ['dazed', P('charge', 'crash', 0.9, 1.1, { stunned: true })],
      ['roar (phase change)', P('roar', '', 0.6, 1.25)], ['phase 2', { phase: 2 }], ['hit flash', { flash: 1 }], ['dying', { state: 'dying', dyingT: 1.4 }]];
    const cw = 400, ch = 330, cols = 4, rows = Math.ceil(poses.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    poses.forEach(([name, o], i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      g.fillStyle = '#2a3248'; g.fillRect(x0 + 2, y0 + ch - 40, cw - 4, 38);
      const e = Art.creatureDummy('guardian', true);
      e._rig = null; Object.assign(e, { isDummy: false, tele: 0, melee: null, stunned: false, last: '', onGround: true, vx: 0, vy: 0, phase: 1, flash: 0, state: 'fight', actName: '', actStage: '', actT: 0, actDur: 0, dyingT: 0 }, o);
      g.save(); g.translate(x0 + cw / 2, y0 + ch - 40); g.scale(1.3, 1.3); e.x = -e.w / 2; e.y = -e.h; e.face = 1;
      Art.boss.guardian(g, e, 1.3 + i * 0.4);
      g.restore();
      g.fillStyle = '#d6e0f4'; g.font = '700 14px sans-serif'; g.fillText(name, x0 + 8, y0 + 18);
    });
    Object.assign(Art.creatureDummy('guardian', true), { tele: 0, melee: null, stunned: false, last: '', phase: 1, flash: 0, state: 'fight', actName: '', actStage: '', actT: 0, actDur: 0, dyingT: 0, _rig: null });
    return c.toDataURL('image/webp', 0.9);
  });
  fs.writeFileSync(process.argv[2] || require('path').join(__dirname, '..', 'docs', 'gallery', 'guardian_poses.webp'), Buffer.from(url.split(',')[1], 'base64'));
  console.log(errors.join('|') || 'no page errors'); await browser.close(); process.exit(0);
})();
