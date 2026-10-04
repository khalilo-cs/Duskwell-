// The score: every track the game can ask for exists, and the new dark pieces (the merchant's waltz, the forge, the wizard, the road, the menu piece)
// are played where they belong and give way to a boss.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const dir = path.join(__dirname, '..', 'audio', 'music'), meta = JSON.parse(fs.readFileSync(path.join(dir, 'music.json'), 'utf8'));
  const fresh = ['fiddler', 'forge', 'wizard', 'road', 'rest'];
  ok('the five new pieces are rendered, with a loop length and a gain', fresh.every(n => fs.existsSync(path.join(dir, n + '.mp3')) && meta[n] && meta[n].loop > 30 && meta[n].gain > 0.3 && meta[n].gain <= 1), fresh.map(n => meta[n]));
  ok('there are twenty-six pieces now', Object.keys(meta).length === 26 && Object.keys(meta).every(n => fs.existsSync(path.join(dir, n + '.mp3'))), Object.keys(meta).length);
  const { browser, page, errors } = await open({});
  const ev = (f, a) => page.evaluate(f, a);
  // every room asks for a track that exists
  let r = await ev(() => {
    const out = {};
    for (const id of WORLD.order) { const d = WORLD.rooms[id]; Sound.setTheme(d.bg === 'townb' ? 'road' : d.theme); Sound.setMood(null); out[Sound.track()] = (out[Sound.track()] || 0) + 1; }
    return out;
  });
  ok('every room asks for a piece that exists', Object.keys(r).every(n => meta[n]), r);
  r = await ev(() => { DW.enterRoom('tw1', { pos: { x: 100, y: 100 } }); return Sound.track(); });
  ok('the roads between the village and the caves have their own piece', r === 'road', r);
  r = await ev(() => { DW.enterRoom('town', { pos: { x: 100, y: 100 } }); return Sound.track(); });
  ok('the village keeps its theme', r === 'hushvale', r);
  // shops and menus
  r = await ev(() => {
    const { G } = DW, out = {}; G.state = 'play'; G.trans = null;
    for (const [id, st] of [['general', 'shop'], ['wizard', 'shop'], ['smith', 'shop'], ['outfitter', 'shop'], ['frost', 'shop']]) { G.shopId = id; G.state = st; DW.step(1); out[id] = Sound.track(); }
    G.shopId = 'wizard'; G.dialog = { lines: ['x'], i: 0, t: 0, shop: true }; G.state = 'dialog'; DW.step(1); out.wizardDialog = Sound.track();
    G.dialog = { lines: ['x'], i: 0, t: 0 }; DW.step(1); out.elder = Sound.track();
    for (const st of ['pause', 'map', 'charms', 'gear', 'bestiary']) { G.state = st; DW.step(1); out[st] = Sound.track(); }
    G.dialog = null; G.state = 'play'; DW.step(1); out.back = Sound.track();
    return out;
  });
  ok('a merchant plays his waltz, the smith and the outfitter the forge, the wizard his own piece', r.general === 'fiddler' && r.frost === 'fiddler' && r.smith === 'forge' && r.outfitter === 'forge' && r.wizard === 'wizard' && r.wizardDialog === 'wizard', r);
  ok('the menus play the quiet piece', ['pause', 'map', 'charms', 'gear', 'bestiary'].every(k => r[k] === 'rest'), r);
  ok('talking to the elder keeps the area\'s theme, and leaving a menu brings it back', r.elder === r.back && r.back !== 'rest' && r.back !== 'fiddler', r);
  // a boss takes the music from a shop-less moment, and a mood does not outlast it
  r = await ev(() => { Sound.boss(true, 'guardian'); const a = Sound.track(); Sound.setMood('rest'); const b = Sound.track(); Sound.boss(false); Sound.setMood(null); return { a, b }; });
  ok('a boss fight keeps its own track whatever the mood', r.a === 'boss' && r.b === 'boss', r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
