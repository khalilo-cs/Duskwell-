// The feel of moving, kept close to the way a Hollow-Knight-like game plays (no picture or sound of that game is used, only the feel).
// The hero: top speed in a few frames, a stop in a few pixels, a quick turn, a short hop and a full jump of about three and a half tiles, a heavier fall, a
// dash of about five tiles; a run whose legs keep pace with the ground; dust at the first step, at a turn, in a run and after a fall.
// The creatures: a steady pace, a stop and a look round at a ledge before they turn, a stop to face the hero when they first see them, a rest after a leap.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  const ev = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => FxArt.ready() && AnimArt.ready(), null, { timeout: 20000 });

  // ---- the hero, on real physics with scripted keys
  let r = await ev(() => {
    const { G, P, enterRoom } = DW; Diff.setMode('normal'); Charms.reset(); Powers.reset(); G.flags = {};
    enterRoom('cx2', { door: WORLD.rooms.cx2.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.enemies = []; G.projs = []; P.invuln = 1e9;
    P.ab = { dash: true, wall: true, double: true, dive: true, superdash: false, wail: false };
    const held = {}, edge = {}, sv = { down: Input.down, pressed: Input.pressed, released: Input.released, axisX: Input.axisX, axisY: Input.axisY };
    Input.down = a => !!held[a]; Input.pressed = a => !!edge[a]; Input.released = () => false; Input.axisX = () => (held.right ? 1 : 0) - (held.left ? 1 : 0); Input.axisY = () => 0;
    const DT = 1 / 60, out = {}, clear = () => { for (const k in held) delete held[k]; for (const k in edge) delete edge[k]; };
    const step = () => { P.update(DT); for (const k in edge) delete edge[k]; };
    const reset = () => { clear(); P.place(P.cx, P.y + P.h, 1); P.invuln = 1e9; for (let i = 0; i < 20; i++) step(); };
    P.place(10 * 32, 19 * 32, 1); for (let i = 0; i < 30; i++) step();
    clear(); held.right = true; let v95 = 0; for (let i = 0; i < 60; i++) { step(); if (!v95 && P.vx >= 0.95 * 250) v95 = (i + 1) * DT; } out.timeTo95 = v95; out.top = P.vx;
    clear(); const xs = P.x; let stop = 0; for (let i = 0; i < 60; i++) { step(); if (Math.abs(P.vx) < 1 && !stop) stop = (i + 1) * DT; } out.stopTime = stop; out.stopDist = P.x - xs;
    reset(); held.right = true; for (let i = 0; i < 40; i++) step(); clear(); held.left = true; let rv = 0; for (let i = 0; i < 40; i++) { step(); if (!rv && P.vx <= -0.95 * 250) rv = (i + 1) * DT; } out.turnTime = rv;
    const jump = hold => { reset(); const y0 = P.y; let top = y0; clear(); edge.jump = true; held.jump = true; for (let i = 0; i < 200; i++) { if (i >= hold) delete held.jump; step(); if (P.y < top) top = P.y; if (i > 3 && P.onGround) break; } return (y0 - top) / 32; };
    out.hop = jump(1); out.full = jump(60);
    reset(); P.place(P.cx, 3 * 32, 1); let vmax = 0; for (let i = 0; i < 120 && !P.onGround; i++) { step(); vmax = Math.max(vmax, P.vy); } out.fall = vmax;
    reset(); clear(); held.right = true; edge.dash = true; const xd = P.x; for (let i = 0; i < 30; i++) step(); out.dash = (P.x - xd) / 32;
    Object.assign(Input, sv); return out;
  });
  ok('the hero reaches top speed in a few frames (and it is about eight tiles a second), stops at once in a few pixels, and reverses in under a fifth of a second', r.timeTo95 <= 0.1 && r.top >= 245 && r.top / 32 > 7.5 && r.stopTime <= 0.1 && r.stopDist < 8 && r.turnTime <= 0.2, r);
  ok('a tap is a short hop of about a tile and a half; a held jump rises about three and a half tiles (what the rooms were built for)', r.hop > 1.2 && r.hop < 1.7 && r.full > 3.3 && r.full < 3.9, [r.hop, r.full]);
  ok('the fall is heavy (it ends at 900 px a second) and the dash covers five to seven tiles', r.fall >= 800 && r.fall <= 950 && r.dash > 5 && r.dash < 8, [r.fall, r.dash]);

  // ---- the run keeps pace with the ground: a stride (nine frames) is about two body heights
  r = await ev(() => {
    const { P } = DW, A = HERO_FRAMES.run, seen = []; const p = { cx: 100, onGround: true, vx: 250, vy: 0, atkT: 0, hurtT: 0, dashT: 0, sitting: null, face: 1, hits: new Set(), djAvail: true, novaT: 0, rushT: 0, castT: 0, wailT: 0, focusT: 0, rendHold: false, sliding: false, diving: false, landT: 0, atkDir: 'side', atkAlt: 0, ab: P.ab };
    HeroFrames.S.x = null; HeroFrames.S.dist = 0; let last = -1, changes = [], d0 = 0;
    for (let i = 0; i < 400; i++) { p.cx += 4.2; const f = HeroFrames.pick(p, i / 60).f, k = A.indexOf(f); if (k !== last) { changes.push(Math.round(HeroFrames.S.dist - d0)); d0 = HeroFrames.S.dist; last = k; } }
    const steps = changes.slice(3, 40); const avg = steps.reduce((a, b) => a + b, 0) / steps.length;
    return { frames: A.length, step: +avg.toFixed(1), stride: +(avg * A.length).toFixed(0), bodies: +(avg * A.length / 62).toFixed(2) };
  });
  ok('a stride of the run (its nine frames) is about 110 px, nearly two body heights, not a blur of legs', r.frames === 9 && r.stride >= 100 && r.stride <= 125 && r.bodies >= 1.6 && r.bodies <= 2.1, r);

  // ---- dust
  r = await ev(() => {
    const { G, P, enterRoom } = DW; G.flags = {}; enterRoom('cx2', { door: WORLD.rooms.cx2.doors[0].id }); G.state = 'play'; G.trans = null; G.fadeA = 0; G.enemies = []; P.invuln = 1e9;
    const held = {}, edge = {}, sv = { down: Input.down, pressed: Input.pressed, released: Input.released, axisX: Input.axisX, axisY: Input.axisY };
    Input.down = a => !!held[a]; Input.pressed = a => !!edge[a]; Input.released = () => false; Input.axisX = () => (held.right ? 1 : 0) - (held.left ? 1 : 0); Input.axisY = () => 0;
    const DT = 1 / 60, calls = []; const od = G.dust; G.dust = (x, y, dir, n, o) => { calls.push({ n, dir, k: (o && o.k) || 1 }); return od(x, y, dir, n, o); };
    const step = () => { P.update(DT); for (const k in edge) delete edge[k]; };
    P.place(10 * 32, 19 * 32, 1); for (let i = 0; i < 30; i++) step(); calls.length = 0;
    const out = {};
    held.right = true; for (let i = 0; i < 6; i++) step(); out.start = calls.reduce((a, c) => a + c.n, 0); calls.length = 0;           // the first steps
    for (let i = 0; i < 60; i++) step(); out.run = calls.length; calls.length = 0;                                                       // a second of running
    delete held.right; held.left = true; for (let i = 0; i < 6; i++) step(); out.turn = calls.filter(c => c.n >= 5).length; delete held.left; calls.length = 0;
    for (let i = 0; i < 30; i++) step(); calls.length = 0;
    P.place(P.cx, 3 * 32, 1); for (let i = 0; i < 200 && !P.onGround; i++) step(); out.landing = calls.reduce((a, c) => a + c.n, 0); out.landSides = new Set(calls.map(c => c.dir)).size;
    calls.length = 0; P.place(P.cx, P.y + P.h - 6, 1); for (let i = 0; i < 100 && !P.onGround; i++) step(); out.soft = calls.reduce((a, c) => a + c.n, 0);
    G.dust = od; Object.assign(Input, sv); return out;
  });
  ok('dust: a kick at the first steps, a puff every stride of a run, a skid at a turn, a big puff to both sides after a long fall and none after a hop', r.start >= 3 && r.run >= 5 && r.turn >= 1 && r.landing >= 6 && r.landSides === 2 && r.soft === 0, r);

  // ---- the creatures
  const arena = () => ev(() => {
    const { G, P, enterRoom } = DW; Charms.reset(); G.flags = {}; Diff.setMode('normal');
    enterRoom('cx1', { pos: { x: 6 * 32 + 16, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    const L = G.level; for (let y = 8; y < 34; y++) for (let x = 2; x < L.w - 2; x++) L.t[y * L.w + x] = T_AIR;
    for (let y = 30; y < 33; y++) for (let x = 10; x < 26; x++) L.t[y * L.w + x] = T_SOLID;                       // an island of floor, its top at row 30
    G.enemies = []; G.projs = []; G.fx = []; P.invuln = 1e9; P.hp = P.maxHp = 5; P.dead = false; P.sitting = null; DW.step(10);
  });
  await arena();
  r = await ev(() => {
    const { G, P } = DW; P.place(6 * 32 + 16, 40 * 32, 1);
    const e = new ENEMY_TYPES.crawler({ type: 'crawler', x: 21, y: 29, face: 1 }); e.kind = 'crawler'; G.enemies.push(e);
    const x0 = e.cx; let pauses = [], cur = null, flips = 0, lastFace = e.face, minY = e.y, maxX = e.cx, minX = e.cx, fell = false;
    for (let i = 0; i < 1100; i++) {
      DW.step(1);
      if (e.y > 30 * 32) fell = true;
      maxX = Math.max(maxX, e.cx); minX = Math.min(minX, e.cx);
      const still = e.onGround && Math.abs(e.vx) < 1;
      if (still) { cur = cur || { f0: e.face, n: 0 }; cur.n++; } else if (cur) { pauses.push({ sec: +(cur.n / 60).toFixed(2), flipped: e.face !== cur.f0 }); cur = null; }
      if (e.face !== lastFace) flips++; lastFace = e.face;
    }
    return { pauses: pauses.slice(0, 6), flips, fell, span: Math.round(maxX - minX) };
  });
  const turns = r.pauses.filter(p => p.sec >= 0.15);
  ok('a crawler walks steadily along its floor and at each ledge stops about a quarter of a second, then turns and goes back, and never walks off', turns.length >= 2 && turns.every(p => p.sec >= 0.18 && p.sec <= 0.35 && p.flipped) && !r.fell && r.span > 200, r);

  await arena();
  r = await ev(() => {
    const { G, P } = DW; P.place(22 * 32 + 16, 30 * 32, 1);
    const e = new ENEMY_TYPES.husk({ type: 'husk', x: 14, y: 29, face: -1 }); e.kind = 'husk'; G.enemies.push(e);
    let noticeAt = -1, stillN = 0, faceOk = null, moved = false, states = [];
    for (let i = 0; i < 90; i++) {
      DW.step(1);
      if (noticeAt < 0 && e.currentState === ST.CHASE) { noticeAt = i; faceOk = e.face === 1; }
      if (noticeAt >= 0 && !moved) { if (Math.abs(e.vx) < 1) stillN++; else moved = true; }
    }
    return { notice: noticeAt >= 0, stillSec: +(stillN / 60).toFixed(2), faceOk };
  });
  ok('a husk that first sees the hero stops a moment and turns to face them, then comes', r.notice && r.faceOk && r.stillSec >= 0.25 && r.stillSec <= 0.4, r);
  r = await ev(() => {
    const { G, P } = DW; G.enemies = []; P.place(19 * 32 + 16, 30 * 32, 1);
    const e = new ENEMY_TYPES.husk({ type: 'husk', x: 14, y: 29, face: 1 }); e.kind = 'husk'; G.enemies.push(e);
    let leapt = false, landed = -1, rest = 0, seenAtk = false;
    for (let i = 0; i < 500; i++) {
      DW.step(1);
      if (e.currentState === ST.ATTACK) seenAtk = true;
      if (seenAtk && landed < 0 && e.currentState === ST.CHASE) landed = i;
      if (landed >= 0 && i >= landed && i < landed + 60) { if (Math.abs(e.vx) < 1 && e.onGround) rest++; }
    }
    return { leapt: seenAtk, rest: +(rest / 60).toFixed(2) };
  });
  ok('after a leap a husk lands and stands a moment (a chance to strike it) before it comes on again', r.leapt && r.rest >= 0.28 && r.rest <= 0.5, r);
  await arena();
  r = await ev(() => {
    const { G, P } = DW; G.enemies = []; P.place(22 * 32 + 16, 30 * 32, 1);
    const e = new ENEMY_TYPES.husk({ type: 'husk', x: 14, y: 29, face: -1 }); e.kind = 'husk'; G.enemies.push(e);
    for (let i = 0; i < 4; i++) DW.step(1);
    const held = e.holdT > 0; e.hurt(1, 1, 'side'); DW.step(2);
    return { held, vx: Math.round(e.vx), holdAfter: e.holdT };
  });
  ok('a blow ends the pause: a creature that is struck while it stands still is thrown back at once', r.held && Math.abs(r.vx) > 50 && r.holdAfter <= 0, r);
  r = await ev(() => {
    const e1 = new ENEMY_TYPES.husk({ type: 'husk', x: 14, y: 29, face: -1 }), e2 = new ENEMY_TYPES.husk({ type: 'husk', x: 14, y: 29, face: -1 });
    e1.tempo = 1; e2.tempo = 1.25; e1.hold(0.3); e2.hold(0.3); return { slow: +e1.holdT.toFixed(3), quick: +e2.holdT.toFixed(3) };
  });
  ok('the deeper creatures are quicker about their pauses', r.quick < r.slow * 0.9, r);

  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
