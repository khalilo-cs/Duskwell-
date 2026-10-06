// The score: every track the game can ask for exists, the dark pieces (the merchant's waltz, the forge, the wizard, the road, the menu piece) and
// the five newest (the title, the crossroads, the webbed depths and two battle themes) are played where they belong, and a boss takes the music.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const dir = path.join(__dirname, '..', 'audio', 'music'), meta = JSON.parse(fs.readFileSync(path.join(dir, 'music.json'), 'utf8'));
  const fresh = ['fiddler', 'forge', 'wizard', 'road', 'rest'];
  const newest = ['legend', 'adventure', 'abyss', 'boss_abyss', 'boss_march'];
  ok('the five newest pieces are rendered, with a loop, a gain, a tempo, a bar length and a key', newest.every(n => fs.existsSync(path.join(dir, n + '.mp3')) && meta[n] && meta[n].loop > 40 && meta[n].gain > 0.3 && meta[n].gain <= 1 && meta[n].bpm >= 40 && meta[n].bpm <= 200 && [3, 4].includes(meta[n].bpb) && meta[n].tonic >= 0 && meta[n].tonic < 12), newest.map(n => meta[n]));
  ok('every piece knows its tempo and key (the combat pulse and the Jukebox read them)', Object.values(meta).every(m => m.bpm > 0 && m.bpb > 0 && m.tonic >= 0), Object.entries(meta).filter(([, m]) => !(m.bpm > 0 && m.bpb > 0 && m.tonic >= 0)).map(e => e[0]));
  ok('the five new pieces are rendered, with a loop length and a gain', fresh.every(n => fs.existsSync(path.join(dir, n + '.mp3')) && meta[n] && meta[n].loop > 30 && meta[n].gain > 0.3 && meta[n].gain <= 1), fresh.map(n => meta[n]));
  ok('there are thirty-one pieces now', Object.keys(meta).length === 31 && Object.keys(meta).every(n => fs.existsSync(path.join(dir, n + '.mp3'))), Object.keys(meta).length);
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
  ok('a boss fight keeps its own track whatever the mood', r.a === 'boss_march' && r.b === 'boss_march', r);
  // the title, the crossroads and the webbed depths have new pieces; every guardian fights to a theme that exists
  r = await ev(() => { const out = {}; for (const th of ['title', 'cave', 'webbed']) { Sound.setTheme(th); Sound.setMood(null); out[th] = Sound.track(); } return out; });
  ok('the title plays the Legend, the crossroads the Roads, the webbed depths the Abyss', r.title === 'legend' && r.cave === 'adventure' && r.webbed === 'abyss', r);
  r = await ev(() => {
    const out = {}; for (const id of WORLD.order) { const d = WORLD.rooms[id]; if (d.arena) { Sound.boss(true, d.arena.boss); out[d.arena.boss] = Sound.track(); } }
    Sound.boss(true); out.none = Sound.track(); Sound.boss(false); Sound.setMood(null); return out;
  });
  const want = { guardian: 'boss_march', duelist: 'boss_march', twin: 'boss_march', thunderhoof: 'boss_march', roc: 'boss_march', brood: 'boss_abyss', weaver: 'boss_abyss', drowned: 'boss_abyss', wraith: 'boss_abyss', colossus: 'boss_abyss', queen: 'boss_abyss', bonewright: 'boss_bone', marrow: 'boss_bone', stargazer: 'boss_moon', regent: 'boss_moon', king: 'king', spore: 'boss', none: 'boss' };
  ok('every guardian fights to its own theme (the rest to the common one), and each theme exists', Object.entries(want).every(([k, v]) => r[k] === v && meta[v]), r);
  // the Jukebox plays what it is told, and menus give way to it
  r = await ev(() => { const { G } = DW; G.state = 'jukebox'; G.jukePlay = 'abyss'; DW.step(1); const a = Sound.track(); G.jukePlay = null; DW.step(1); const b = Sound.track(); G.state = 'play'; G.jukePlay = null; DW.step(1); return { a, b }; });
  ok('the Jukebox plays the chosen piece, and the quiet piece when none is chosen', r.a === 'abyss' && r.b === 'rest', r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
