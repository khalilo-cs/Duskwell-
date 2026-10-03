// Draws the sheets of the gallery (docs/gallery/*.webp): every creature, every boss, the people of the shops, the hero in every cloak,
// and the icons of the weapons, cloaks and nail arts. Everything is drawn by the game's own art code in a headless Chromium.
// usage: node tools/gallery.js [out dir]      (needs Playwright; default out dir: docs/gallery)
const fs = require('fs'), path = require('path');
const { open } = require('../tests/lib');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'gallery');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => FrameArt.ready() && Puppet.ready(), null, { timeout: 8000 });
  await page.waitForTimeout(600);
  const save = (name, url) => { fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64')); console.log('written', name); };
  const sheet = (name, body, args) => page.evaluate(body, args).then(url => save(name, url));
  // creatures: ordinary ones four a row, bosses three a row
  const kinds = await page.evaluate(() => ({ e: BESTIARY.filter(b => !b.boss).map(b => b.k), b: BESTIARY.filter(b => b.boss).map(b => b.k) }));
  const chunk = (a, n) => a.reduce((o, x, i) => (i % n ? o[o.length - 1].push(x) : o.push([x]), o), []);
  const drawCreatures = ([list, boss, cols]) => {
    const cw = boss ? 440 : 300, ch = boss ? 400 : 300, rows = Math.ceil(list.length / cols), c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#0c0f18'; g.fillRect(0, 0, c.width, c.height);
    list.forEach((k, i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      const gr = g.createLinearGradient(0, y0, 0, y0 + ch); gr.addColorStop(0, '#1b2233'); gr.addColorStop(1, '#2a3248'); g.fillStyle = gr; g.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + 3, y0 + ch - 56, cw - 6, 53);
      const dm = Art.creatureDummy(k, boss), w = dm ? dm.w : 40, h = dm ? dm.h : 40, fly = FLYING.has(k);
      const s = Math.max(1.2, Math.min((cw - 60) / (w * (boss ? 1.5 : 2.3)), (ch - 90) / (h * (boss ? 1.55 : 2)), boss ? 3.2 : 5));
      g.save(); g.translate(x0 + cw / 2, y0 + ch - 56);
      Art.drawCreature(g, k, boss, 0, fly ? -(ch - 90) / 2 : 0, s, 1.3 + i * 0.37, { face: 1 });
      g.restore();
      const b = BESTIARY[BESTIARY_INDEX[(boss ? 'b:' : 'e:') + k]];
      g.fillStyle = '#d6e0f4'; g.font = '700 17px sans-serif'; g.fillText(b.en[0], x0 + 12, y0 + 24);
    });
    return c.toDataURL('image/webp', 0.9);
  };
  let n = 1;
  for (const part of chunk(kinds.e, 12)) await sheet('creatures_' + n++ + '.webp', drawCreatures, [part, false, 4]);
  await sheet('bosses_1.webp', drawCreatures, [kinds.b.slice(0, 9), true, 3]);
  await sheet('bosses_2.webp', drawCreatures, [kinds.b.slice(9), true, 3]);
  // the people
  await sheet('people.webp', () => {
    const list = [['elder'], ['merchant'], ['smith'], ['outfitter'], ['trader', 'frost'], ['trader', 'ember'], ['trader', 'storm'], ['trader', 'mirror'], ['trader', 'ossuary'], ['trader', 'lunar']];
    const cols = 5, rows = 2, cw = 360, ch = 380, c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#0c0f18'; g.fillRect(0, 0, c.width, c.height);
    list.forEach((k, i) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      const gr = g.createLinearGradient(0, y0, 0, y0 + ch); gr.addColorStop(0, '#1b2233'); gr.addColorStop(1, '#2a3248'); g.fillStyle = gr; g.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x0 + 3, y0 + ch - 56, cw - 6, 53);
      g.save(); g.translate(x0 + cw / 2 - 20, y0 + ch - 56); g.scale(3.4, 3.4); Art.drawNPC(g, { type: k[0], shop: k[1], px: 0, py: 0 }, 1.3 + i * 0.4); g.restore();
      g.fillStyle = '#d6e0f4'; g.font = '700 17px sans-serif'; g.fillText(k.join(' · '), x0 + 12, y0 + 24);
    });
    return c.toDataURL('image/webp', 0.9);
  });
  // the hero: every cloak (inked look), every weapon carried, and the icons of all the gear
  await sheet('hero_and_gear.webp', () => {
    const cl = Object.keys(Gear.CLOAKS), ws = Object.keys(Gear.WEAPONS);
    const cw = 230, ch = 300, cols = 8, rows = 4, c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch;
    const g = c.getContext('2d'); g.fillStyle = '#0c0f18'; g.fillRect(0, 0, c.width, c.height);
    const cell = (i, label, fn) => {
      const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * ch;
      const gr = g.createLinearGradient(0, y0, 0, y0 + ch); gr.addColorStop(0, '#1b2233'); gr.addColorStop(1, '#2a3248'); g.fillStyle = gr; g.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
      g.save(); g.translate(x0 + cw / 2, y0 + ch - 40); fn(); g.restore();
      g.fillStyle = '#d6e0f4'; g.font = '700 15px sans-serif'; g.fillText(label, x0 + 10, y0 + 22);
    };
    const hero = sc => wanderer(g, 0, 0, 1, { t: 1.3, vx: 0, vy: 0, scale: sc }, 1, null);
    cl.forEach((id, i) => { Gear.reset(); Gear.give('cloak', id); Gear.equip('cloak', id); cell(i, Gear.CLOAKS[id].en, () => hero(3.4)); });
    ws.forEach((id, i) => { Gear.reset(); Gear.give('weapon', id); Gear.equip('weapon', id); cell(8 + i, Gear.WEAPONS[id].en, () => { g.translate(-10, -120); g.scale(2.6, 2.6); Art.drawWeapon(g, id, -20, 30, -0.9, 40, 1.3 + i); }); });
    ws.forEach((id, i) => { Gear.reset(); Gear.give('weapon', id); Gear.equip('weapon', id); cell(16 + i, Gear.WEAPONS[id].en + ' (carried)', () => hero(3.4)); });
    Gear.reset();
    cl.forEach((id, i) => cell(24 + i, 'cloak icon', () => { g.translate(0, -110); Art.cloakIcon(g, id, 0, 0, 64, 1.3); }));
    Gear.reset();
    return c.toDataURL('image/webp', 0.9);
  });
  console.log(errors.join('|') || 'no page errors');
  await browser.close(); process.exit(0);
})();
