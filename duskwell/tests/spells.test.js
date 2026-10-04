// Dusk Cry (Up + cast), the cracked soul vessel and the camera look up / down.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open();
  const ev = f => page.evaluate(f);
  const setup = room => page.evaluate(room => {
    const { G, P, enterRoom, Charms } = DW;
    Charms.reset(); G.flags = {}; G.shade = null;
    enterRoom(room[0], { pos: { x: room[1] * 32, y: room[2] * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; G.geos = [];
    P.invuln = 1e9; P.hp = P.maxHp = 5; P.soul = 99; P.dead = false; P.sitting = null; P.face = 1;
    for (const k of Object.keys(P.ab)) P.ab[k] = k !== 'wail';
    DW.step(30);
  }, room);

  // ---------- Dusk Cry
  await setup(['cx2', 12, 20]);
  await ev(() => {
    const { G, P } = DW; const e = new ENEMY_TYPES.flyer({ x: 12, y: 15 }); e.kind = 'flyer'; e.hp = 300; e.x = P.cx - e.w / 2; e.y = P.y - 110; G.enemies.push(e); P.ab.wail = false;
  });
  await page.keyboard.down('ArrowUp'); await page.keyboard.press('KeyF'); await ev(() => DW.step(5)); await page.keyboard.up('ArrowUp');
  let r = await ev(() => ({ wailT: DW.P.wailT, soul: DW.P.soul, hp: DW.G.enemies[0].hp }));
  ok('without the ability Up+F does not cry', r.wailT === 0, r);
  await ev(() => { DW.P.ab.wail = true; DW.P.soul = 99; DW.step(40); });
  const y0 = await ev(() => DW.P.y);
  await page.keyboard.down('ArrowUp'); await page.keyboard.press('KeyF'); await ev(() => DW.step(3));
  r = await ev(() => ({ wailT: DW.P.wailT, vy: DW.P.vy, soul: DW.P.soul, top: DW.P.wailTop, y: DW.P.y }));
  ok('the cry starts: hovering, soul spent', r.wailT > 0 && r.vy === 0 && r.soul <= 66 + 2, r);
  await page.waitForTimeout(100); await page.screenshot({ path: shot('wail.png') });
  await ev(() => DW.step(110)); await page.keyboard.up('ArrowUp');
  r = await ev(() => ({ wailT: DW.P.wailT, hp: DW.G.enemies[0] ? DW.G.enemies[0].hp : null, y: DW.P.y }));
  ok('the column struck the enemy five times (5 x 6)', r.hp === 300 - 30, r);
  ok('the cry ends and the hero stays put', r.wailT === 0 && Math.abs(r.y - y0) < 4, r);
  // no soul, no cry
  await ev(() => { DW.P.soul = 10; });
  await page.keyboard.down('ArrowUp'); await page.keyboard.press('KeyF'); await ev(() => DW.step(3)); await page.keyboard.up('ArrowUp');
  r = await ev(() => DW.P.wailT); ok('not enough soul: no cry', r === 0, r);
  // the column stops at a ceiling (cx2 ceiling is row 0): top never above the room
  await ev(() => { DW.P.soul = 99; });
  await page.keyboard.down('ArrowUp'); await page.keyboard.press('KeyF'); await ev(() => DW.step(3)); await page.keyboard.up('ArrowUp');
  r = await ev(() => DW.P.wailTop); ok('column stops at the ceiling', r >= 32, r);

  // ---------- the scroll in the shop
  await setup(['cx2', 12, 20]);
  r = await ev(() => { const { G, P } = DW; P.geo = 2000; G.state = 'shop'; G.shopTop = 0; G.menuSel = shopList().findIndex(i => i.id === 'buy_wail'); return G.menuSel; });
  await page.keyboard.press('Enter'); await ev(() => DW.step(1));
  r = await ev(() => ({ wail: DW.P.ab.wail, geo: DW.P.geo, state: DW.G.state }));
  ok('the merchant sells the Cry Scroll for 900', r.wail === true && r.geo === 1100 && r.state === 'banner', r);

  // ---------- the cracked soul vessel
  await setup(['cx2', 12, 20]);
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    P.soul = 250; G.shade = { room: 'cx2', x: 100, y: 600, geo: 40 }; DW.step(2); out.capped = [P.maxSoul, P.soul];
    P.soul = 190; P.gainSoul(40); DW.step(1); out.stays = P.soul;
    G.shade = null; DW.step(2); out.freed = P.maxSoul;
    return out;
  });
  ok('with a shade out there the soul vessel holds only 198 (two thirds of 297)', r.capped[0] === 198 && r.capped[1] === 198 && r.stays === 198, r);
  ok('recovering the shade restores 297', r.freed === 297, r);
  await ev(() => { DW.G.shade = { room: 'cx2', x: 100, y: 600, geo: 40 }; DW.step(2); });
  await page.waitForTimeout(150); await page.screenshot({ path: shot('soul_cracked.png'), clip: { x: 0, y: 0, width: 400, height: 160 } });

  // ---------- look down / up
  await setup(['cx4', 6, 28]);
  await ev(() => { DW.G.shade = null; DW.P.y = 27 * 32 - 38 + 32 - 32; DW.step(60); });
  const base = await ev(() => ({ cam: DW.G.cam.y, look: DW.G.look, ground: DW.P.onGround }));
  await page.keyboard.down('ArrowDown'); await ev(() => DW.step(150)); 
  const down = await ev(() => ({ cam: DW.G.cam.y, look: DW.G.look }));
  await page.keyboard.up('ArrowDown'); await ev(() => DW.step(120));
  const back = await ev(() => ({ cam: DW.G.cam.y, look: DW.G.look }));
  ok('standing on the ground', base.ground, base);
  ok('holding Down looks down', down.look > 100 && down.cam > base.cam + 20 || down.look > 100 && down.cam >= base.cam, [base, down]);
  ok('letting go brings the camera back', Math.abs(back.look) < 5, back);
  await ev(() => DW.step(1));
  await page.keyboard.down('ArrowUp'); await ev(() => DW.step(150));
  const up = await ev(() => ({ cam: DW.G.cam.y, look: DW.G.look }));
  await page.keyboard.up('ArrowUp');
  ok('holding Up looks up', up.look < -100 && up.cam < back.cam - 20, [back, up]);
  // moving cancels the look
  await page.keyboard.down('ArrowDown'); await ev(() => DW.step(60));
  await page.keyboard.down('ArrowRight'); await ev(() => DW.step(40));
  const mv = await ev(() => DW.G.look); await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown');
  ok('walking cancels looking down', Math.abs(mv) < 40, mv);

  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
