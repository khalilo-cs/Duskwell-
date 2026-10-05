// Merchants and wizards standing in many rooms, the wizard's stock, and the vials that can be bought again and again.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  // the quests (quests.js) have their own dialogs; here every quest is already done, so the people only greet and sell
  await ev(() => { const Q = DW.G.flags.qs = {}; for (const q of QUESTS) Q[q.id] = { s: 2, k: q.steps.length, n: 0, got: {}, vis: {} }; });
  // where everybody stands
  let r = await ev(() => {
    const out = { merchants: [], wizards: [], bad: [] };
    for (const id of WORLD.order) for (const n of WORLD.rooms[id].npcs) {
      if (n.type === 'merchant') out.merchants.push(id); if (n.type === 'wizard') out.wizards.push(id);
      const R = WORLD.rooms[id], at = (x, y) => R.t[y * R.w + x];
      if (n.type === 'merchant' || n.type === 'wizard') { if (at(n.x, n.y + 1) !== T_SOLID || at(n.x, n.y) !== T_AIR || at(n.x, n.y - 3) !== T_AIR) out.bad.push(id); }
    }
    return out;
  });
  ok('merchants stand in the town and in at least ten more rooms', r.merchants.length >= 11 && r.merchants.includes('town'), r.merchants);
  ok('wizards stand in at least five rooms, in different areas', r.wizards.length >= 5 && new Set(r.wizards.map(id => id.replace(/\d+/, ''))).size >= 4, r.wizards);
  ok('everybody stands on solid floor with air overhead', r.bad.length === 0, r.bad);
  // every shop that is used has a stock
  r = await ev(() => Object.fromEntries(Object.entries(SHOPS).map(([k, v]) => [k, v.items.length])));
  ok('the wizard has six wares', r.wizard === 6, r);
  // talk to a wizard: a dialog, then his shop
  const at = async (room, type) => ev(([room, type]) => {
    DW.enterRoom(room, { pos: { x: 100, y: 100 } }); const { G, P } = DW; G.state = 'play'; G.trans = null; G.fadeA = 0; G.areaBanner = null;
    const n = G.npcs.find(q => q.type === type); P.x = n.px - P.w / 2 + 40; P.y = n.py - P.h - 2; P.vx = 0; P.vy = 0; DW.step(2); return !!n;
  }, [room, type]);
  ok('a wizard is in the room', await at('cx3', 'wizard'));
  await page.keyboard.press('ArrowUp'); await ev(() => DW.step(3));
  r = await ev(() => ({ state: DW.G.state, id: DW.G.shopId, text: DW.G.dialog && DW.G.dialog.lines[0] }));
  ok('Up beside the wizard opens his dialog', r.state === 'dialog' && r.id === 'wizard' && /الساحر|Sorcerer/.test(r.text), r);
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  ok('then his shop', await ev(() => DW.G.state) === 'shop');
  await page.screenshot({ path: shot('shop_wizard.png') });
  // vials: refused when there is nothing to mend, bought again and again otherwise
  r = await ev(() => {
    const { G, P } = DW; G.shopId = 'wizard'; G.state = 'shop'; G.shopTop = 0; P.geo = 1000; P.hp = P.maxHp; P.soul = P.maxSoul;
    const out = {}, list = shopList(), fl = list.find(i => i.id === 'flask'), vi = list.find(i => i.id === 'vial');
    out.flaskSold = shopSold(fl);
    G.menuSel = list.indexOf(fl); return out;
  });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ geo: DW.P.geo }));
  ok('a flask is refused, and costs nothing, when the soul is full', r.geo === 1000, r);
  await ev(() => { DW.P.soul = 0; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ geo: DW.P.geo, soul: DW.P.soul, sold: shopSold(shopList().find(i => i.id === 'flask')) }));
  ok('two flasks bought one after the other: 198 soul (a third each) for 180 geo, never sold out', r.geo === 820 && r.soul === 198 && r.sold === false, r);
  r = await ev(() => { const { P } = DW; P.hp = 2; const list = shopList(); DW.G.menuSel = list.findIndex(i => i.id === 'vial'); return DW.G.menuSel; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ hp: DW.P.hp, geo: DW.P.geo }));
  ok('a vial mends one mask for 120 geo', r.hp === 3 && r.geo === 700, r);
  // the ink and the rune need seals, then change the numbers
  r = await ev(() => {
    const { G, P } = DW, list = shopList(), ink = list.find(i => i.id === 'buy_ink'), rune = list.find(i => i.id === 'buy_rune');
    const out = { lockedInk: shopLocked(ink), lockedRune: shopLocked(rune), dmg0: P.spellDmg(20), cost0: P.spellCost() };
    G.flags.boss_a = true; return out;
  });
  ok('the ink and the rune are locked without seals', r.lockedInk && r.lockedRune, r);
  r = await ev(() => {
    const { G, P } = DW; for (const f of SEAL_FLAGS.slice(0, 4)) G.flags[f] = true;
    const list = shopList(), ink = list.find(i => i.id === 'buy_ink'), rune = list.find(i => i.id === 'buy_rune'), out = { open: !shopLocked(ink) && !shopLocked(rune) };
    P.geo = 3000; for (const it of [ink, rune]) { G.menuSel = list.indexOf(it); }
    return out;
  });
  ok('four seals open them', r.open, r);
  r = await ev(() => {
    const { G, P } = DW, list = shopList(); P.geo = 3000; const out = {};
    G.menuSel = list.findIndex(i => i.id === 'buy_ink'); return out;
  });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  await ev(() => { DW.G.menuSel = shopList().findIndex(i => i.id === 'buy_rune'); });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ geo: DW.P.geo, dmg: DW.P.spellDmg(20), cost: DW.P.spellCost(), ink: !!DW.G.flags.buy_ink, rune: !!DW.G.flags.buy_rune }));
  ok('the ink makes spells hit a quarter harder, the rune makes them five soul cheaper', r.dmg === 25 && r.cost === 28 && r.ink && r.rune && r.geo === 3000 - 700 - 950, r);
  // the dusk cry bought here is the same one as the town's
  r = await ev(() => ({ same: SHOPS.wizard.items[0] === SHOP_ITEMS.find(i => i.id === 'buy_wail') }));
  ok('the Dusk Cry is shared with the town merchant (one flag)', r.same, r);
  // a merchant on the road sells the town's stock
  ok('a merchant is in the room', await at('cx1', 'merchant'));
  await page.keyboard.press('ArrowUp'); await ev(() => DW.step(3));
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => ({ state: DW.G.state, id: DW.G.shopId, n: shopList().length }));
  ok('a road merchant opens the general shop', r.state === 'shop' && r.id === 'general' && r.n >= 8, r);
  await page.screenshot({ path: shot('shop_road.png') });
  // everything draws
  r = await ev(() => { const out = []; for (const id of Object.keys(SHOPS)) { DW.G.shopId = id; DW.G.state = 'shop'; DW.G.menuSel = 0; DW.G.shopTop = 0; try { DW.draw(); } catch (e) { out.push(id + ':' + e.message); } } return out; });
  ok('every shop draws', r.length === 0, r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
