// Paints every area's background layers with painter.js in headless Chromium and writes
// art/bg/<area>/{sky,l0,l1,l2}.webp. Usage: node paint.js [area ...]   (needs Playwright)
const fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const OUT = path.join(__dirname, '..', '..', 'art', 'bg');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => { console.error(e); process.exitCode = 1; });
  await page.setContent('<!doctype html><body></body>');
  await page.addScriptTag({ path: path.join(__dirname, 'painter.js') });
  const names = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => THEME_NAMES);
  for (const name of names) {
    const t0 = Date.now();
    const r = await page.evaluate(n => paintTheme(n), name);
    fs.mkdirSync(path.join(OUT, name), { recursive: true });
    let kb = 0;
    for (const k of ['sky', 'l0', 'l1', 'l2']) {
      const buf = Buffer.from(r[k].split(',')[1], 'base64');
      fs.writeFileSync(path.join(OUT, name, k + '.webp'), buf); kb += buf.length / 1024;
    }
    console.log(name.padEnd(9), r.w + 'x' + r.h, Math.round(kb) + ' KB', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  }
  await browser.close();
})();
