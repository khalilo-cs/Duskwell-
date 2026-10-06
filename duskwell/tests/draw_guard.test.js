// A drawing that fails must not break the picture. A boss drawing (the Storm Roc, whose pose list had one drawing while its settings asked for
// a second) once threw between save() and restore(), and the alpha it left on the layer of the hero and the creatures made them invisible for the
// rest of the game. Here: every pose setting points at a drawing that exists; every boss and every creature draws in every state without a throw and
// without leaving the canvas changed; Guard closes what a failing drawing left open; and in a real room (classic and Lumen) the hero is still drawn
// after a boss drawing fails and after the Storm Roc is hurt and dies.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  // ================================================================ classic lighting: data, sweeps, the guard
  let { browser, page, errors } = await open({ http: true, gfx: 0 });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 20000 });

  let r = await ev(() => {
    const bad = [];
    for (const key of Object.keys(BossPoses.CFG)) {
      const c = BossPoses.CFG[key], p = BOSS_POSES[key], need = [c.idle, c.hurt].concat(c.atk, c.intro != null ? [c.intro] : []);
      if (!p) bad.push(key + ': no poses'); else for (const i of need) if (!p[i]) bad.push(key + ': pose ' + i + ' of ' + p.length);
    }
    return { n: Object.keys(BossPoses.CFG).length, bad };
  });
  ok('every pose a boss setting names exists in its list (the Storm Roc had one drawing and asked for two)', r.n >= 16 && r.bad.length === 0, r);

  // every boss and every creature, in every state, on a scratch canvas
  r = await ev(() => {
    const { G, enterRoom } = DW; G.flags = {}; enterRoom('cx3', { door: 'l' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; DW.step(3);
    const c = document.createElement('canvas'); c.width = 960; c.height = 540; const g = c.getContext('2d'); Guard.track(g);
    const bad = [], seen = {}; let draws = 0;
    const check = (what, fn) => {
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; let err = null; draws++;
      try { fn(); } catch (e) { err = e.message; }
      const open = Guard.open(g), a = g.globalAlpha, op = g.globalCompositeOperation;
      Guard.unwind(g);
      if (err || open !== 0 || a !== 1 || op !== 'source-over') { const k = what.split('|')[1] + (err || 'state'); if (!seen[k]) { seen[k] = 1; bad.push(what.split('|')[0] + ' -> ' + (err || ('left open ' + open + ', alpha ' + a + ', op ' + op))); } }
    };
    for (const key of Object.keys(BOSS_TYPES)) {
      const b = new BOSS_TYPES[key]({ x: 20, y: 10 }); b.x = 480; b.y = 300; b.face = 1;
      const states = [
        ['intro', b => { b.state = 'intro'; b.introT = 2.4; }], ['intro late', b => { b.state = 'intro'; b.introT = 0.9; }], ['fight', b => { b.state = 'fight'; b.introT = 0; }],
        ['telegraph', b => { b.tele = 1; }], ['telegraph half', b => { b.tele = 0.5; }], ['melee', b => { b.tele = 0; b.melee = { ox: 10, oy: 10, w: 60, h: 40, dmg: 1, t: 0.2, face: 1 }; }],
        ['casting', b => { b.melee = null; b.casting = true; b.aimA = 0.5; }], ['stunned', b => { b.casting = false; b.stunned = true; }], ['hit flash', b => { b.stunned = false; b.flash = 0.1; }],
        ['dying start', b => { b.flash = 0; b.state = 'dying'; b.dyingT = 0.05; }], ['dying', b => { b.dyingT = 1; }], ['dying end', b => { b.dyingT = 2.15; }],
        ['ghostly', b => { b.state = 'fight'; b.ghostly = true; b.alpha = 0.3; }], ['facing left', b => { b.ghostly = false; b.alpha = 1; b.face = -1; }],
      ];
      let t = 100;
      for (const [name, set] of states) { set(b); for (let i = 0; i < 12; i++) { t += 1 / 60; check('boss ' + key + ' ' + name + '|' + key, () => Art.boss[key](g, b, t)); } }
    }
    for (const kind of Object.keys(ENEMY_TYPES)) {
      const e = new ENEMY_TYPES[kind]({ x: 20, y: 10 }); e.kind = kind; e.x = 480; e.y = 300; let t = 100;
      for (const st of Object.values(ST)) for (const extra of [{}, { flash: 0.1 }, { frozenT: 1 }, { face: -1 }, { dead: true }]) {
        Object.assign(e, { currentState: st, flash: 0, frozenT: 0, face: 1, dead: false }, extra);
        for (let i = 0; i < 3; i++) { t += 0.03; check('creature ' + kind + ' ' + st + ' ' + JSON.stringify(extra) + '|' + kind, () => { if (Art.enemy[kind]) Art.enemy[kind](g, e, t); if (e.frozenT > 0) Art.frozenFx(g, e, t); }); }
      }
    }
    return { bad, draws, bosses: Object.keys(BOSS_TYPES).length, kinds: Object.keys(ENEMY_TYPES).length };
  });
  ok('every boss and creature draws in every state without a throw and leaves the canvas as it was', r.bad.length === 0 && r.bosses >= 17 && r.kinds >= 25, r);

  // the guard itself
  r = await ev(() => {
    const c = document.createElement('canvas'); c.width = c.height = 50; const g = c.getContext('2d'); Guard.track(g);
    const out = {}; g.globalAlpha = 0.8; g.save(); g.save(); g.globalAlpha = 0; g.translate(10, 10); g.beginPath(); g.rect(0, 0, 2, 2); g.clip();
    out.open = Guard.open(g); Guard.unwind(g, 1); out.after1 = [Guard.open(g), g.globalAlpha];
    Guard.unwind(g); out.after0 = [Guard.open(g), g.globalAlpha];
    g.save(); g.globalAlpha = 0; let thrown = false; const errs = [];
    const old = console.error; console.error = m => errs.push(m);
    for (let i = 0; i < 5; i++) Guard.run(g, 'test drawing', () => { g.save(); g.globalAlpha = 0.1; g.translate(5, 5); throw new Error('boom'); });
    console.error = old;
    out.ran = [Guard.open(g), g.globalAlpha]; g.restore();
    g.fillStyle = '#f00'; g.fillRect(0, 0, 50, 50); out.px = Array.from(g.getImageData(25, 25, 1, 1).data);
    out.errs = errs;
    return out;
  });
  ok('Guard counts the states a drawing left open and closes them back to the level asked', r.open === 2 && r.after1[0] === 1 && r.after1[1] === 0.8 && r.after0[0] === 0 && r.after0[1] === 0.8, r);
  ok('Guard.run catches a failing drawing, restores the state it found, and tells once', r.ran[0] === 1 && r.ran[1] === 0 && r.errs.length === 1 && /boom/.test(r.errs[0]) && r.px[0] === 255, r);
  ok('no page errors in the sweeps', errors.length === 0, errors.slice(0, 3));

  // ---- a boss drawing that leaks and throws, in a real room: the hero is still drawn and the canvas is clean
  r = await ev(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; Charms.reset(); enterRoom('cx3', { door: 'l' }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.toast = null; P.invuln = 1e9; DW.step(5);
    P.x = 12 * 32; DW.step(1); for (let i = 0; i < 400 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    const out = { boss: !!G.boss };
    const g = G.g, px = () => { const x = Math.round((P.cx - G.cam.x) * G.zoomNow * G.k), y = Math.round((P.cy - G.cam.y) * G.zoomNow * G.k), r = Math.round(30 * G.k); return { x: Math.max(0, x - r), y: Math.max(0, y - r), w: 2 * r, h: 2 * r }; };
    const sig = () => { const b = px(), d = g.getImageData(b.x, b.y, b.w, b.h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] + 3 * d[i + 1] + 7 * d[i + 2]) % 1000003; return s; };
    DW.draw(); const withHero = sig();
    const keepPlayer = Art.drawPlayer; Art.drawPlayer = () => {}; DW.draw(); const without = sig(); Art.drawPlayer = keepPlayer;
    out.heroShows = withHero !== without;
    const keepBoss = Art.boss.guardian, errs = []; const oe = console.error; console.error = m => errs.push(String(m));
    Art.boss.guardian = (gg) => { gg.save(); gg.globalAlpha = 0; gg.translate(9999, 9999); throw new Error('injected'); };
    for (let i = 0; i < 6; i++) DW.draw();
    out.afterFail = [Guard.open(g), g.globalAlpha];
    out.stillShows = sig() !== without;
    console.error = oe; Art.boss.guardian = keepBoss; out.errs = errs;
    return out;
  });
  ok('a boss drawing that leaks the alpha and throws does not hide the hero (classic), and is told once', r.boss && r.heroShows && r.stillShows && r.afterFail[0] === 0 && r.afterFail[1] === 1 && r.errs.length === 1 && /guardian: injected/.test(r.errs[0]), r);
  await browser.close();

  // ================================================================ Lumen: the Storm Roc, hurt and dying, and a leaking drawing
  ({ browser, page, errors } = await open({ http: true, gfx: 2 }));
  const ev2 = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready(), null, { timeout: 20000 });
  const heroPx = () => ev2(() => {
    DW.draw(); const { G, P } = DW; if (!Lumen.usable()) return -1;
    const [sc, ec] = Lumen.layers(), g = ec.getContext('2d'), S = ec.width / 960;
    const x = Math.round((P.cx - G.cam.x) * G.zoomNow * S), y = Math.round((P.cy - G.cam.y) * G.zoomNow * S), r = Math.round(40 * S);
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), w = Math.min(ec.width - x0, 2 * r), h = Math.min(ec.height - y0, 2 * r);
    const d = g.getImageData(x0, y0, w, h).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n;
  });
  r = await ev2(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; Charms.reset(); P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    const d = WORLD.rooms.sc7; enterRoom('sc7', { door: d.doors[0].id }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null; G.toast = null; P.invuln = 1e9; P.hp = P.maxHp = 9; P.nail = 5; DW.step(5);
    P.x = (d.arena.trigger + 3) * 32; DW.step(1); for (let i = 0; i < 600 && !(G.boss && G.boss.state === 'fight'); i++) DW.step(1);
    return { boss: G.boss && G.boss.bossKey, lumen: Lumen.usable() };
  });
  ok('the Storm Roc hall opens in Lumen with the fight on', r.boss === 'roc' && r.lumen, r);
  let n0 = await heroPx();
  ok('the hero is drawn before the Roc is hurt', n0 > 30, n0);
  await ev2(() => { const b = DW.G.boss; b.invul = false; b.stunned = true; DW.step(6); });
  const nHurt = await heroPx();
  ok('and while the Roc is stunned (its hurt pose)', nHurt > 30, nHurt);
  await ev2(() => { const { G } = DW; const b = G.boss; b.stunned = false; b.hp = 1; G.projs = []; b.hurt(5, 1, 'side'); DW.step(40); });
  const nDying = await heroPx();
  ok('and while it dies', nDying > 30, nDying);
  await ev2(() => { DW.step(200); });
  const nAfter = await heroPx();
  r = await ev2(() => { const { G } = DW; const [sc, ec] = Lumen.layers(), g = ec.getContext('2d'); return { won: G.arena.state, open: Guard.open(g), alpha: g.globalAlpha, op: g.globalCompositeOperation }; });
  ok('and after the Roc is gone: the hero is there, the entity layer is clean', r.won === 'won' && nAfter > 30 && r.open === 0 && r.alpha === 1 && r.op === 'source-over', [r, nAfter]);
  // a leaking, failing drawing: the next frames are clean
  r = await ev2(() => {
    const keep = Art.drawPlayer, errs = []; const oe = console.error; console.error = m => errs.push(String(m));
    const ge = Lumen.layers()[1].getContext('2d');
    const e = new BOSS_TYPES.guardian({ x: 5, y: 5 }); e.kind = 'x'; e.state = 'fight'; DW.G.enemies.push(e);
    const keepB = Art.boss.guardian; Art.boss.guardian = g => { g.save(); g.globalAlpha = 0; throw new Error('injected'); };
    for (let i = 0; i < 3; i++) DW.draw();
    const out = { open: Guard.open(ge), alpha: ge.globalAlpha, errs };
    Art.boss.guardian = keepB; DW.G.enemies.pop(); console.error = oe; return out;
  });
  const nLeak = await heroPx();
  ok('a leaking, failing boss drawing leaves the Lumen entity layer clean and the hero visible', r.open === 0 && r.alpha === 1 && r.errs.length === 1 && nLeak > 30, [r, nLeak]);
  ok('no page errors in Lumen', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
