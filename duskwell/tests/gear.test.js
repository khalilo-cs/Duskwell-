// Equipment (weapons, cloaks), the shops that sell them and the three arts of the nail.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = f => page.evaluate(f);
  const setup = (room, x, y) => page.evaluate(a => {
    const { G, P, enterRoom, Charms, Gear } = DW;
    Charms.reset(); Gear.reset(); G.flags = {}; G.shade = null;
    enterRoom(a[0], { pos: { x: a[1] * 32, y: a[2] * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; G.geos = [];
    P.invuln = 0; P.hp = P.maxHp = 5; P.soul = 0; P.dead = false; P.sitting = null; P.face = 1; P.nail = 5; P.soulGain = 11; P.geo = 0;
    for (const k of Object.keys(P.ab)) P.ab[k] = k !== 'wail';
    DW.step(30);
  }, [room || 'cx2', x || 12, y || 20]);
  // a still target: frozen enemies are skipped by the update loop but can be hit
  const dummy = (dx, kind) => page.evaluate(a => {
    const { G, P } = DW;
    const e = new ENEMY_TYPES[a[1] || 'crawler']({ x: 0, y: 0 }); e.kind = a[1] || 'crawler'; e.hp = 1000; e.frozenT = 1e9; e.dmg = 0;
    e.x = P.cx + a[0] - e.w / 2; e.y = P.y + P.h - e.h; G.enemies.push(e); return G.enemies.length - 1;
  }, [dx, kind]);
  const hpOf = i => ev('DW.G.enemies[' + i + '].hp');

  // ---------- the numbers
  let r = await ev(() => {
    const { P, Gear, Charms } = DW; const out = {};
    Gear.reset(); out.nd0 = P.nailDamage(); out.reach0 = P.reachK(); out.cd0 = Gear.atkCD();
    Gear.give('weapon', 'cleaver'); out.equipUnowned = Gear.equip('weapon', 'scythe'); Gear.equip('weapon', 'cleaver');
    out.ndCleaver = P.nailDamage(); out.reachCleaver = P.reachK(); out.cdCleaver = Gear.atkCD();
    Gear.give('cloak', 'duskmantle'); Gear.equip('cloak', 'duskmantle'); out.ndMantle = P.nailDamage();
    Charms.give('reach'); Charms.toggle('reach'); out.reachBoth = P.reachK();
    out.dupGive = Gear.give('weapon', 'cleaver'); out.unknown = Gear.give('weapon', 'nope');
    out.artEquip = Gear.equip('art', 'rend');
    Gear.reset(); Charms.reset();
    return out;
  });
  ok('the Dusk Nail is the starting weapon: 5 damage, reach 1, 0.34 s', r.nd0 === 5 && r.reach0 === 1 && Math.abs(r.cd0 - 0.34) < 1e-9, r);
  ok('an unowned weapon cannot be equipped', r.equipUnowned === false);
  ok('the Cleaver hits harder and slower', r.ndCleaver === 10 && r.cdCleaver > 0.5 && Math.abs(r.reachCleaver - 1.15) < 1e-9, r);
  ok('the Duskmantle adds 10% damage on top', r.ndMantle === 10 && Math.abs(r.reachBoth - 1.15 * 1.35) < 1e-9, r);
  ok('no duplicates, no unknown ids, arts are never "equipped"', r.dupGive === false && r.unknown === false && r.artEquip === false);

  // ---------- reach and height of every weapon, against a still target
  await setup();
  const reachOf = async id => {
    await page.evaluate(a => { const { Gear } = DW; Gear.reset(); Gear.give('weapon', a); Gear.equip('weapon', a); DW.G.enemies = []; DW.P.atkCD = 0; }, id);
    // find the furthest still target that a single swing reaches
    let best = 0;
    for (let d = 50; d <= 190; d += 6) {
      await ev(() => { DW.G.enemies = []; DW.P.atkT = 0; DW.P.atkCD = 0; DW.P.face = 1; DW.P.hits = new Set(); });
      const i = await dummy(d); const hp0 = await hpOf(i);
      await ev(() => { DW.P.atkBuf = 0.12; DW.step(3); });
      if ((await hpOf(i)) < hp0) best = d;
      await ev(() => DW.step(30));
    }
    return best;
  };
  const reaches = {};
  for (const id of ['nail', 'duskblade', 'lance', 'fangs', 'cleaver', 'scythe', 'rapier', 'bonesaw']) reaches[id] = await reachOf(id);
  console.log('reach (centre distance of the furthest hit target):', JSON.stringify(reaches));
  ok('the lance reaches further than the nail, the fangs less', reaches.lance > reaches.nail + 25 && reaches.fangs < reaches.nail - 10, reaches);
  ok('every weapon reaches at least something', Object.values(reaches).every(v => v > 0), reaches);
  ok('the scythe and rapier outreach the nail', reaches.scythe > reaches.nail && reaches.rapier > reaches.nail, reaches);

  // ---------- speed: swings per second
  r = await ev(() => {
    const { Gear, P } = DW; const out = {};
    for (const id of Object.keys(Gear.WEAPONS)) { Gear.reset(); Gear.give('weapon', id); Gear.equip('weapon', id); out[id] = Gear.atkCD(); }
    Gear.reset(); return out;
  });
  ok('fangs are the fastest, the cleaver the slowest', r.fangs === Math.min(...Object.values(r)) && r.cleaver === Math.max(...Object.values(r)), r);

  // ---------- soul, knockback, bleeding
  await setup();
  r = await ev(() => { const { Gear } = DW; Gear.give('weapon', 'fangs'); Gear.equip('weapon', 'fangs'); return null; });
  let i = await dummy(50);
  await ev(() => { DW.P.soul = 0; DW.P.atkBuf = 0.12; DW.step(3); });
  r = await ev(() => DW.P.soul);
  ok('Twin Fangs gather extra soul (11 + 3)', r === 14, r);
  await setup();
  await ev(() => { const { Gear } = DW; Gear.give('weapon', 'bonesaw'); Gear.equip('weapon', 'bonesaw'); });
  i = await dummy(50);
  await ev(() => { DW.G.enemies[0].frozenT = 0; DW.G.enemies[0].update = function () {}; DW.P.atkBuf = 0.12; DW.step(3); });
  const hpHit = await hpOf(i);
  await ev(() => DW.step(80));
  r = await ev(() => ({ hp: DW.G.enemies[0].hp }));
  ok('Bone Saw leaves a wound that keeps bleeding', r.hp < hpHit - 1, { hpHit, hp: r.hp });

  // ---------- cloaks
  await setup();
  r = await ev(() => {
    const { P, Gear } = DW; const out = {};
    Gear.give('cloak', 'ironhide'); Gear.equip('cloak', 'ironhide');
    P.invuln = 0; P.hurt(1, P.cx + 10); out.invuln = P.invuln; out.vx = Math.abs(P.vx);
    return out;
  });
  ok('Ironhide: longer grace (the base grace x 1.5) and half the recoil', Math.abs(r.invuln - 1.25 * 1.5) < 0.01 && Math.abs(r.vx - 165) < 1, r);
  await setup();
  await ev(() => { const { Gear } = DW; Gear.give('cloak', 'windweave'); Gear.equip('cloak', 'windweave'); });
  await page.keyboard.down('ArrowRight'); await ev(() => DW.step(40)); await page.keyboard.up('ArrowRight');
  r = await ev(() => DW.P.vx);
  ok('Windweave: runs 10% faster (275)', Math.abs(r - 275) < 2, r);
  await setup();
  await ev(() => { const { Gear } = DW; Gear.give('cloak', 'frostfur'); Gear.equip('cloak', 'frostfur'); });
  i = await dummy(80); const j = await dummy(400);
  await ev(() => { DW.G.enemies.forEach(e => { e.frozenT = 0; e.update = function () {}; }); DW.P.hurt(1, DW.P.cx + 10); });
  r = await ev(() => DW.G.enemies.map(e => e.frozenT > 0));
  ok('Frostfur: a wound freezes the near foe, not the far one', r[0] === true && r[1] === false, r);
  await setup();
  await ev(() => { const { Gear } = DW; Gear.give('cloak', 'emberweave'); Gear.equip('cloak', 'emberweave'); });
  i = await dummy(90);
  await ev(() => { DW.G.enemies[0].frozenT = 0; DW.G.enemies[0].update = function () {}; });
  await page.keyboard.press('KeyC'); await ev(() => DW.step(20));
  r = await ev(() => ({ hp: DW.G.enemies[0].hp, burn: DW.G.enemies[0].burnT }));
  ok('Embercloak: the dash itself wounds what it passes (4, once)', r.hp === 996, r);

  // ---------- Moon Rend
  await setup();
  await ev(() => { DW.Gear.give('art', 'rend'); });
  i = await dummy(190);
  await page.keyboard.down('KeyX'); await ev(() => DW.step(20));
  r = await ev(() => ({ ready: DW.P.rendReady, t: DW.P.rendT })); ok('holding a short while: not ready yet', r.ready === false, r);
  await ev(() => DW.step(30));
  r = await ev(() => ({ ready: DW.P.rendReady })); ok('after 0.62 s the blade gleams', r.ready === true, r);
  await page.waitForTimeout(60); await page.screenshot({ path: shot('rend_charge.png') });
  await page.keyboard.up('KeyX'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.projs.filter(p => p.kind === 'moon').map(p => ({ dmg: p.dmg, vx: p.vx, pierce: p.pierce })));
  ok('releasing sends the crescent: 2.6 x nail, piercing', r.length === 1 && r[0].dmg === 13 && r[0].pierce === true && r[0].vx > 0, r);
  await page.screenshot({ path: shot('rend_fire.png') });
  await ev(() => DW.step(40));
  ok('the crescent struck the target (13)', (await hpOf(i)) === 987, await hpOf(i));
  // a quick tap sends nothing
  await ev(() => { DW.G.projs = []; DW.step(40); });
  await page.keyboard.down('KeyX'); await ev(() => DW.step(15)); await page.keyboard.up('KeyX'); await ev(() => DW.step(3));
  r = await ev(() => DW.G.projs.filter(p => p.kind === 'moon').length); ok('a short press is only a strike', r === 0, r);
  // not learned: nothing
  await setup(); await ev(() => {});
  await page.keyboard.down('KeyX'); await ev(() => DW.step(60)); await page.keyboard.up('KeyX'); await ev(() => DW.step(3));
  r = await ev(() => ({ n: DW.G.projs.filter(p => p.kind === 'moon').length, ready: DW.P.rendReady })); ok('without the art, holding does nothing', r.n === 0 && !r.ready, r);

  // ---------- Dusk Rush
  await setup();
  await ev(() => { DW.Gear.give('art', 'rush'); });
  i = await dummy(110);
  await page.keyboard.press('KeyC'); await ev(() => DW.step(3));
  await page.keyboard.press('KeyX'); await ev(() => DW.step(3));
  r = await ev(() => ({ rush: DW.P.rushT, inv: DW.P.invuln, cd: DW.P.rushCD, vx: DW.P.vx }));
  ok('X during the dash starts the Rush: invulnerable, and it slows among the foes to cut them', r.rush > 0 && r.inv > 0.3 && r.vx > 0, r);
  await page.screenshot({ path: shot('rush.png') });
  await ev(() => DW.step(60));
  const hpR = await hpOf(i);
  ok('the Rush cuts the target several times (3 x 4 or more)', hpR <= 1000 - 3 * 4, hpR);
  r = await ev(() => ({ waves: DW.G.projs.filter(p => p.kind === 'wave').length, cd: DW.P.rushCD, rush: DW.P.rushT }));
  ok('it ends with a crescent, and the cooldown (1.1 s) keeps running', r.waves >= 1 && r.cd < 1.1 && r.rush === 0, r);
  await setup(); await ev(() => {});
  await page.keyboard.press('KeyC'); await ev(() => DW.step(3)); await page.keyboard.press('KeyX'); await ev(() => DW.step(3));
  r = await ev(() => DW.P.rushT); ok('without the art X while dashing does nothing special', r === 0, r);
  await setup();
  await ev(() => { DW.Gear.give('art', 'rush'); DW.P.ab.dash = false; });
  await page.keyboard.press('KeyX'); await ev(() => DW.step(3));
  r = await ev(() => DW.P.rushT); ok('no dash ability, no Rush', r === 0, r);

  // ---------- Soul Nova
  await setup();
  await ev(() => { DW.Gear.give('art', 'nova'); DW.P.soul = 99; DW.P.invuln = 0; });
  const a1 = await dummy(150), a2 = await dummy(-260), a3 = await dummy(700);
  await ev(() => { DW.G.projs.push(new Proj({ x: DW.P.cx + 90, y: DW.P.cy, vx: -10, vy: 0, r: 8, dmg: 1, friendly: false, life: 5 })); });
  await page.keyboard.down('KeyX'); await page.keyboard.press('KeyF'); await ev(() => DW.step(2));
  r = await ev(() => ({ nova: DW.P.novaT, soul: DW.P.soul, inv: DW.P.invuln }));
  ok('X + F with a full vessel: the Nova gathers, costs 66, protects', r.nova > 0 && r.soul === 33 && r.inv > 1, r);
  await ev(() => DW.step(14)); await page.screenshot({ path: shot('nova_gather.png') });
  await ev(() => DW.step(12)); await page.screenshot({ path: shot('nova_blast.png') });
  await page.keyboard.up('KeyX');
  await ev(() => DW.step(40));
  r = await ev(() => ({ h: DW.G.enemies.map(e => e.hp), hostile: DW.G.projs.filter(p => !p.friendly).length }));
  ok('everything within the blast is struck for 30 (both sides), the far one is not', r.h[0] === 970 && r.h[1] === 970 && r.h[2] === 1000, r);
  ok('hostile projectiles in the blast are wiped away', r.hostile === 0, r);
  await setup();
  await ev(() => { DW.Gear.give('art', 'nova'); DW.P.soul = 60; });
  await page.keyboard.down('KeyX'); await page.keyboard.press('KeyF'); await ev(() => DW.step(3)); await page.keyboard.up('KeyX');
  r = await ev(() => DW.P.novaT); ok('not enough soul: no Nova', r === 0, r);
  await setup();
  await ev(() => { DW.P.soul = 99; });
  await page.keyboard.down('KeyX'); await page.keyboard.press('KeyF'); await ev(() => DW.step(3)); await page.keyboard.up('KeyX');
  r = await ev(() => DW.P.novaT); ok('not learned: no Nova', r === 0, r);

  // ---------- shops: data
  r = await ev(() => {
    const { SHOPS, Gear } = DW; const bad = [];
    for (const [id, s] of Object.entries(SHOPS)) for (const it of s.items) {
      if (it.gear && !Gear.def(it.gear[0], it.gear[1])) bad.push(id + ':' + it.gear.join('/'));
      if (!(it.price > 0)) bad.push(id + ':price:' + it.id);
    }
    const sold = {}; for (const s of Object.values(SHOPS)) for (const it of s.items) if (it.gear) sold[it.gear.join('/')] = true;
    const missing = [];
    for (const k of ['weapon', 'cloak', 'art']) for (const id of Gear.ORDER[k]) if (!sold[k + '/' + id]) missing.push(k + '/' + id);
    return { bad, missing, shops: Object.keys(SHOPS) };
  });
  ok('every shop item is real and priced', r.bad.length === 0, r.bad);
  console.log('gear not yet sold anywhere (arrives with later areas):', JSON.stringify(r.missing));

  // ---------- buying
  await setup('town', 22, 17);
  r = await ev(() => {
    const { G, P, Gear, SHOPS } = DW; G.shopId = 'smith'; G.state = 'shop'; G.shopTop = 0; P.geo = 2000;
    const list = shopList(), out = { names: list.map(i => i.gear[1]) };
    out.lockedNova = shopLocked(list.find(i => i.gear[1] === 'nova')); out.shownRush = !shopLocked(list.find(i => i.gear[1] === 'rush'));
    return out;
  });
  ok('the smith sells two blades and three arts', r.names.join() === 'duskblade,lance,rush,rend,nova', r.names);
  ok('Soul Nova is locked behind 3 seals; Dusk Rush is open once you can dash', r.lockedNova === true && r.shownRush === true, r);
  // poor: cannot buy
  await ev(() => { DW.P.geo = 100; DW.G.menuSel = 0; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ geo: DW.P.geo, own: DW.Gear.owns('weapon', 'duskblade') }));
  ok('not enough geo: nothing bought', r.geo === 100 && r.own === false, r);
  await ev(() => { DW.P.geo = 2000; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ geo: DW.P.geo, own: DW.Gear.owns('weapon', 'duskblade'), cur: DW.Gear.weapon(), state: DW.G.state }));
  ok('buying the Duskblade costs 380 and equips it', r.geo === 1620 && r.own && r.cur === 'duskblade' && r.state === 'shop', r);
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => DW.P.geo); ok('a bought item cannot be bought again', r === 1620, r);
  await ev(() => { DW.G.menuSel = 4; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ geo: DW.P.geo, own: DW.Gear.hasArt('nova') })); ok('a locked item cannot be bought', r.geo === 1620 && !r.own, r);
  await ev(() => { DW.G.flags.boss_guardian = DW.G.flags.boss_spore = DW.G.flags.boss_weaver = true; DW.G.menuSel = 4; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ geo: DW.P.geo, own: DW.Gear.hasArt('nova'), state: DW.G.state }));
  ok('with 3 seals the Nova can be learned (1300) and a banner teaches it', r.geo === 320 && r.own && r.state === 'banner', r);
  await page.screenshot({ path: shot('nova_banner.png') });

  // ---------- NPC: who stands where
  r = await ev(() => {
    const { enterRoom, G } = DW; const out = {};
    for (const [room, shop] of [['town', ['smith', 'outfitter', 'merchant']], ['fr6', ['frost']], ['em6', ['ember']], ['sc6', ['storm']], ['mv6', ['mirror']]]) {
      enterRoom(room, { bench: true }); out[room] = G.npcs.map(n => n.shop || n.type);
    }
    return out;
  });
  ok('the town has a smith, an outfitter and the merchant', ['smith', 'outfitter', 'merchant'].every(s => r.town.includes(s)), r.town);
  ok('each area has a trader of its own', r.fr6.includes('frost') && r.em6.includes('ember') && r.sc6.includes('storm') && r.mv6.includes('mirror'), r);
  // talking to the smith opens the right shop
  await setup('town', 22, 17);
  await ev(() => { DW.G.state = 'play'; DW.P.vx = 0; });
  await page.keyboard.press('ArrowUp'); await ev(() => DW.step(3));
  r = await ev(() => ({ state: DW.G.state, id: DW.G.shopId, dlg: !!DW.G.dialog })); ok('Up beside the smith: a dialog', r.state === 'dialog' && r.id === 'smith', r);
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.state); ok('closing the dialog opens the smith\'s shop', r === 'shop', r);
  await page.screenshot({ path: shot('shop_smith.png') });

  // ---------- the equipment screen
  await setup();
  await ev(() => {
    const { Gear } = DW; for (const id of ['duskblade', 'lance', 'scythe']) Gear.give('weapon', id); for (const id of ['ironhide', 'soulveil']) Gear.give('cloak', id); Gear.give('art', 'rend'); Gear.give('art', 'rush');
    DW.G.state = 'pause'; DW.G.menuSel = 3;
  });
  r = await ev(() => pauseItems().map(i => i.id)); ok('the pause menu has an Equipment entry', r.includes('gear'), r);
  await ev(() => { DW.G.menuSel = pauseItems().findIndex(i => i.id === 'gear'); });
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => DW.G.state); ok('it opens the equipment screen', r === 'gear', r);
  await page.keyboard.press('ArrowDown'); await ev(() => DW.step(1)); await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => DW.Gear.weapon()); ok('selecting a blade and pressing Z equips it (second in the list: Duskblade)', r === 'duskblade', r);
  await page.screenshot({ path: shot('gear_weapons.png') });
  await page.keyboard.press('ArrowRight'); await ev(() => DW.step(1)); await page.keyboard.press('ArrowDown'); await ev(() => DW.step(1)); await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => DW.Gear.cloak()); ok('cloaks tab: Ironhide equipped', r === 'ironhide', r);
  await page.screenshot({ path: shot('gear_cloaks.png') });
  await page.keyboard.press('ArrowRight'); await ev(() => DW.step(1));
  await page.screenshot({ path: shot('gear_arts.png') });
  await page.keyboard.press('Escape'); await ev(() => DW.step(1));
  r = await ev(() => DW.G.state); ok('Esc returns to the pause menu', r === 'pause', r);

  // ---------- saving
  r = await ev(() => {
    const { G, Gear } = DW; G.bench = { room: 'town' }; saveGame();
    const saved = readSave().gear; Gear.reset(); const reset = Gear.weapon();
    Gear.load(saved);
    return { saved, reset, weapon: Gear.weapon(), cloak: Gear.cloak(), arts: ['rend', 'rush', 'nova'].map(a => Gear.hasArt(a)), owns: Gear.owns('weapon', 'scythe') };
  });
  ok('equipment survives a save and a load', r.reset === 'nail' && r.weapon === 'duskblade' && r.cloak === 'ironhide' && r.arts.join() === 'true,true,false' && r.owns === true, r);
  r = await ev(() => { DW.Gear.load({ w: ['nail', 'bogus'], c: [], a: ['rend', 'x'], cw: 'bogus', cc: 'bogus' }); return { w: DW.Gear.weapon(), c: DW.Gear.cloak(), arts: DW.Gear.hasArt('rend') }; });
  ok('a damaged save is read safely', r.w === 'nail' && r.c === 'drifter' && r.arts === true, r);
  r = await ev(() => { DW.Gear.load(undefined); return DW.Gear.weapon(); }); ok('an old save without gear loads the defaults', r === 'nail', r);

  // ---------- drawing: every weapon, both hero looks, every shop and the whole screen set
  r = await ev(() => {
    const { Gear, P, G } = DW; const out = [];
    for (const style of ['vector', 'blue']) {
      try { localStorage.setItem('duskwell_hero_style', style); } catch (e) { /* ignore */ }
      for (const id of Object.keys(Gear.WEAPONS)) for (const dir of ['side', 'up', 'down']) {
        Gear.reset(); Gear.give('weapon', id); Gear.equip('weapon', id); P.atkT = 0.1; P.atkDir = dir; P.atkCD = 0.2;
        try { DW.draw(); } catch (e) { out.push(style + ':' + id + ':' + dir + ':' + e.message); }
      }
    }
    for (const id of Object.keys(SHOPS)) { G.shopId = id; G.state = 'shop'; G.menuSel = 0; G.shopTop = 0; try { DW.draw(); } catch (e) { out.push('shop:' + id + ':' + e.message); } }
    G.state = 'play'; P.atkT = 0; Gear.reset();
    return out;
  });
  ok('every weapon swing and every shop draws without errors', r.length === 0, r);
  ok('no console errors during the test', errors.length === 0, errors.slice(0, 3));

  await browser.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})();
