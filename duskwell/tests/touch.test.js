// The touch controls: the direction cross follows the thumb (sliding changes direction at once, the centre is
// dead, a diagonal gives two directions), the face buttons hold their own presses, and no button shows a letter.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/node-tools/node_modules/playwright'); } })();
const path = require('path');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.setItem('duskwell_gfx', '0'); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForTimeout(500);
  await page.evaluate(() => { DW.G.manual = true; DW.startGame(false); DW.G.state = 'play'; DW.G.areaBanner = null; DW.G.fadeA = 0; DW.G.trans = null; });
  const down = () => page.evaluate(() => ['left', 'right', 'up', 'down'].filter(a => DW.Input.down(a)).join());
  const box = await page.evaluate(() => { const r = document.querySelector('.dpad').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });
  ok('the direction cross is shown', box.w > 100 && box.h > 100, box);
  // press left of the centre, slide to the right, then up, then let go
  await page.mouse.move(box.x - 45, box.y); await page.mouse.down();
  ok('pressing left of the centre holds left', (await down()) === 'left', await down());
  await page.mouse.move(box.x, box.y, { steps: 4 });
  ok('the centre holds nothing', (await down()) === '', await down());
  await page.mouse.move(box.x + 45, box.y, { steps: 4 });
  ok('sliding across to the right changes the direction at once', (await down()) === 'right', await down());
  await page.mouse.move(box.x + 40, box.y - 40, { steps: 3 });
  ok('a diagonal holds two directions', (await down()).split(',').sort().join() === 'right,up', await down());
  await page.mouse.move(box.x, box.y + 50, { steps: 3 });
  ok('below the centre holds down', (await down()) === 'down', await down());
  await page.mouse.up();
  ok('letting go releases everything', (await down()) === '', await down());
  // the buttons carry drawings, not letters
  const letters = await page.evaluate(() => Array.from(document.querySelectorAll('#touch .b')).map(b => b.textContent.trim()).filter(Boolean));
  ok('no touch button has a letter on it', letters.length === 0, letters);
  const glyphs = await page.evaluate(() => Array.from(document.querySelectorAll('#touch .b')).filter(b => b.querySelector('svg use')).length);
  ok('every touch button shows a drawing', glyphs === 11, glyphs);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
