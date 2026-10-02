// Shared helper for the browser bot tests. Needs Playwright (npm i playwright) and Chromium.
// Usage: node duskwell/tests/charms.test.js        (DW_ROOT overrides the folder that is opened)
// open({ http: true, gfx: 2 }) serves the game over http with the WebGL lighting at a chosen level (0 = classic).
const path = require('path'), os = require('os');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
exports.shot = name => path.join(process.env.SHOT_DIR || os.tmpdir(), name);
exports.open = async function (opts) {
  opts = opts || {};
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  // the logic bots run with the classic 2D lighting (software WebGL is slow); lumen.test.js sets its own level
  await page.addInitScript(g => { try { localStorage.setItem('duskwell_gfx', g); } catch (e) { /* ignore */ } }, opts.gfx != null ? String(opts.gfx) : (process.env.DW_GFX || '0'));
  const errors = [];
  // in manual mode the game draws only on request: take the picture first, then the screenshot
  const shotOf = page.screenshot.bind(page);
  page.screenshot = async o => { await page.evaluate(() => DW.draw()); return shotOf(o); };
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  const root = process.env.DW_ROOT || path.join(__dirname, '..');
  // logic bots open the page from disk (fast; no sound decoding); graphics bots ask for http, where Lumen runs
  if (opts.http || process.env.DW_HTTP) { const srv = await require('./server').start(root); exports.server = srv; await page.goto(srv.url); }
  else await page.goto('file://' + root + '/index.html');
  await page.waitForTimeout(400);
  // manual mode: the test advances the game itself with DW.step(n)
  await page.evaluate(() => { DW.G.manual = true; DW.startGame(false); DW.G.state = 'play'; DW.G.areaBanner = null; DW.G.fadeA = 0; DW.G.trans = null; });
  return { browser, page, errors };
};
