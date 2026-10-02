// Shared helper for the browser bot tests. Needs Playwright (npm i playwright) and Chromium.
// Usage: node duskwell/tests/charms.test.js        (DW_ROOT overrides the folder that is opened)
const path = require('path'), os = require('os');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
exports.shot = name => path.join(process.env.SHOT_DIR || os.tmpdir(), name);
exports.open = async function () {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto('file://' + (process.env.DW_ROOT || path.join(__dirname, '..')) + '/index.html');
  await page.waitForTimeout(400);
  // manual mode: the test advances the game itself with DW.step(n)
  await page.evaluate(() => { DW.G.manual = true; DW.startGame(false); DW.G.state = 'play'; DW.G.areaBanner = null; DW.G.fadeA = 0; DW.G.trans = null; });
  return { browser, page, errors };
};
