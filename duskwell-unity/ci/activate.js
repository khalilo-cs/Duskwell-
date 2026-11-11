// Tries to turn Unity's activation request (.alf) into a licence file (.ulf) on Unity's manual-activation page, signed in with
// the account in UNITY_EMAIL / UNITY_PASSWORD. It prints where it is at each step (never the account or the licence).
const puppeteer = require('puppeteer-core'), fs = require('fs'), path = require('path');
(async () => {
  const alf = process.argv[2], out = path.resolve(process.argv[3]);
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage(); page.setDefaultTimeout(40000);
  const cdp = await page.createCDPSession(); await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: out });
  const where = async s => { let t = ''; try { t = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').replace(/\S+@\S+/g, '[mail]').slice(0, 300)); } catch (e) {} console.log('## ' + s + ' | ' + page.url().split('?')[0] + ' | ' + t); };
  const click = async sel => { await page.waitForSelector(sel); await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), page.click(sel)]); };
  try {
    await page.goto('https://license.unity3d.com/manual', { waitUntil: 'networkidle2' }); await where('opened');
    await page.waitForSelector('#conversations_create_session_form_email');
    await page.type('#conversations_create_session_form_email', process.env.UNITY_EMAIL); await page.type('#conversations_create_session_form_password', process.env.UNITY_PASSWORD);
    await click('input[name="commit"]'); await where('signed in');
    const up = await page.waitForSelector('input[type="file"]'); await up.uploadFile(alf);
    await click('input[name="commit"]'); await where('uploaded');
    // the Personal choice is hidden on this page now: it is shown again, then chosen
    await page.evaluate(() => { for (const e of document.querySelectorAll('[style*="display: none"], .hidden, [hidden]')) { e.style.display = 'block'; e.hidden = false; e.classList.remove('hidden'); } });
    await page.waitForSelector('label[for="type_personal"]', { timeout: 15000 }); await page.click('label[for="type_personal"]');
    await page.waitForSelector('label[for="option3"]', { timeout: 15000 }); await page.click('label[for="option3"]');
    await click('.selected input[name="commit"]'); await where('chosen');
    await page.waitForSelector('input[name="commit"]'); await page.click('input[name="commit"]');
    for (let i = 0; i < 30 && !fs.readdirSync(out).some(f => f.endsWith('.ulf')); i++) await new Promise(r => setTimeout(r, 1000));
    const f = fs.readdirSync(out).find(f => f.endsWith('.ulf')); console.log(f ? '## licence file received' : '## no licence file came'); await browser.close(); process.exit(f ? 0 : 1);
  } catch (e) { await where('stopped: ' + String(e.message).split('\n')[0]); await browser.close(); process.exit(1); }
})();
