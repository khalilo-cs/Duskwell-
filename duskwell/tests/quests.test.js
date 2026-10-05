// The side quests of the merchants, traders and wizards: the data makes sense (everybody and everything a quest names is in the world),
// the steps (collect, kill, visit, deliver, boss) count and advance, dialogs offer, remind and hand in, rewards and perks work, the marks
// show over the people and on the map, the log lists them, and they are saved with the game.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 15000 });
  const reset = () => ev(() => { const { G, P } = DW; G.flags = {}; G.visited = {}; Gear.reset(); P.geo = 0; P.invuln = 99; G.dialog = null; G.banner = null; G.toast = null; });
  const go = room => ev(room => { const { G, P } = DW; DW.enterRoom(room, { pos: { x: 100, y: 100 } }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.dialog = null; G.enemies = []; P.invuln = 99; DW.step(3); return G.level.id; }, room);
  // stand beside a person and press Up
  const talk = async (room, type) => { await go(room); await ev(type => { const { G, P } = DW; const n = G.npcs.find(q => q.type === type); P.x = n.px - P.w / 2 - 36; P.y = n.py - P.h - 2; P.vx = 0; P.vy = 0; DW.step(3); }, type); await page.keyboard.press('ArrowUp'); await ev(() => DW.step(3)); return ev(() => { const d = DW.G.dialog; return d ? { lines: d.lines.length, choices: (d.choices || []).map(c => c.label), shop: !!d.shop, text: d.lines.join(' | ') } : null; }); };
  // read every page of the dialog, then pick choice n (Enter picks the chosen one)
  const pick = async n => { await ev(() => { const d = DW.G.dialog; d.i = d.lines.length - 1; d.t = 1; d.sel = 0; DW.step(1); }); for (let i = 0; i < n; i++) { await page.keyboard.press('ArrowRight'); await ev(() => DW.step(2)); } await page.keyboard.press('Enter'); await ev(() => DW.step(3)); };
  await reset();
  // ---- the data
  let r = await ev(() => {
    const out = { n: QUESTS.length, dup: [], noGiver: [], noTarget: [], noText: [], noItem: [], badItem: [], noKind: [], badRoom: [], itemsOnce: {} };
    const seen = new Set(); const has = (room, type) => WORLD.rooms[room] && WORLD.rooms[room].npcs.some(n => n.type === type);
    const strs = o => [o.ar, o.en].flat().every(x => typeof x === 'string' && x.length > 5);
    for (const q of QUESTS) {
      if (seen.has(q.id)) out.dup.push(q.id); seen.add(q.id);
      if (!has(...q.giver)) out.noGiver.push(q.id);
      if (q.end && !has(...q.end)) out.noGiver.push(q.id + ':end');
      if (![q.title, q.offer, q.remind, q.done].every(strs) || !q.reward || !(q.reward.geo > 0)) out.noText.push(q.id);
      for (const sp of q.steps) {
        if (!strs(sp.goal)) out.noText.push(q.id + ':goal');
        if (sp.t === 'deliver') { if (!has(...sp.to)) out.noTarget.push(q.id); if (!strs(sp.say)) out.noText.push(q.id + ':say'); }
        if (sp.t === 'visit') for (const room of sp.rooms) if (!WORLD.rooms[room]) out.badRoom.push(room);
        if (sp.t === 'kill') { if (!Diff.ORDER.includes(sp.area)) out.noKind.push(q.id); else if (sp.kind && !WORLD.order.some(id => WORLD.rooms[id].area === sp.area && WORLD.rooms[id].enemies.some(e => e.type === sp.kind))) out.noKind.push(q.id + ':' + sp.kind); }
        if (sp.t === 'boss' && !SEAL_FLAGS.includes(sp.flag)) out.noKind.push(q.id + ':boss');
        if (sp.t === 'collect') for (const id of sp.ids) {
          let at = []; for (const room of WORLD.order) if (WORLD.rooms[room].items.some(i => i.id === id)) at.push(room);
          out.itemsOnce[id] = at.length; if (at.length !== 1) out.noItem.push(id);
          else { const R = WORLD.rooms[at[0]], it = R.items.find(i => i.id === id), tile = (x, y) => R.t[y * R.w + x]; if (!(tile(it.x, it.y + 1) === T_SOLID && tile(it.x, it.y) === T_AIR && tile(it.x, it.y - 1) === T_AIR)) out.badItem.push(id); }
        }
      }
      if (q.reward.perk && !PERKS[q.reward.perk]) out.noText.push(q.id + ':perk');
    }
    return out;
  });
  ok('thirteen quests, each with texts in both languages, a reward, and a giver who stands in the world', r.n === 13 && r.dup.length === 0 && r.noGiver.length === 0 && r.noText.length === 0, r);
  ok('every person a letter goes to, every room to visit, every kind of creature to kill is in the world', r.noTarget.length === 0 && r.badRoom.length === 0 && r.noKind.length === 0, r);
  ok('every thing to collect lies in exactly one room, on a floor tile with air over it', r.noItem.length === 0 && r.badItem.length === 0, r);
  // ---- marks, offer, accept
  await go('town');
  r = await ev(() => ({ m: Quests.mark('town', 'merchant'), smith: Quests.mark('town', 'smith'), cx3: Quests.mark('cx3', 'wizard'), w6: Quests.mark('lo4', 'wizard'), m2: Quests.isDone('m1') }));
  ok('a gold ! stands over the merchant and the first wizard, and not over a smith or a wizard whose work is not open yet', r.m === '!' && r.smith === null && r.cx3 === '!' && r.w6 === null && !r.m2, r);
  r = await talk('town', 'merchant');
  ok('talking to him offers the quest with three choices: accept, shop, not now', r && r.choices.length === 3 && /الحقائب|packs/.test(r.text) && /180/.test(r.text), r);
  await page.screenshot({ path: shot('quest_offer.png') });
  await pick(0);
  r = await ev(() => ({ st: Quests.state('m1'), mark: Quests.mark('town', 'merchant'), state: DW.G.state, toast: DW.G.toast && DW.G.toast.text }));
  ok('accepting starts it (one, at the first step), closes the dialog and says so', r.st && r.st.s === 1 && r.st.k === 0 && r.state === 'play' && /الحقائب|Packs/.test(r.toast || ''), r);
  r = await talk('town', 'merchant');
  ok('talking again reminds him of it, with the objective and its count', r && /0 \/ 3/.test(r.text) && r.choices.length === 2, r);
  await pick(1);
  r = await ev(() => ({ state: DW.G.state }));
  await ev(() => { DW.G.state = 'play'; DW.G.dialog = null; });
  // ---- collect: the things are only there while asked for
  await reset(); await go('cx2');
  r = await ev(() => DW.G.items.filter(i => i.kind === 'quest').length);
  ok('without the quest, a pack is not there', r === 0, r);
  await ev(() => { Quests.accept(Quests.by('m1')); });
  r = await ev(() => DW.G.items.filter(i => i.kind === 'quest').length);
  ok('taking the quest in that room makes it appear at once', r === 1, r);
  const grab = room => ev(room => { const { G, P } = DW; DW.enterRoom(room, { pos: { x: 100, y: 100 } }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; G.enemies = []; P.invuln = 99; DW.step(3); const it = G.items.find(i => i.kind === 'quest'); if (!it) return null; P.x = it.x - P.w / 2; P.y = it.y - P.h / 2; P.vx = 0; P.vy = 0; DW.step(4); return { n: Object.keys(Quests.state('m1').got || {}).length, left: G.items.filter(i => i.kind === 'quest').length }; }, room);
  r = await grab('cx2'); ok('picking up the first pack counts 1 of 3 and it is gone', r && r.n === 1 && r.left === 0, r);
  r = await ev(() => ({ toast: DW.G.toast && DW.G.toast.text }));
  r = await grab('cx4'); ok('and the second', r && r.n === 2, r);
  r = await ev(() => { const { G } = DW; DW.enterRoom('cx2', { pos: { x: 100, y: 100 } }); G.state = 'play'; DW.step(2); return G.items.filter(i => i.kind === 'quest').length; });
  ok('a pack that was taken does not come back when the room is entered again', r === 0, r);
  r = await grab('cx5'); ok('and the third is taken and gone', r && r.left === 0, r);
  r = await ev(() => ({ ready: Quests.ready(Quests.by('m1')), goal: Quests.goal(Quests.by('m1')), mark: Quests.mark('town', 'merchant'), pins: Quests.pins().map(p => p.room) }));
  ok('all three: the quest is ready to hand in, a gold ? stands over him, and the log says where to go back', r.ready && r.mark === '?' && /التاجر الغريب|Strange Merchant/.test(r.goal) && r.pins.join() === 'town', r);
  // ---- hand in
  r = await talk('town', 'merchant');
  ok('he thanks him, names the reward, and offers the shop or to close', r && /180/.test(r.text) && r.choices.length === 2, r);
  r = await ev(() => ({ geo: DW.P.geo, st: Quests.state('m1').s }));
  ok('180 geo are paid and the quest is done', r.geo === 180 && r.st === 2, r);
  await pick(0);
  r = await ev(() => ({ state: DW.G.state, shopId: DW.G.shopId }));
  ok('the shop choice opens his shop', r.state === 'dialog' || r.state === 'shop', r);
  await ev(() => { DW.G.dialog = null; DW.G.state = 'play'; });
  r = await ev(() => ({ m: Quests.mark('town', 'merchant'), a: Quests.by('m2').need() }));
  ok('the next quest of his opens (the Ledger\'s Word) and the ! comes back', r.m === '!' && r.a === true, r);
  // ---- deliver, and the haggle perk
  r = await talk('town', 'merchant'); await pick(0);
  r = await ev(() => ({ st: Quests.state('m2'), mark: Quests.mark('mg2', 'merchant'), pins: Quests.pins().map(p => p.room + ':' + p.x) }));
  ok('the ledger is carried: a ? now stands over the Mossgrove merchant and the map points at him', r.st.s === 1 && r.mark === '?' && r.pins.some(p => p.startsWith('mg2:')), r);
  r = await talk('mg2', 'merchant');
  ok('he answers with his own words', r && /دفتر|ledger/.test(r.text) && /تاجر البستان|Mossgrove/.test(r.text), r);
  r = await ev(() => ({ k: Quests.state('m2').k, ready: Quests.ready(Quests.by('m2')) }));
  ok('and the quest goes back to the first merchant', r.k === 1 && r.ready, r);
  await pick(1);
  r = await talk('town', 'merchant'); await ev(() => { DW.G.dialog = null; DW.G.state = 'play'; });
  r = await ev(() => ({ geo: DW.P.geo, perk: Quests.perk('haggle'), k: Quests.priceK(), price: shopPrice({ price: 380 }), done: Quests.isDone('m2') }));
  ok('handing it in pays 100 and lowers every price a tenth (380 becomes 342)', r.geo === 280 && r.perk && r.price === 342 && r.done, r);
  r = await ev(() => { const { G, P } = DW; P.geo = 1000; G.shopId = 'smith'; G.state = 'shop'; G.shopTop = 0; const it = SHOPS.smith.items.find(i => i.gear[1] === 'duskblade'); G.menuSel = shopList().indexOf(it); return { idx: G.menuSel }; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => ({ geo: DW.P.geo })); ok('and buying really costs the lower price (380 becomes 342)', r.geo === 1000 - 342, r);
  await ev(() => { DW.G.state = 'play'; });
  // ---- kill
  await reset(); await ev(() => { Quests.accept(Quests.by('m3')); }); 
  r = await ev(() => { const { G, P } = DW; DW.enterRoom('mg1', { pos: { x: 100, y: 100 } }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; P.invuln = 99; G.enemies = []; const e = new ENEMY_TYPES.crawler({ type: 'crawler', x: 30, y: 17 }); e.kind = 'crawler'; Mind.prepare(e, 'mossgrove'); G.enemies.push(e); e.hp = 0; e.kill(); return Quests.state('m3').n; });
  ok('a creature killed in the Mossgrove counts', r === 1, r);
  r = await ev(() => { const { G } = DW; const e = new ENEMY_TYPES.crawler({ type: 'crawler', x: 30, y: 17 }); e.kind = 'crawler'; Mind.prepare(e, 'crossroads'); G.enemies.push(e); e.hp = 0; e.kill(); return Quests.state('m3').n; });
  ok('one killed elsewhere does not', r === 1, r);
  r = await ev(() => { Quests.killed({ isBoss: true, kind: 'x', area: 'mossgrove' }); Quests.killed({ dummy: true, kind: 'dummy', area: 'mossgrove' }); return Quests.state('m3').n; });
  ok('a boss and the training post do not either', r === 1, r);
  r = await ev(() => { for (let i = 0; i < 9; i++) Quests.killed({ kind: 'crawler', area: 'mossgrove' }); return { n: Quests.state('m3').k, ready: Quests.ready(Quests.by('m3')) }; });
  ok('the tenth finishes it', r.ready && r.n === 1, r);
  r = await talk('mg2', 'merchant'); r = await ev(() => ({ geo: DW.P.geo, done: Quests.isDone('m3') })); ok('and he pays 220', r.geo === 220 && r.done, r);
  await ev(() => { DW.G.dialog = null; DW.G.state = 'play'; });
  r = await ev(() => { DW.G.flags.qs.m5 = { s: 1, k: 1, n: 0, got: {}, vis: {} }; Quests.killed({ kind: 'crawler', area: 'webbed' }); const a = Quests.state('m5').n; for (let i = 0; i < 6; i++) Quests.killed({ kind: 'spider', area: 'webbed' }); return { a, ready: Quests.ready(Quests.by('m5')) }; });
  ok('a quest for one kind of creature counts only that kind (six spiders, not the crawler)', r.a === 0 && r.ready, r);
  // ---- visit
  await reset(); await ev(() => { Quests.accept(Quests.by('w5')); });
  r = await ev(() => { const { G, P } = DW; const out = []; for (const room of ['mv2', 'mv2', 'cx2', 'mv3']) { DW.enterRoom(room, { pos: { x: 100, y: 100 } }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; out.push(Object.keys(Quests.state('w5').vis || {}).length); } return out; });
  ok('entering a room to see counts once; other rooms do not count', r.join() === '1,1,1,2', r);
  r = await ev(() => { const { G } = DW; DW.enterRoom('mv5', { pos: { x: 100, y: 100 } }); return Quests.ready(Quests.by('w5')); });
  ok('the third hall finishes it', r === true, r);
  // ---- boss
  await reset();
  r = await ev(() => ({ closed: Quests.mark('lo4', 'wizard'), need: Quests.by('w6').need() }));
  ok('the last wizard\'s question stays closed until three of the other wizard quests are done', r.need === false && r.closed === null, r);
  r = await ev(() => { const { G } = DW; for (const id of ['w1', 'w2', 'w4']) G.flags.qs = Object.assign(G.flags.qs || {}, { [id]: { s: 2, k: 1 } }); return { need: Quests.by('w6').need(), mark: Quests.mark('lo4', 'wizard') }; });
  ok('then it opens', r.need === true && r.mark === '!', r);
  r = await ev(() => { Quests.accept(Quests.by('w6')); const a = Quests.ready(Quests.by('w6')); DW.G.flags.boss_regent = true; Quests.update(1); return { a, b: Quests.ready(Quests.by('w6')) }; });
  ok('a guardian beaten ends the boss step by itself', r.a === false && r.b === true, r);
  r = await ev(() => { const { G } = DW; G.flags.qs.w6 = undefined; delete G.flags.qs.w6; G.flags.boss_regent = true; Quests.accept(Quests.by('w6')); return Quests.ready(Quests.by('w6')); });
  ok('one already beaten is ready as soon as the quest is taken', r === true, r);
  // ---- the other perks
  await reset();
  r = await ev(() => { const { P, G } = DW; const base = P.spellDmg(100); G.flags.perk_ink = true; const ink = P.spellDmg(100); delete G.flags.perk_ink; const f0 = Quests.fare(); G.flags.perk_wick = true; const f1 = Quests.fare(); delete G.flags.perk_wick; G.geos = []; G.dropGeo(100, 100, 100); const g0 = G.geos.reduce((a, c) => a + (c.value || c.v || c.amount || 0), 0); G.flags.perk_purse = true; G.geos = []; G.dropGeo(100, 100, 100); const g1 = G.geos.reduce((a, c) => a + (c.value || c.v || c.amount || 0), 0); delete G.flags.perk_purse; return { base, ink, f0, f1, g0, g1, ks: [Quests.priceK(), Quests.geoK(), Quests.spellK()] }; });
  ok('the ink perk makes spells a tenth stronger, the wick perk makes a lantern trip ten geo, the purse perk lets a seventh more geo fall', r.ink === Math.round(r.base * 1.1) && r.f0 === 25 && r.f1 === 10 && r.g1 > r.g0 && r.g1 === 115 && r.ks.join() === '1,1,1', r);
  // ---- save
  await reset();
  r = await ev(() => { Quests.accept(Quests.by('m1')); Quests.collected({ id: 'qi_m1_a' }); saveGame(); const s = readSave(); return { saved: s.flags.qs.m1 }; });
  ok('the state of the quests is in the save, with what was collected', r.saved && r.saved.s === 1 && r.saved.got.qi_m1_a === true, r);
  // ---- dialogs: keys and taps
  await reset();
  r = await talk('town', 'merchant');
  await ev(() => { const d = DW.G.dialog; d.i = d.lines.length - 1; d.t = 1; DW.step(1); });
  await page.keyboard.press('ArrowRight'); await ev(() => DW.step(2)); await page.keyboard.press('ArrowRight'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.dialog.sel); ok('Right moves along the choices', r === 2, r);
  await page.keyboard.press('ArrowLeft'); await ev(() => DW.step(2)); r = await ev(() => DW.G.dialog.sel); ok('and Left back', r === 1, r);
  await page.keyboard.press('x'); await ev(() => DW.step(3));
  r = await ev(() => ({ state: DW.G.state, st: Quests.state('m1') })); ok('X takes the last choice (not now): nothing is taken', r.state === 'play' && r.st === null, r);
  await talk('town', 'merchant');
  await ev(() => { const d = DW.G.dialog; d.i = d.lines.length - 1; d.t = 1; DW.step(1); DW.draw(); });
  { const b = await ev(() => { const r2 = document.querySelector('canvas').getBoundingClientRect(); return { l: r2.left, t: r2.top, w: r2.width, h: r2.height, hits: DW.G.menuHits.length }; });
    await page.mouse.click(b.l + (960 - (3 * 190 + 28)) / 2 * b.w / 960 + 95 * b.w / 960, b.t + 332 * b.h / 540); await ev(() => DW.step(3)); }
  r = await ev(() => ({ st: Quests.state('m1') })); ok('a tap on a choice picks it', r.st && r.st.s === 1, r);
  // ---- people without work are as before
  r = await ev(() => { const { G } = DW; const out = {}; for (const [room, type] of [['town', 'smith'], ['town', 'outfitter'], ['town', 'elder'], ['cx1', 'merchant']]) { DW.enterRoom(room, { pos: { x: 100, y: 100 } }); out[room + type] = Quests.talk({ type, px: 0, py: 0 }); } return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v === null])); });
  ok('the smith, the outfitter, the elder and a merchant with no work say nothing about quests', Object.values(r).every(Boolean), r);
  // ---- the log
  await reset();
  r = await ev(() => { const out = []; for (const lang of ['ar', 'en']) { setLang(lang); DW.G.state = 'quests'; DW.G.questSel = 0; try { DW.draw(); } catch (e) { out.push('empty ' + lang + ':' + e.message); } } setLang('ar'); return out; });
  ok('the empty log draws and says how to get quests', r.length === 0, r);
  r = await ev(() => { const out = []; Quests.accept(Quests.by('m1')); Quests.accept(Quests.by('w1')); DW.G.flags.qs.m3 = { s: 2, k: 1 }; Quests.accept(Quests.by('m4')); for (const lang of ['ar', 'en']) for (let i = 0; i < 4; i++) { setLang(lang); DW.G.state = 'quests'; DW.G.questSel = i; DW.G.questsT = 0.5; try { DW.draw(); } catch (e) { out.push(lang + i + ':' + e.message); } } setLang('ar'); return { out, list: Quests.logList().map(q => q.id) }; });
  ok('the log lists those in hand first, then those done, and draws in both languages', r.out.length === 0 && r.list.join() === 'm1,m4,w1,m3', r);
  await page.screenshot({ path: shot('quest_log.png') });
  r = await ev(() => { const { G } = DW; G.state = 'pause'; G.menuSel = 0; return { label: pauseItems().find(i => i.id === 'quests').label, i: pauseItems().findIndex(i => i.id === 'quests') }; });
  ok('the pause menu has a Quests entry that shows how many are in hand', /المهام/.test(r.label) && /3/.test(r.label), r);
  await ev(() => { DW.G.menuSel = pauseItems().findIndex(i => i.id === 'quests'); });
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.state); ok('Enter opens it', r === 'quests', r);
  await page.keyboard.press('ArrowDown'); await ev(() => DW.step(2)); r = await ev(() => DW.G.questSel); ok('Down picks the next', r === 1, r);
  await page.keyboard.press('Escape'); await ev(() => DW.step(2)); r = await ev(() => DW.G.state); ok('Esc goes back to the pause menu', r === 'pause', r);
  { await ev(() => { DW.G.state = 'quests'; DW.G.questSel = 0; DW.draw(); });
    const b = await ev(() => { const r2 = document.querySelector('canvas').getBoundingClientRect(); return { l: r2.left, t: r2.top, w: r2.width, h: r2.height }; });
    await page.mouse.click(b.l + 200 * b.w / 960, b.t + (76 + 14 + 2 * 66 + 33 - 4) * b.h / 540); await ev(() => DW.step(1)); r = await ev(() => DW.G.questSel); ok('a tap on a row of the list picks it', r === 2, r);
    await page.mouse.click(b.l + (960 - 44) * b.w / 960, b.t + 31 * b.h / 540); await ev(() => DW.step(1)); r = await ev(() => DW.G.state); ok('and the round button goes back', r === 'pause', r); }
  // ---- the marks over the people and on the map, and the art of every kind of thing
  r = await ev(() => { const out = [], { G } = DW; DW.enterRoom('town', { pos: { x: 100, y: 100 } }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null; DW.step(2); try { DW.draw(); } catch (e) { out.push('play:' + e.message); }
    for (const id of WORLD.order) G.visited[id] = true; for (const lang of ['ar', 'en']) for (const mode of [0, 1, 2]) { setLang(lang); G.state = 'map'; G.mapView = { mode, px: 0, py: 0 }; try { DW.draw(); } catch (e) { out.push(lang + mode + ':' + e.message); } } setLang('ar'); G.state = 'play'; G.mapView = null;
    const c = document.createElement('canvas'); c.width = 100; c.height = 100; const g = c.getContext('2d'); for (const icon of ['pack', 'flask', 'shard', 'bone', 'lens', 'spool']) { try { Art.drawItem(g, { kind: 'quest', x: 50, y: 50, def: { icon } }, 1); } catch (e) { out.push(icon + ':' + e.message); } }
    return out; });
  ok('the world with its marks, the map with its pins in six views, and the six kinds of things all draw', r.length === 0, r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
