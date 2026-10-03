// Draws the puppet hero in every pose into one image (docs/gallery/hero2_poses.webp) so the rig can be judged at a glance.
// usage: node tools/puppet_sheet.js [out file] [scale]
const fs = require('fs'), path = require('path');
const { open } = require('../tests/lib');
(async () => {
  const out = process.argv[2] || path.join(__dirname, '..', 'docs', 'gallery', 'hero2_poses.webp'), scale = +process.argv[3] || 2.6;
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => Puppet.ready(), null, { timeout: 8000 });
  const url = await page.evaluate(([scale]) => {
    const poses = [['idle', {}], ['run', { vx: 260 }], ['run fast', { vx: 330 }], ['jump up', { onGround: false, air: true, vy: -500 }], ['fall', { onGround: false, air: true, vy: 500 }],
      ['strike', { atk: 'side', atkPr: 0.5, atkAlt: true }], ['strike 2', { atk: 'side', atkPr: 0.5, atkAlt: false }], ['strike up', { atk: 'up', atkPr: 0.7 }], ['strike down', { atk: 'down', atkPr: 0.7, onGround: false }],
      ['dash', { dash: true, vx: 500 }], ['hurt', { hurt: true }], ['sit', { sitting: true }], ['wall', { wall: true, onGround: false }], ['dive', { dive: true, onGround: false }], ['wail', { wail: true, onGround: false }], ['charge', { charge: 0.9 }], ['land', { land: 0.1 }], ['focus', { focus: true }]];
    const cw = 300, ch = 280, cols = 4, rows = Math.ceil(poses.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#1b2233'; g.fillRect(0, 0, c.width, c.height);
    poses.forEach(([name, o], i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      g.fillStyle = '#2a3248'; g.fillRect(x0 + 2, y0 + ch - 40, cw - 4, 38);
      Puppet.drawAt(g, x0 + cw / 2 - 10, y0 + ch - 40, scale, 1.3 + i * 0.37, o);
      g.fillStyle = '#d6e0f4'; g.font = '700 14px sans-serif'; g.fillText(name, x0 + 8, y0 + 18);
    });
    return c.toDataURL('image/webp', 0.9);
  }, [scale]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('written', out, errors.join('|') || 'no page errors');
  await browser.close(); process.exit(0);
})();
