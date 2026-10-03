// Captures game screens for the gallery (docs/gallery/screens/*.jpg): the bestiary, the equipment screen, a shop, the new areas,
// the four new bosses mid-fight and the three nail arts. Classic 2D lighting (fast); open with DW_GFX=2 DW_HTTP=1 for Lumen.
// usage: node tools/gallery_screens.js [out dir]
const fs = require('fs'), path = require('path');
const { open } = require('../tests/lib');
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'gallery', 'screens');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, errors } = await open();
  const ev = (f, a) => page.evaluate(f, a);
  const snap = async name => { await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 84 }); console.log('shot', name); };
  const room = (id, door, x, y) => ev(([id, door, x, y]) => {
    const { G, P, enterRoom, Charms, Gear } = DW; G.flags = {}; Charms.reset();
    enterRoom(id, door ? { door } : { pos: { x: x * 32, y: y * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.slowmo = 0; G.enemies = G.enemies.slice(); G.projs = [];
    P.invuln = 1e9; P.hp = P.maxHp = 9; P.soul = 99; P.dead = false; for (const k of Object.keys(P.ab)) P.ab[k] = k !== 'wail'; DW.step(40);
  }, [id, door, x, y]);
  // areas
  await room('os3', 'e'); await snap('area_ossuary');
  await room('lo3', 'w'); await snap('area_lunar');
  await room('lo2', 'w'); await snap('area_lunar_gravity');
  // bosses mid-fight
  const boss = (id, px, attack, phase) => ev(([id, px, attack, phase]) => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom(id, { door: id.startsWith('lo') ? 'w' : 'e' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; P.invuln = 1e9; P.hp = P.maxHp = 9; DW.step(5);
    P.x = px * 32; for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const b = G.boss, L = G.level; b.phase = phase; b.hp = b.maxHp * 0.9; G.projs = [];
    b.x = (L.pw / 2 + 170) - b.w / 2; b.y = (b.grav === false ? b.hoverY - b.h / 2 : G.floorY - b.h - 2); b.vx = b.vy = 0; b.face = -1;
    b.co = (function* () { yield* b[attack](); })();
    for (let i = 0; i < 60; i++) { P.x = L.pw / 2 - 160; P.y = G.floorY - P.h - 2; DW.step(1); }
  }, [id, px, attack, phase]);
  await boss('os4', 30, 'pillars', 1); await snap('boss_bonewright');
  await boss('os7', 36, 'hands', 2); await snap('boss_marrow');
  await boss('lo4', 12, 'rays', 2); await snap('boss_stargazer');
  await boss('lo7', 12, 'fullmoon', 1); await snap('boss_regent');
  await boss('lo7', 12, 'newmoon', 2); await ev(() => { DW.G.eclipse = 0.95; }); await snap('boss_regent_eclipse');
  // the arts
  await room('cx2', null, 12, 20);
  await ev(() => { const { G, P, Gear } = DW; for (const a of ['rend', 'rush', 'nova']) Gear.give('art', a); Gear.give('weapon', 'scythe'); Gear.equip('weapon', 'scythe'); G.enemies = []; for (const dx of [140, 260, -170]) { const e = new ENEMY_TYPES.crawler({ x: 0, y: 0 }); e.kind = 'crawler'; e.hp = 999; e.frozenT = 1e9; e.dmg = 0; e.x = P.cx + dx - e.w / 2; e.y = P.y + P.h - e.h; G.enemies.push(e); } });
  await page.keyboard.down('KeyX'); await ev(() => DW.step(48)); await snap('art_moon_rend_charge'); await page.keyboard.up('KeyX'); await ev(() => DW.step(5)); await snap('art_moon_rend');
  await ev(() => DW.step(60)); await ev(() => { DW.P.soul = 99; });
  await page.keyboard.down('KeyX'); await page.keyboard.press('KeyF'); await ev(() => DW.step(22)); await snap('art_soul_nova_gather'); await ev(() => DW.step(14)); await snap('art_soul_nova'); await page.keyboard.up('KeyX');
  // the screens
  await ev(() => { const { G, Gear } = DW; G.seen = {}; for (const b of BESTIARY) G.seen[(b.boss ? 'b:' : 'e:') + b.k] = true; G.state = 'bestiary'; G.bestSel = BESTIARY_INDEX['b:marrow']; });
  await snap('bestiary_marrow');
  await ev(() => { DW.G.bestSel = BESTIARY_INDEX['e:heap']; }); await snap('bestiary_heap');
  await ev(() => { DW.G.bestSel = BESTIARY_INDEX['b:regent']; }); await snap('bestiary_regent');
  await ev(() => { const { G, Gear } = DW; Gear.reset(); for (const id of ['duskblade', 'lance', 'scythe', 'cleaver']) Gear.give('weapon', id); for (const id of ['ironhide', 'emberweave', 'soulveil']) Gear.give('cloak', id); Gear.give('art', 'rend'); Gear.give('art', 'rush'); Gear.equip('weapon', 'duskblade'); Gear.equip('cloak', 'emberweave'); G.state = 'gear'; G.gearTab = 0; G.gearSel = 1; });
  await snap('equipment_weapons');
  await ev(() => { DW.G.gearTab = 1; DW.G.gearSel = 1; }); await snap('equipment_cloaks');
  await ev(() => { DW.G.gearTab = 2; DW.G.gearSel = 0; }); await snap('equipment_arts');
  await ev(() => { const { G, P } = DW; P.geo = 1700; G.shopId = 'smith'; G.state = 'shop'; G.menuSel = 0; G.shopTop = 0; }); await snap('shop_smith');
  await ev(() => { const { G } = DW; G.shopId = 'outfitter'; G.menuSel = 1; }); await snap('shop_outfitter');
  console.log(errors.join('|') || 'no page errors');
  await browser.close();
})();
