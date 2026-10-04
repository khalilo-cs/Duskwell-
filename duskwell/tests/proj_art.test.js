// Projectile and explosion art (js/art_projectiles.js): each shot is drawn from its frames, a dying shot leaves its ending,
// bombs burst in the drawn explosion, missing colours are made by turning the hue, other shots keep their old drawing.
const { open, shot } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
(async () => {
  const { browser, page, errors } = await open({ http: true });
  await page.waitForFunction(() => typeof ProjArt !== 'undefined' && ProjArt.ready(), null, { timeout: 15000 });
  const ev = (f, a) => page.evaluate(f, a);
  const arena = () => ev(() => {
    const { G, P, enterRoom, Charms } = DW; Charms.reset(); G.flags = {};
    enterRoom('cx1', { pos: { x: 6 * 32 + 16, y: 40 * 32 } }); G.state = 'play'; G.areaBanner = null; G.fadeA = 0; G.trans = null;
    G.enemies = []; G.projs = []; G.geos = []; G.fx = []; P.invuln = 1e9; P.hp = P.maxHp = 5; P.dead = false; P.sitting = null; DW.step(20);
    window.seenNow = () => Object.assign({}, ProjArt.seen);
    window.newFrames = (before) => { const out = {}; for (const [k, v] of Object.entries(ProjArt.seen)) if (v > (before[k] || 0)) out[k] = v - (before[k] || 0); return out; };
    window.go = n => { for (let i = 0; i < n; i++) { DW.step(1); DW.draw(); } };
  });
  await arena();

  let r = await ev(() => Object.entries(ProjArt.FRAMES()).map(([k, v]) => k + ':' + v.length).join(' '));
  ok('eight rows of eight frames', r === 'ice:8 rock:8 void:8 acid:8 fire:8 bolt:8 bone:8 meteor:8', r);

  // a shot, flown for n steps; what it drew, its ending, and the ending's frames
  const fly = (o, n, kill) => ev(([o, n, kill]) => {
    const { G } = DW; const before = seenNow(); G.projs = []; G.fx = [];
    const p = new Proj(Object.assign({ x: 14 * 32, y: 38 * 32, r: 8, life: 3 }, o.opts, o.pal ? { pal: { ICE, GLASS, BONEP, WISPP }[o.pal] } : {})); G.projs.push(p);
    go(n);
    const flew = newFrames(before);
    if (kill === 'hit') p.dead = true; else if (kill === 'life') p.life = 0.001;
    const v0 = Object.keys(ProjArt.variants).length;
    const b2 = seenNow(); go(1);
    const fxs = G.fx.filter(f => f.type === 'projfx').map(f => f.row);
    go(60);
    return { flew, fx: fxs, ending: newFrames(b2), left: G.fx.filter(f => f.type === 'projfx').length, variants: Object.keys(ProjArt.variants).filter(k => /^(ice|void|acid|fire|bolt)/.test(k)).length };
  }, [o, n, kill]);
  const has = (seen, row, ...idx) => idx.every(i => (seen[row + ':' + i] || 0) > 0);

  // the shards of ice, glass and bone
  await arena();
  r = await fly({ opts: { kind: 'shard', vx: 300, vy: 0, color: '#9fdcff', r: 7, rot: 0 }, pal: 'ICE' }, 30, 'hit');
  ok('an ice shard forms, flies on the full shard frames, and dissolves where it stops', has(r.flew, 'ice', 0, 2, 3) && r.fx[0] === 'ice' && has(r.ending, 'ice', 5, 6, 7) && r.left === 0, r);
  r = await fly({ opts: { kind: 'shard', vx: 300, vy: 0, color: '#c8b8ff', r: 7, rot: 0 }, pal: 'GLASS' }, 20, 'life');
  ok('a glass shard is the ice shard turned lilac', has(r.flew, 'ice', 3) && r.variants >= 1, r);
  r = await fly({ opts: { kind: 'shard', vx: 400, vy: 0, color: '#efe6d0', r: 7, rot: 0, boss: true }, pal: 'BONEP' }, 24, 'hit');
  ok('the Grave King\'s bone flies on the drawn bone and breaks apart', has(r.flew, 'bone', 3) && r.fx[0] === 'bone' && has(r.ending, 'bone', 5, 6, 7), r);
  r = await fly({ opts: { kind: 'shard', vx: 250, vy: 0, color: '#efe6d0', r: 7, rot: 0 }, pal: 'BONEP' }, 24, 'hit');
  ok('the skull bat\'s teeth keep their own drawing', Object.keys(r.flew).filter(k => k.startsWith('bone')).length === 0 && r.fx.length === 0, r);
  r = await fly({ opts: { kind: 'shard', vx: 250, vy: 0, color: '#ff8fd0', r: 7, rot: 0 } }, 24, 'hit');
  ok('the pink shards of the turrets are left to the creature sheet', Object.keys(r.flew).length === 0 && r.fx.length === 0, r);

  // orbs: any colour; they burst when they hit and thin out when their time is up
  r = await fly({ opts: { kind: 'orb', vx: 160, vy: 0, color: '#9fe8c0', r: 9 }, pal: 'WISPP' }, 30, 'hit');
  ok('an orb is the void orb (green: its hue turned), and bursts when it hits', has(r.flew, 'void', 1, 2) && r.fx[0] === 'void' && has(r.ending, 'void', 3, 4, 5, 6, 7) && r.variants >= 1, r);
  r = await fly({ opts: { kind: 'orb', vx: 160, vy: 0, color: '#8fe0ff', r: 12 } }, 20, 'life');
  ok('an orb whose time is up only disperses (the smoke frames)', r.fx[0] === 'void' && has(r.ending, 'void', 5, 6, 7) && !has(r.ending, 'void', 3, 4), r);
  r = await fly({ opts: { kind: 'orb', vx: 160, vy: 0, color: '#dfe6ff', r: 10 }, pal: 'WISPP' }, 20, null);
  r.pale = await ev(() => Object.keys(ProjArt.variants).filter(k => k.startsWith('void') && k.endsWith('#dfe6ff')).length);
  ok('a pale orb (the Astronomer\'s) is the same orb with its colour drained', has(r.flew, 'void', 1, 2) && r.pale >= 1, r);

  // a falling rock: the warning, the fall on the rock frames, the landing in dust
  r = await ev(() => {
    const { G } = DW; const before = seenNow(); G.projs = []; G.fx = [];
    const p = new Proj({ kind: 'rock', x: 20 * 32, y: 30 * 32, y0: 30 * 32, r: 17, vx: 0, vy: 0, grav: 1500, dmg: 1, tele: 0.3, life: 4, color: '#8d97a3', passWalls: true }); G.projs.push(p);
    go(10); const warn = newFrames(before); let fell = 0;
    const b2 = seenNow();
    for (let i = 0; i < 140 && !p.dead; i++) { go(1); fell++; }
    const fall = newFrames(b2); G.fx.length; const b3 = seenNow(); go(1);
    const fx = G.fx.filter(f => f.type === 'projfx').map(f => f.row + ':' + f.frames.join(''));
    go(60);
    return { warn, fall, landed: p.dead, fx, ending: newFrames(b3), left: G.fx.filter(f => f.type === 'projfx').length };
  });
  ok('a rock: it hangs and shakes first, falls on its rock frames, and lands in the drawn dust', r.landed && has(r.warn, 'rock', 0) && (has(r.fall, 'rock', 0) || has(r.fall, 'rock', 1)) && r.fx[0] === 'rock:234567' && has(r.ending, 'rock', 3, 4, 5, 6, 7) && r.left === 0, r);

  // a slag rock falls as a meteor and lands in the meteor's explosion; an icicle keeps the older drawing
  r = await ev(() => {
    const { G } = DW; const before = seenNow(); G.projs = []; G.fx = [];
    const mk = pal => new Proj({ kind: 'rock', x: 22 * 32, y: 30 * 32, y0: 30 * 32, r: 17, vx: 0, vy: 0, grav: 1500, dmg: 1, tele: 0.2, life: 4, color: '#ff7a2a', passWalls: true, pal });
    const p = mk(SLAG); G.projs.push(p); go(30); const fall = newFrames(before);
    for (let i = 0; i < 140 && !p.dead; i++) go(1);
    const b2 = seenNow(); go(1); const fx = G.fx.filter(f => f.type === 'projfx').map(f => f.row); go(60); const end = newFrames(b2);
    G.projs = []; G.fx = []; const b3 = seenNow(); const q = mk(ICE); G.projs.push(q); go(30); const icicle = newFrames(b3);
    return { fall, fx, end, icicle };
  });
  ok('a slag rock falls as the meteor and lands in its explosion', has(r.fall, 'meteor', 1) && r.fx[0] === 'meteor' && has(r.end, 'meteor', 4, 5, 6, 7), r);
  ok('an icicle (the ice boss\'s falling spike) is not drawn from this sheet', Object.keys(r.icicle).length === 0, r.icicle);

  // globs: the spitter's keeps its creature drawing in flight and splashes on landing; a boss's lava flies as a fireball and splashes orange
  r = await fly({ opts: { kind: 'glob', vx: 90, vy: 0, grav: 900, r: 8, color: '#b6ef6a' } }, 6, 'hit');
  ok('the spitter\'s glob: its own drawing in flight (not from here), the drawn splash when it lands', Object.keys(r.flew).length === 0 && r.fx[0] === 'acid' && has(r.ending, 'acid', 1, 2, 3, 4, 5, 6, 7), r);
  r = await fly({ opts: { kind: 'glob', vx: 90, vy: -300, grav: 900, r: 9, color: '#ffb070' } }, 14, 'hit');
  ok('a boss\'s lava: a fireball in flight, an orange splash when it lands', has(r.flew, 'fire', 1, 2) && r.fx[0] === 'acid' && has(r.ending, 'acid', 1, 7) && r.variants >= 1, r);

  // bombs: a boss's flies as a fireball and bursts in the drawn explosion (green for the Bonewright's); the imp's keeps its own bomb drawing, and bursts the same
  r = await ev(() => {
    const { G, P } = DW; const out = {};
    for (const [name, o] of [['boss', { r: 11, color: '#ff8a3a', blastR: 74, fuse: 2.2 }], ['mint', { r: 11, color: '#bfe8d0', blastR: 74, fuse: 1.6 }], ['imp', { r: 9, color: '#ff9a50', fuse: 1.7 }]]) {
      G.projs = []; G.fx = []; const before = seenNow();
      const p = new Proj(Object.assign({ kind: 'bomb', x: 24 * 32, y: 33 * 32, vx: 100, vy: 0, grav: 1100, life: 4, dmg: 1 }, o)); G.projs.push(p);
      let n = 0; while (!p.dead && n < 200) { go(1); n++; }
      const flew = newFrames(before); const b2 = seenNow(); go(30);
      out[name] = { flew, blast: newFrames(b2), variants: Object.keys(ProjArt.variants).filter(k => k.startsWith('fire') && k.endsWith(o.color)).length };
    }
    return out;
  });
  ok('a boss\'s bomb flies as a fireball (frames 1-3) and bursts through the explosion frames', has(r.boss.flew, 'fire', 1, 2, 3) && has(r.boss.blast, 'fire', 4, 5, 6, 7) && r.boss.variants === 0, r.boss);
  ok('the Bonewright\'s mint bomb is the same, its colour turned', has(r.mint.flew, 'fire', 1, 2) && r.mint.variants >= 1, r.mint);
  ok('the imp\'s bomb keeps the creature sheet\'s drawing in flight, and bursts in the drawn explosion', !has(r.imp.flew, 'fire', 1, 2, 3) && has(r.imp.blast, 'fire', 4, 5, 6, 7), r.imp);

  // lightning: a pillar warns as before, then strikes through the eight frames, stretched to its height
  r = await ev(() => {
    const { G } = DW; G.projs = []; G.fx = []; const before = seenNow();
    const mk = (x, color) => new Proj({ kind: 'pillar', x, y: 40 * 32, bw: 46, ph: 230, tele: 0.2, dur: 0.4, dmg: 1, life: 5, color, pierce: true, passWalls: true });
    G.projs.push(mk(18 * 32, '#ff9bd6')); G.projs.push(mk(21 * 32, '#8fe0ff'));
    go(10); const warn = newFrames(before); go(40);
    return { warn, struck: newFrames(before), variants: Object.keys(ProjArt.variants).filter(k => k.startsWith('bolt')).map(k => k.replace(/\d+/, '')) };
  });
  ok('a pillar: the warning is the older drawing, the strike is the bolt frames 0-7', Object.keys(r.warn).length === 0 && [0, 1, 2, 3, 4, 5, 6, 7].every(i => has(r.struck, 'bolt', i)), r);
  ok('the pink pillar is the lightning turned pink; the blue one as drawn', r.variants.every(k => k.endsWith('#ff9bd6')) && r.variants.length >= 6, r.variants);

  // what is not drawn here is untouched: beams, webs, clouds, the hero's own spells
  r = await ev(() => {
    const { G } = DW; G.projs = []; G.fx = []; const before = seenNow();
    G.projs.push(new Proj({ kind: 'beam', x: 20 * 32, y: 0, bw: 44, tele: 0.2, dur: 0.3, dmg: 1, life: 5, color: '#dff3ff', pierce: true, passWalls: true }));
    G.projs.push(new Proj({ kind: 'web', x: 16 * 32, y: 36 * 32, vx: 50, vy: 0, r: 10, life: 2, color: '#e6e0ff' }));
    G.projs.push(new Proj({ kind: 'needle', x: 17 * 32, y: 36 * 32, vx: 300, vy: 0, r: 8, life: 2, color: '#e8f0ff' }));
    go(40); return newFrames(before);
  });
  ok('beams, webs and needles keep their old drawings', Object.keys(r).length === 0, r);

  // the whole set in the game
  await arena();
  await ev(() => {
    const { G, P } = DW; P.x = 10 * 32; DW.step(2);
    const cx = P.cx, put = (o, t) => { const p = new Proj(Object.assign({ r: 8, life: 9, t: t || 0.3 }, o)); G.projs.push(p); return p; };
    const y = 39 * 32 + 8;
    put({ kind: 'shard', x: cx + 90, y: y - 130, vx: 300, rot: 0.0, color: '#9fdcff', r: 7, pal: ICE, t: 0.4 });
    put({ kind: 'shard', x: cx + 200, y: y - 150, vx: 300, rot: 0.3, color: '#c8b8ff', r: 7, pal: GLASS, t: 0.4 });
    put({ kind: 'shard', x: cx + 320, y: y - 120, vx: 400, rot: -0.2, color: '#efe6d0', r: 7, pal: BONEP, boss: true, t: 0.4 });
    for (const [i, c] of ['#ff9bd6', '#9fe8c0', '#8fe0ff', '#dfe6ff', '#ffc890'].entries()) put({ kind: 'orb', x: cx + 80 + i * 56, y: y - 70, r: 10, color: c, t: 0.3 + i * 0.07 });
    put({ kind: 'rock', x: cx + 420, y: y - 60, y0: y - 200, r: 17, vy: 400, tele: 0, color: '#8d97a3', t: 0.5, passWalls: true });
    put({ kind: 'rock', x: cx + 480, y: y - 100, y0: y - 200, r: 17, vy: 400, tele: 0, color: '#ff7a2a', pal: SLAG, t: 0.5, passWalls: true });
    put({ kind: 'glob', x: cx + 540, y: y - 110, vx: 120, vy: -200, r: 9, color: '#ffb070', t: 0.5 });
    put({ kind: 'bomb', x: cx + 600, y: y - 140, vx: 160, vy: 100, r: 11, color: '#ff8a3a', blastR: 74, t: 0.5 });
    put({ kind: 'pillar', x: cx + 180, y, bw: 46, ph: 230, tele: 0.1, dur: 0.8, color: '#ff9bd6', pierce: true, passWalls: true, t: 0.1 + 0.8 * 0.35 });
    put({ kind: 'pillar', x: cx + 330, y, bw: 50, ph: 300, tele: 0.1, dur: 0.8, color: '#8fe0ff', pierce: true, passWalls: true, t: 0.1 + 0.8 * 0.55 });
    const fx = (row, frames, x, yy, k, o) => frames.forEach((fr, j) => G.fx.push(Object.assign({ type: 'projfx', row, frames: [fr], x: x + j * 80, y: yy, k, t: 0, life: 99 }, o || {})));
    fx('ice', [5, 6, 7], cx - 60, y - 190, 0.5, { dir: 0 });
    fx('rock', [3, 5, 7], cx - 60, y, 0.9);
    fx('acid', [2, 4, 6], cx + 270, y, 0.8);
    fx('void', [3, 4, 6], cx + 520, y - 200, 0.6);
    G.projs.push(new Proj({ kind: 'blast', x: cx + 560, y: y - 30, r: 74, r0: 74, dmg: 1, life: 99, pierce: true, passWalls: true, color: '#ff8a3a', t: 0.1 }));
    G.projs.push(new Proj({ kind: 'blast', x: cx + 680, y: y - 30, r: 74, r0: 74, dmg: 1, life: 99, pierce: true, passWalls: true, color: '#bfe8d0', t: 0.2 }));
    for (const p of G.projs) p.update = function () {};
    G.cam.x = cx - 480 + 320; DW.draw();
  });
  await page.screenshot({ path: shot('proj_art.png') });

  ok('no page errors', errors.length === 0, errors);
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
