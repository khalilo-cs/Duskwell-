const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
const near = (a, b, e) => Math.abs(a - b) <= (e || 1e-6);
(async () => {
  const { browser, page, errors } = await open();
  const ev = f => page.evaluate(f);
  const setup = () => ev(() => {
    const { G, P, enterRoom, Charms } = DW;
    Charms.reset(); G.flags = {};
    enterRoom('cx2', { pos: { x: 12 * 32, y: 20 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; G.geos = [];
    P.invuln = 0; P.hp = P.maxHp = 5; P.soul = 0; P.dead = false; P.sitting = null; P.face = 1; P.nail = 5; P.soulGain = 11;
    for (const k of Object.keys(P.ab)) P.ab[k] = true;
    DW.step(30);
  });

  // ---------- notches and wearing
  let r = await ev(() => {
    const { G, Charms } = DW; Charms.reset(); G.flags = {};
    const out = { n0: Charms.notches() };
    G.flags.boss_guardian = true; G.flags.boss_spore = true; out.n2seals = Charms.notches();
    G.flags.boss_weaver = true; out.n3seals = Charms.notches();
    G.flags.buy_notch1 = true; G.flags.buy_notch2 = true; out.nAll = Charms.notches();
    G.flags = {}; Charms.reset();
    for (const id of ['focus', 'deep', 'thorn']) Charms.give(id);
    out.t1 = Charms.toggle('focus'); out.t2 = Charms.toggle('deep'); out.t3 = Charms.toggle('thorn');
    out.t4 = Charms.toggle('focus'); out.t5 = Charms.toggle('thorn'); out.over = Charms.over(); out.none = Charms.toggle('mage');
    out.dupGive = Charms.give('focus');
    return out;
  });
  ok('3 notches at the start', r.n0 === 3, r.n0);
  ok('2 seals give a 4th notch', r.n2seals === 4, r.n2seals);
  ok('3 seals still 4 (one per two)', r.n3seals === 4, r.n3seals);
  ok('merchant notches add 2 (3 seals: 3+1+2)', r.nAll === 6, r.nAll);
  ok('first charm fits', r.t1 === 'on'); ok('a charm that does not fit is refused', r.t2 === 'full');
  ok('no free notch, no charm', r.t3 === 'full'); ok('taking one off frees its notches', r.t4 === 'off' && r.t5 === 'on');
  ok('never over the notch limit', r.over === false); ok('unowned charm not wearable', r.none === 'none'); ok('no duplicate give', r.dupGive === false);

  // ---------- a wound is one mask; shell ward; thorn; spirit
  await setup();
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    for (const id of ['focus', 'deep']) { Charms.give(id); Charms.toggle(id); }
    out.over = Charms.over(); P.hurt(2, P.cx + 10); out.hp1 = P.hp; out.grace = P.invuln; out.stun = P.hurtT;
    P.hurt(1, P.cx + 10); out.hpAgain = P.hp;                        // straight after: still untouchable
    P.invuln = 0; P.hurt(1, P.cx + 10); out.hp2 = P.hp;
    P.invuln = 0; P.spikeHurt(); out.hp3 = P.hp;
    return out;
  });
  ok('every wound costs exactly one mask, even a heavy one', !r.over && r.hp1 === 4 && r.hp2 === 3 && r.hp3 === 2, r);
  ok('after a wound the hero is untouchable for a moment and staggers', r.grace > 1 && r.stun > 0 && r.hpAgain === 4, r);

  await setup();
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    Charms.give('shell'); Charms.toggle('shell'); out.before = Charms.shellUp(); Charms.rest(); out.armed = Charms.shellUp();
    const a = P.hurt(1, P.cx + 10); out.absorbed = P.hp === 5 && a === true && !Charms.shellUp();
    P.invuln = 0; P.hurt(1, P.cx + 10); out.second = P.hp;
    return out;
  });
  ok('shell not armed before resting', r.before === false); ok('rest arms the shell', r.armed === true);
  ok('first wound absorbed', r.absorbed === true, r); ok('second wound hurts', r.second === 4, r.second);

  await setup();
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    for (const id of ['thorn', 'spirit']) { Charms.give(id); Charms.toggle(id); }
    const e = new ENEMY_TYPES.crawler({ x: Math.round(P.cx / 32), y: 19 }); e.kind = 'crawler'; e.hp = 30; G.enemies.push(e);
    P.soul = 0; P.hurt(1, P.cx + 40); out.enemyHp = e.hp; out.soul = P.soul; out.hp = P.hp;
    return out;
  });
  ok('thorn burst hurt the enemy (9)', r.enemyHp === 21, r.enemyHp); ok('pain echo gave 18 soul', r.soul === 18, r.soul);

  // ---------- numbers
  await setup();
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    const use = ids => { for (const id of Charms.ORDER) if (Charms.has(id)) Charms.toggle(id); for (const id of ids) { Charms.give(id); Charms.toggle(id); } };
    G.flags.buy_notch1 = G.flags.buy_notch2 = true; G.flags.boss_guardian = G.flags.boss_spore = G.flags.boss_weaver = G.flags.boss_drowned = true;   // plenty of notches
    out.base = [P.focusTime(), P.spellCost(), P.reachK(), P.nailDamage(), P.spellDmg(14)];
    use(['focus']); out.focus = P.focusTime(); use(['deep']); out.deep = P.focusTime(); use(['focus', 'deep']); out.both = P.focusTime();
    use(['thrift']); out.thrift = P.spellCost(); use(['reach']); out.reach = P.reachK(); use(['mage']); out.mage = P.spellDmg(14);
    use(['fury']); P.hp = 2; out.fury2 = P.nailDamage(); P.hp = 1; out.fury1 = P.nailDamage(); P.hp = 5;
    return out;
  });
  ok('base values', r.base.join() === [0.9, 33, 1, 5, 14].join(), r.base);
  ok('swift focus faster', r.focus < 0.6 && r.focus > 0.5, r.focus); ok('deep focus slower', near(r.deep, 1.44, 1e-3), r.deep);
  ok('both nearly cancel out', r.both > 0.85 && r.both < 0.95, r.both); ok('thrift costs 24', r.thrift === 24);
  ok('reach 1.35', r.reach === 1.35); ok('mage 14 -> 20', r.mage === 20, r.mage);
  ok('fury only at 1 mask', r.fury2 === 5 && r.fury1 === 9, [r.fury2, r.fury1]);

  // ---------- live behaviour with real input
  await setup();
  r = await ev(() => { const { P, Charms } = DW; Charms.give('boots'); Charms.toggle('boots'); P.x = 8 * 32; return 0; });
  await page.keyboard.down('ArrowRight'); await ev(() => DW.step(40));
  const vx = await ev(() => DW.P.vx); await page.keyboard.up('ArrowRight');
  ok('wind boots: run speed 305', near(vx, 305, 1), vx);

  await setup();
  await ev(() => { DW.P.x = 8 * 32; });
  await page.keyboard.down('ArrowRight'); await ev(() => DW.step(40));
  const vx0 = await ev(() => DW.P.vx); await page.keyboard.up('ArrowRight');
  ok('without boots: run speed 250', near(vx0, 250, 1), vx0);

  await setup();
  await ev(() => { const { G, P, Charms } = DW; G.flags.buy_notch1 = true; Charms.give('dashmaster'); Charms.toggle('dashmaster'); Charms.give('swift'); Charms.toggle('swift'); P.dashCD = 0; });
  await page.keyboard.press('KeyC'); await ev(() => DW.step(1));
  const dcd = await ev(() => DW.P.dashCD);
  ok('dash master: cooldown about 0.3', dcd > 0.25 && dcd <= 0.3, dcd);
  await ev(() => DW.step(30)); await page.keyboard.press('KeyX'); await ev(() => DW.step(1));
  const acd = await ev(() => DW.P.atkCD);
  ok('gale strike: attack cooldown about 0.21', acd > 0.17 && acd <= 0.21, acd);

  await setup();
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    P.atkDir = 'side'; P.atkT = 0.1; P.hits = new Set(); P.attackHits(); out.w0 = P.atkBox.w;
    Charms.give('reach'); Charms.toggle('reach'); P.hits = new Set(); P.attackHits(); out.w1 = P.atkBox.w;
    Charms.give('siphon'); G.flags.buy_notch1 = true; Charms.toggle('siphon');
    const e = new ENEMY_TYPES.crawler({ x: Math.round(P.cx / 32) + 1, y: 20 }); e.kind = 'crawler'; e.hp = 100; G.enemies.push(e);
    P.soul = 0; P.hits = new Set(); P.atkDir = 'side'; P.face = 1; e.x = P.cx + 30; e.y = P.y + P.h - e.h; P.attackHits(); out.soul = P.soul; out.ehp = e.hp;
    return out;
  });
  ok('long edge widens the strike', r.w0 === 70 && r.w1 === 94.5, [r.w0, r.w1]);
  ok('soul siphon: 11 + 6 per hit', r.soul === 17, r.soul);

  await setup();
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    for (const id of ['mage', 'thrift']) { Charms.give(id); } G.flags.buy_notch1 = G.flags.buy_notch2 = true; G.flags.boss_guardian = G.flags.boss_spore = true;
    Charms.toggle('mage'); Charms.toggle('thrift'); P.soul = 50; P.castBolt(); out.soul = P.soul; out.dmg = G.projs[G.projs.length - 1].dmg;
    return out;
  });
  ok('thrift: bolt costs 24', r.soul === 26, r.soul); ok('mage: bolt hits for 20', r.dmg === 20, r.dmg);

  // deep focus really heals two masks (hold F)
  await setup();
  await ev(() => { const { P, Charms } = DW; Charms.give('deep'); DW.G.flags.buy_notch2 = true; DW.G.flags.buy_notch1 = true; DW.G.flags.boss_guardian = DW.G.flags.boss_spore = true; Charms.toggle('deep'); P.hp = 2; P.soul = 99; });
  await page.keyboard.down('KeyF'); await ev(() => DW.step(60 * 2)); await page.keyboard.up('KeyF'); await ev(() => DW.step(2));
  r = await ev(() => ({ hp: DW.P.hp, soul: DW.P.soul }));
  ok('deep focus: +2 masks for one 33 soul', r.hp === 4 && r.soul === 66, r);
  await setup();
  await ev(() => { const { P } = DW; P.hp = 2; P.soul = 99; });
  await page.keyboard.down('KeyF'); await ev(() => DW.step(60 * 2)); await page.keyboard.up('KeyF'); await ev(() => DW.step(2));
  r = await ev(() => ({ hp: DW.P.hp, soul: DW.P.soul }));
  ok('plain focus: +1 mask', r.hp === 3 && r.soul === 66, r);

  // geo magnet
  await setup();
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    Charms.give('magnet'); Charms.toggle('magnet'); P.geo = 0;
    G.geos.push(new Geo(P.cx + 120, P.y - 30, 5)); G.geos[0].age = 1; G.geos[0].vy = 0; G.geos[0].vx = 0;
    DW.step(90); out.geo = P.geo; return out;
  });
  ok('geo magnet collects distant geo', r.geo === 5, r);
  await setup();
  r = await ev(() => {
    const { G, P } = DW; P.geo = 0; G.geos.push(new Geo(P.cx + 120, P.y - 30, 5)); G.geos[0].age = 1; G.geos[0].vx = 0; DW.step(90); return P.geo;
  });
  ok('without the magnet it stays', r === 0, r);

  // save and load
  r = await ev(() => {
    const { G, P, Charms } = DW; const out = {};
    G.flags = {}; Charms.reset(); Charms.give('thorn'); Charms.give('mage'); Charms.give('boots'); Charms.toggle('thorn'); Charms.toggle('boots');
    G.bench = { room: 'cx2' }; saveGame();
    Charms.reset(); out.cleared = Charms.ownedList().length;
    startGame(true); G.state = 'play';
    out.owned = Charms.ownedList().join(); out.worn = Charms.ORDER.filter(id => Charms.has(id)).join();
    return out;
  });
  ok('save keeps owned and worn charms', r.cleared === 0 && r.owned === 'thorn,boots,mage' && r.worn === 'thorn,boots', r);

  // shop
  await setup();
  await ev(() => { const { G, P } = DW; P.geo = 2000; G.flags.boss_guardian = true; G.state = 'shop'; G.menuSel = shopList().findIndex(i => i.id === 'buy_reach'); G.shopTop = 0; });
  r = await ev(() => ({ n: shopList().length, names: shopList().map(i => i.id) }));
  ok('shop hides the second notch at first', r.n === 8 && !r.names.includes('buy_notch2'), r);
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ owned: DW.Charms.ownedList().join(), geo: DW.P.geo }));
  ok('buying a charm in the shop', r.owned === 'reach' && r.geo === 1500, r);
  await ev(() => { DW.G.menuSel = shopList().findIndex(i => i.id === 'buy_notch1'); });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ n: DW.Charms.notches(), list: shopList().length, geo: DW.P.geo }));
  ok('buying a notch adds one and reveals the next', r.n === 4 && r.list === 9 && r.geo === 900, r);

  // screens: charm UI behaviour and screenshots
  await setup();
  await ev(() => { const { G, P, Charms } = DW; for (const id of Charms.ORDER) Charms.give(id); Charms.toggle('reach'); Charms.toggle('swift'); G.state = 'charms'; G.charmSel = 1; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: shot('charms_screen.png') });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ note: DW.G.charmNote && DW.G.charmNote.text, worn: DW.Charms.has('swift') }));
  ok('cannot change charms away from a bench', r.note && r.worn === true, r);
  await ev(() => { DW.P.sitting = { px: DW.P.cx, py: DW.P.y + DW.P.h }; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => DW.Charms.has('swift')); ok('on a bench the charm comes off', r === false);
  await ev(() => { DW.G.charmSel = 4; });  // deep (4 notches) does not fit in the free notches
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ worn: DW.Charms.has('deep'), note: DW.G.charmNote && DW.G.charmNote.text }));
  ok('a charm with no room is refused with a message', !r.worn && !!r.note, r);
  await page.waitForTimeout(150); await page.screenshot({ path: shot('charms_screen_over.png') });
  await ev(() => { DW.G.state = 'shop'; DW.G.menuSel = 2; DW.G.shopTop = 0; DW.P.geo = 400; });
  await page.waitForTimeout(150); await page.screenshot({ path: shot('charms_shop.png') });

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close();
  process.exit(fails || errors.length ? 1 : 0);
})();
