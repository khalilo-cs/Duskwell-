// Teaching the moves inside the game: the banner that plays the effect and says the keys, the tip that stays until the move is done once,
// the flags that keep it (and keep old saves quiet), the badges, the keys on a phone, and the training post in the village.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 15000 });
  const town = () => ev(() => { const { G, P } = DW; DW.enterRoom('town', { pos: { x: 200, y: 300 } }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.dialog = null; G.banner = null; G.toast = null; P.invuln = 99; for (const k of Object.keys(G.flags)) if (/^mv/.test(k)) delete G.flags[k]; G.coach = null; DW.step(5); });
  await town();
  // ---- learning an art at the smith
  let r = await ev(() => { const { G, P } = DW; P.geo = 5000; Gear.reset(); buyItem(SHOPS.smith.items.find(i => i.gear[1] === 'rend')); return { state: G.state, move: G.banner && G.banner.move, flags: { n: !!G.flags.mvnew_rend, d: !!G.flags.mvdid_rend }, coach: G.coach && G.coach.id, hasArt: Gear.hasArt('rend') }; });
  ok('buying Moon Rend opens a banner for the move and starts the coach', r.state === 'banner' && r.move === 'rend' && r.flags.n && !r.flags.d && r.coach === 'rend' && r.hasArt, r);
  r = await ev(() => { const out = []; for (const lang of ['ar', 'en']) for (const t of [0, 0.3, 2]) { setLang(lang); DW.G.banner.t = t; DW.G.state = 'banner'; try { DW.draw(); } catch (e) { out.push(lang + t + ':' + e.message); } } setLang('ar'); return out; });
  ok('the banner draws with the effect playing, in both languages', r.length === 0, r);
  await ev(() => { DW.G.banner.t = 2; DW.G.state = 'banner'; }); await page.screenshot({ path: shot('coach_banner.png') });
  // ---- the tip: 14 seconds, then back for 7 seconds in each of the next four rooms
  await ev(() => { DW.G.banner = null; DW.G.state = 'play'; DW.step(2); });
  r = await ev(() => { const c = DW.G.coach; return { id: c.id, left: c.left }; });
  ok('the tip is up, with about 14 seconds to go', r.id === 'rend' && r.left > 13 && r.left <= 14, r);
  r = await ev(() => { const out = []; for (const lang of ['ar', 'en']) { setLang(lang); try { DW.draw(); } catch (e) { out.push(e.message); } } setLang('ar'); return out; });
  ok('the tip draws in both languages', r.length === 0, r);
  await page.screenshot({ path: shot('coach_tip.png') });
  r = await ev(() => { DW.step(60 * 15); return DW.G.coach.left; });
  ok('after 14 seconds the tip goes away', r <= 0, r);
  r = await ev(() => { const out = []; for (const room of ['cx1', 'town', 'cx1', 'town', 'cx1', 'town']) { DW.enterRoom(room, { pos: { x: 100, y: 100 } }); const G = DW.G; G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; DW.step(2); out.push(Math.round(G.coach.left)); DW.step(60 * 8); } return out; });
  ok('it comes back for 7 seconds in each of the next four rooms, and then stays away', r.slice(0, 4).every(v => v >= 6 && v <= 7) && r[4] <= 0 && r[5] <= 0, r);
  // ---- doing the move ends it
  await town();
  const done = async (id, setup, fire) => ev(([id, setup, fire]) => {
    const { G, P } = DW; Coach.learned(id); G.toast = null; P.ab.dash = true; P.ab.dive = true; P.ab.superdash = true; Gear.give('art', 'rend'); Gear.give('art', 'rush'); Gear.give('art', 'nova'); P.soul = P.maxSoul; P.dashT = 0; P.rushCD = 0; P.novaT = 0;
    new Function('P', 'G', setup)(P, G); const before = { c: G.coach && G.coach.id, n: !!G.flags['mvnew_' + id] };
    new Function('P', 'G', fire)(P, G);
    return { before, did: !!G.flags['mvdid_' + id], coach: G.coach, toast: G.toast && G.toast.text };
  }, [id, setup, fire]);
  const cases = [['rend', '', 'P.rend();'], ['rush', 'P.face = 1;', 'P.startRush();'], ['nova', '', 'P.startNova();'], ['dive', 'P.onGround = false;', 'P.startDive();'],
    ['comet', 'P.x = 300; P.y = 18 * 32 - P.h - 1; P.vy = 0; DW.step(3); P.sd = { state: "charge", t: 9, wall: 0, ready: true, hits: new Set() };', 'P.updateSuperdash(0.016);']];
  for (const [id, setup, fire] of cases) {
    await town(); r = await done(id, setup, fire);
    ok(id + ': doing it once marks it done, ends the tip and says well done', r.before.c === id && r.did && r.coach === null && /أحسنت/.test(r.toast || ''), r);
  }
  r = await ev(() => { const { G } = DW; const before = G.toast && G.toast.text; return { again: Coach.did('rend'), toast: G.toast && G.toast.text, pending: Coach.pending() }; });
  ok('doing it again says nothing more', r.again === false && r.pending === null, r);
  // ---- an old save is not reminded of what it already knows
  await town();
  r = await ev(() => { const { G, P } = DW; Gear.give('art', 'rend'); P.ab.dive = true; DW.step(3); return { coach: G.coach, pending: Coach.pending(), unseen: Coach.unseen().length, did: Coach.did('rend') }; });
  ok('a move known without being learned from now on has no tip, no badge and no well-done', r.coach === null && r.pending === null && r.unseen === 0 && r.did === false, r);
  // ---- the flags are saved with the game
  await town();
  r = await ev(() => { const { G } = DW; Coach.learned('nova'); saveGame(); const s = readSave(); return { saved: !!(s && s.flags && s.flags.mvnew_nova) }; });
  ok('the flags go into the save', r.saved, r);
  // ---- abilities of the world that are moves: the dive and the comet
  await town();
  r = await ev(() => { const { G, P } = DW; P.ab.dive = false; P.ab.superdash = false; const out = {}; for (const ab of ['dive', 'superdash']) { G.collectItem({ def: { id: 'ability_' + ab + '_t', kind: 'ability', ability: ab }, x: 100, y: 100, dead: false }); out[ab] = { move: G.banner && G.banner.move, flag: !!G.flags['mvnew_' + MOVE_OF_ABILITY[ab]], has: !!P.ab[ab] }; } return out; });
  ok('finding the dive and the comet banners them as moves and starts the coach', r.dive.move === 'dive' && r.dive.flag && r.dive.has && r.superdash.move === 'comet' && r.superdash.flag && r.superdash.has, r);
  // ---- badges
  await town();
  r = await ev(() => { Coach.learned('rend'); Gear.give('art', 'rend'); const a = pauseItems().find(i => i.id === 'moves').label; DW.G.state = 'moves'; DW.G.moveSel = 0; DW.step(2); const b = pauseItems().find(i => i.id === 'moves').label; DW.G.state = 'play'; return { a, b }; });
  ok('the pause menu marks Moves while a new move is not looked at, and the mark goes when it is', /●/.test(r.a) && !/●/.test(r.b), r);
  // ---- on a phone the keys are the buttons
  r = await ev(() => { const m = moveOf('rend'), kb = moveKeys(m); const old = window.matchMedia; window.matchMedia = q => ({ matches: /coarse/.test(q) }); const tc = moveKeys(m), all = MOVES.every(q => q.touch && q.touch.length === 2 && moveKeys(q).length > 8); window.matchMedia = old; return { kb, tc, all }; });
  ok('on a touch screen the keys read as buttons', /X/.test(r.kb) && !/X/.test(r.tc) && /زر/.test(r.tc) && r.all, r);
  // ---- the training post
  await town();
  r = await ev(() => { const { G, P } = DW; const d = G.enemies.find(e => e.dummy); const rooms = WORLD.order.filter(id => WORLD.rooms[id].enemies.some(e => e.type === 'dummy')); return { here: !!d, rooms, onFloor: d && WORLD.rooms.town.t[(Math.floor((d.y + d.h) / 32)) * 64 + Math.floor(d.cx / 32)] === T_SOLID, kind: d && d.kind }; });
  ok('there is one training post, in the village, standing on the floor', r.here && r.rooms.join() === 'town' && r.onFloor && r.kind === 'dummy', r);
  r = await ev(() => {
    const { G, P } = DW; const d = G.enemies.find(e => e.dummy); P.soul = 0; const geo0 = P.geo, hp0 = P.hp;
    d.hurt(10, 1, 'side'); d.hurt(14, 1, 'spell'); d.hurt(1e12, -1, 'side');
    const a = { dead: d.dead, hpHuge: d.hp > 1e8, count: d.count, last: d.last > 1e9, nums: d.nums.length, soul: P.soul, geo: P.geo - geo0, mind: G.mind && G.mind.dummy, seen: !!G.seen['e:dummy'], bestiary: BESTIARY_INDEX['e:dummy'] };
    DW.step(60 * 3); a.reset = { total: d.total, count: d.count, nums: d.nums.length }; return a;
  });
  ok('the post takes blows (even a huge one) and does not fall, give soul or geo, nor go into the bestiary or the creatures\' memory', !r.dead && r.hpHuge && r.count === 3 && r.nums === 3 && r.soul === 0 && r.geo === 0 && !r.mind && !r.seen && r.bestiary === undefined, r);
  ok('the numbers fade and the run of blows resets after a short rest', r.reset.total === 0 && r.reset.count === 0 && r.reset.nums === 0, r.reset);
  // really hit it with the nail, and with the rush
  r = await ev(() => { const { G, P } = DW; const d = G.enemies.find(e => e.dummy); P.x = d.x - 60; P.y = d.y + d.h - P.h - 2; P.vx = 0; P.vy = 0; P.face = 1; P.soul = 0; P.atkBuf = 0.12; DW.step(2); P.atkBuf = 0.12; DW.step(14); return { count: d.count, soul: P.soul }; });
  ok('a swing of the nail lands on it and gathers no soul', r.count >= 1 && r.soul === 0, r);
  r = await ev(() => { const { G, P } = DW; const d = G.enemies.find(e => e.dummy); DW.step(200); const c0 = d.count; Gear.give('art', 'rush'); P.ab.dash = true; P.x = d.x - 90; P.y = d.y + d.h - P.h - 2; P.face = 1; P.soul = 0; P.dashT = 0.3; P.rushCD = 0; P.startRush(); DW.step(25); return { hits: d.count - c0, soul: P.soul }; });
  ok('the rush cuts it several times and gathers no soul', r.hits >= 2 && r.soul === 0, r);
  r = await ev(() => { const { G, P } = DW; const d = G.enemies.find(e => e.dummy); P.invuln = 0; P.hurtT = 0; P.hp = P.maxHp; P.x = d.x + 2; P.y = d.y + d.h - P.h - 2; P.vx = 0; DW.step(90); return { hp: P.hp, max: P.maxHp }; });
  ok('standing in it costs no mask', r.hp === r.max, r);
  r = await ev(() => { const { G, P } = DW; const d = G.enemies.find(e => e.dummy); const out = []; P.x = d.x - 120; for (const lang of ['ar', 'en']) { setLang(lang); d.hurt(12, 1, 'side'); try { DW.draw(); } catch (e) { out.push(e.message); } } setLang('ar'); return out; });
  ok('the post draws, with its numbers, in both languages', r.length === 0, r);
  await ev(() => { const { G, P } = DW; const d = G.enemies.find(e => e.dummy); d.hurt(21, 1, 'side'); d.hurt(17, 1, 'side'); d.hurt(30, 1, 'side'); DW.step(5); }); await page.screenshot({ path: shot('coach_dummy.png') });
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
