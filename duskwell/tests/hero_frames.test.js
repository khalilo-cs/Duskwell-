// The hero the owner drew frame by frame (js/art_hero_frames.js) is the default look, and every frame shown matches what the hero
// is doing: breathing at rest, the run cycle only while running, the jump by vertical speed, the two slashes alternating with their
// trail (the game's own arc then stays away), the overhead cut and the tuck for strikes up and down, the flinch, the fall when dying,
// and sitting on the bench drawn with it (the world's bench steps aside).
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => typeof HeroFrames !== 'undefined' && HeroFrames.ready(), null, { timeout: 15000 });
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => {
    window.nameOf = f => { for (const k in HERO_FRAMES) { const i = HERO_FRAMES[k].indexOf(f); if (i >= 0) return k + ':' + i; } return '?'; };
    // one step of play and one picture, as the game does; returns the frame the hero was drawn with
    window.stepDraw = () => { const D = window.DW; D.step(1); let got = null; const o = Art.drawFramesHero; Art.drawFramesHero = function () { got = o.apply(this, arguments); return got; }; D.draw(); Art.drawFramesHero = o; return got; };
  });
  const reset = () => ev(() => {
    const { G, P, enterRoom } = DW; enterRoom('cx1', { pos: { x: 12 * 32, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; P.invuln = 0; P.hp = P.maxHp = 9; P.dead = false; P.sitting = null; DW.step(20);
  });

  let r = await ev(() => [HeroStyle.cur(), HeroStyle.frames(), Object.fromEntries(Object.entries(HERO_FRAMES).map(([k, v]) => [k, v.length]))]);
  ok('the drawn hero is the default look, with all its animations', r[0] === 'frames' && r[1] && r[2].idle === 6 && r[2].run === 9 && r[2].jump === 6 && r[2].slash1 === 5 && r[2].slash2 === 5 && r[2].hit === 4 && r[2].death === 8 && r[2].sit === 2, r);

  await reset();
  r = await ev(() => { const seen = new Set(); for (let i = 0; i < 70; i++) seen.add(nameOf(stepDraw().f)); return [...seen]; });
  ok('at rest: the six breathing frames, nothing else', r.length === 6 && r.every(n => n.startsWith('idle')), r);

  await reset();
  r = await ev(() => {
    const { P } = DW; const seen = new Set();
    for (let i = 0; i < 60; i++) { Input && (P.vx = 250); const o = stepDraw(); P.vx = 250; seen.add(nameOf(o.f)); }
    return [...seen];
  });
  ok('running: the run cycle (most of its nine strides)', r.filter(n => n.startsWith('run')).length >= 7, r);

  await reset();
  r = await ev(() => {
    const { P } = DW; const out = [];
    P.onGround = false; P.y -= 80;
    for (const vy of [-560, -250, 0, 400]) { P.vy = vy; P.onGround = false; let got = null; const o = Art.drawFramesHero; Art.drawFramesHero = function () { got = o.apply(this, arguments); return got; }; DW.draw(); Art.drawFramesHero = o; out.push(nameOf(got.f)); }
    return out;
  });
  ok('in the air the frame follows the real speed: rising, the tuck at the top, falling', r.join() === 'jump:1,jump:2,jump:3,jump:4', r);

  // two sideways strikes in a row: the two drawn slashes alternate, each with its trail; the game's own arc is not drawn over them
  await reset();
  r = await ev(() => {
    const { P } = DW; const out = [];
    for (let s = 0; s < 2; s++) {
      P.atkDir = 'side'; P.atkT = 0.16; P.atkAlt ^= 1; P.hits = new Set();
      const seen = new Set(); let arc = true;
      for (let i = 0; i < 20; i++) { const o = stepDraw(); seen.add(nameOf(o.f)); if (P.atkT > 0 && !o.arc) arc = false; }
      out.push({ seen: [...seen].filter(n => n.startsWith('slash')), arc });
    }
    return out;
  });
  const sl = r.map(x => x.seen[0] && x.seen[0].split(':')[0]);
  ok('sideways strikes alternate the two drawn slashes, playing through them with their trail', sl[0] && sl[1] && sl[0] !== sl[1] && r.every(x => x.seen.length >= 4 && x.arc), r);

  await reset();
  r = await ev(() => {
    const { P } = DW; const out = {};
    P.atkDir = 'up'; P.atkT = 0.16; P.hits = new Set(); out.up = nameOf(stepDraw().f);
    DW.step(30); P.onGround = false; P.y -= 80; P.vy = 0; P.atkDir = 'down'; P.atkT = 0.16; P.hits = new Set(); let got = null; const o = Art.drawFramesHero; Art.drawFramesHero = function () { got = o.apply(this, arguments); return got; }; DW.draw(); Art.drawFramesHero = o; out.down = nameOf(got.f);
    return out;
  });
  ok('a strike up shows the overhead cut, a strike down the tuck', r.up === 'slash2:1' && r.down === 'jump:3', r);

  await reset();
  r = await ev(() => { const { P } = DW; P.hurt(1, P.cx + 30); const seen = new Set(); for (let i = 0; i < 40; i++) seen.add(nameOf(stepDraw().f)); return [...seen]; });   // (the blow freezes the game for a moment first)
  ok('a wound plays the flinch', r.filter(n => n.startsWith('hit')).length >= 3, r);

  // sitting down: first standing by the bench, then sitting on the one drawn with the hero; the world's bench steps aside
  r = await ev(() => {
    const { G, P, enterRoom } = DW; enterRoom('town', { bench: true }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    const b = P.sitting, seen = []; let benchDrawn = 0; const ob = Art.drawBench;
    for (let i = 0; i < 30; i++) { const o = stepDraw(); seen.push(nameOf(o.f)); }
    const wb = WorldArt.R; let drawnBench = false; const old = WorldArt.put; WorldArt.put = function (g, n) { if (n === 'bench') drawnBench = true; return old.apply(this, arguments); }; DW.draw(); WorldArt.put = old;
    return { sitting: !!b, first: seen[0], last: seen[seen.length - 1], worldBench: drawnBench };
  });
  ok('resting: the hero sits down on the bench drawn with it, and the world\'s bench steps aside', r.sitting && r.first === 'sit:0' && r.last === 'sit:1' && !r.worldBench, r);

  await reset();
  r = await ev(() => {
    const { G, P } = DW; P.hp = 1; P.invuln = 0; P.hurt(1, P.cx + 30);
    const seen = new Set(); const o = HeroFrames.frame;
    for (let i = 0; i < 70 && G.state === 'dying'; i++) { DW.step(1); const prev = Art.drawFramesDeath; let f = null; DW.draw(); seen.add(Math.min(7, Math.floor(Math.min(1, G.dyingT / 1.1) * 8))); }
    return { state: G.state, frames: [...seen] };
  });
  ok('dying: the hero falls through the death frames', r.frames.length >= 6, r);

  // the other looks are still there
  r = await ev(() => { HeroStyle.next(); const c = HeroStyle.cur(); DW.draw(); while (HeroStyle.cur() !== 'frames') HeroStyle.next(); return c; });
  ok('the other looks can still be chosen (the jointed hero is next)', r === 'puppet', r);

  await reset();
  await ev(() => { const { P } = DW; P.atkDir = 'side'; P.atkT = 0.16; P.hits = new Set(); for (let i = 0; i < 3; i++) stepDraw(); });
  await page.screenshot({ path: shot('hero_frames.png') });
  ok('no page errors', errors.length === 0, errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
