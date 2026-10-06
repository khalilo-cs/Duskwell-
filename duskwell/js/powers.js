'use strict';
// The Dusk powers: six great deeds the Elder of Hushvale teaches (one more for every two seals the hero has won), each of them usable ONCE
// between two rests. Resting on a bench makes them all ready again (and so does waking at the bench after a fall). They are used with the keys
// 1 to 6 or by tapping their picture under the hero's gear at the top left.
//   Time Stop   5 s of stillness for every creature, guardian and shot but the hero's own; a blow on the stilled lands half again as hard.
//   Star Fall   sixteen stars fall over three seconds, most of them on the nearest creatures and guardians.
//   Phoenix     all the masks at once, four seconds of fire that cannot be hurt, and if the hero would fall while it is ready it rises on its own.
//   Twin        a shadow twin fights beside the hero for twelve seconds, striking whatever is near.
//   Black Hole  a hole in the air that drags the creatures in and grinds them, and ends in a collapse.
//   Storm Rage  twelve seconds of double blows, a quicker hand and lightning that leaps from the struck to the nearest.
// The hero and the creatures reach it through the small hooks marked (powers) in entities.js and game.js.
const POWERS = [
  { id: 'time', seals: 1, color: '#9fd8ff', ar: 'توقّف الزمن', en: 'Time Stop',
    dAr: 'يتجمّد كل ما حولك خمس ثوانٍ: الوحوش والزعماء ومقذوفاتهم، وتبقى أنت وحدك حرّاً. وكل ضربة على المتجمّد تؤذيه بنصف زيادة.',
    dEn: 'Everything around you stands still for five seconds: creatures, guardians and their shots. Only you move, and every blow on a stilled foe lands half again as hard.' },
  { id: 'stars', seals: 3, color: '#ffe08a', ar: 'سقوط النجوم', en: 'Star Fall',
    dAr: 'تسقط ستة عشر نجماً في ثلاث ثوانٍ، أغلبها على أقرب الوحوش والزعماء، وكل نجم ينفجر ويؤذي كل ما حوله.',
    dEn: 'Sixteen stars fall in three seconds, most of them on the nearest creatures and guardians; each bursts and hurts everything around it.' },
  { id: 'phoenix', seals: 5, color: '#ff9a5a', ar: 'قلب العنقاء', en: 'Phoenix Heart',
    dAr: 'تعود كل أقنعتك دفعة واحدة، وتحيط بك نار أربع ثوانٍ لا يؤذيك فيها شيء وتحرق من يقترب. وإن كانت جاهزة وأنت على وشك السقوط نهضتَ بها وحدك.',
    dEn: 'All your masks come back at once, and for four seconds a fire around you cannot be hurt and burns what comes close. If it is ready when you would fall, it raises you by itself.' },
  { id: 'twin', seals: 7, color: '#c8a0ff', ar: 'التوأم الظلّي', en: 'Shadow Twin',
    dAr: 'يظهر توأم من ظلّك ويقاتل بجانبك اثنتي عشرة ثانية: يندفع إلى أقرب عدو ويضربه بنصلك.',
    dEn: 'A twin made of your shadow fights beside you for twelve seconds, dashing at the nearest foe and striking it with your nail.' },
  { id: 'hole', seals: 9, color: '#a07cff', ar: 'الثقب الأسود', en: 'Black Hole',
    dAr: 'يُفتح ثقب في الهواء يسحب الوحوش إليه ويطحنها أربع ثوانٍ ثم ينهار بضربة هائلة، ويبتلع المقذوفات.',
    dEn: 'A hole opens in the air, drags the creatures in and grinds them for four seconds, then collapses with a huge blow. It swallows shots.' },
  { id: 'rage', seals: 11, color: '#8fd0ff', ar: 'غضب العاصفة', en: 'Storm Rage',
    dAr: 'اثنتا عشرة ثانية تكون فيها ضرباتك مضاعفة ويدك أسرع، ويقفز البرق من كل عدو تضربه إلى أقرب عدوين.',
    dEn: 'For twelve seconds your blows are doubled and your hand quicker, and lightning leaps from each foe you strike to the two nearest.' },
];

const Powers = (() => {
  const fresh = () => ({ used: {}, time: 0, stars: null, aura: 0, twin: null, hole: null, rage: 0, fx: [], hist: [], shown: null, hudT: 0 });
  let S = fresh();
  const def = id => POWERS.find(p => p.id === id);
  const known = id => !!G.flags['pw_' + id];
  const ready = id => known(id) && !S.used[id];
  const pname = p => (LANG.cur === 'ar' ? p.ar : p.en);
  const pdesc = p => (LANG.cur === 'ar' ? p.dAr : p.dEn);
  const live = () => G.enemies.filter(e => !e.dead && !e.ghostly && !e.dummy);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const view = () => { const Z = G.zoomNow || 1; return { x: G.cam.x, y: G.cam.y, w: VW / Z, h: VH / Z }; };
  // the y of the first solid ground under a point
  const groundBelow = (x, y) => { const L = G.level; let yy = y; while (yy < L.ph && !L.solidAtPx(x, yy)) yy += 8; return Math.min(yy, L.ph); };
  const nearest = (x, y, r) => { let best = null, bd = r; for (const e of live()) { const d = dist(x, y, e.cx, e.cy) - (e.isBoss ? 40 : 0); if (d < bd) { best = e; bd = d; } } return best; };
  // hurt one with a power's blow: no knock-back for a guardian, and no freeze of the game for each tick (a hole or a fire hurts many times a second)
  const hurtE = (e, dmg, how) => {
    if (e.dead) return;
    const dir = e.cx >= P.cx ? 1 : -1, kb = e.kb, hs = G.hitstopT; if (e.isBoss) e.kb = 0;
    e.hurt(Math.max(1, Math.round(dmg)), dir, how || 'spell'); e.kb = kb; G.hitstopT = hs;
  };

  // ---------------------------------------------------------------- using one
  function use(id) {
    const p = def(id); if (!p) return false;
    if (G.state !== 'play' || P.dead || P.sitting) return false;
    if (!known(id)) { G.toastMsg(sx('لم تتعلّم «' + p.ar + '» بعد. كلّم الشيخ في وادي الهمس', 'You have not learned ' + p.en + ' yet. Speak to the Elder in Hushvale'), 2.6); return false; }
    if (S.used[id]) { G.toastMsg(sx('«' + p.ar + '» استُعملت. استرح على مقعد لتتجدّد', p.en + ' is spent. Rest on a bench to renew it'), 2.4); return false; }
    S.used[id] = true;
    DO[id]();
    S.shown = { p, t: 0 };
    Sound.play('ability'); G.hitstop(0.1); G.flash = Math.max(G.flash, 0.4);
    return true;
  }
  const DO = {
    time() {
      S.time = 5;
      for (const e of live()) e.frozenT = Math.max(e.frozenT || 0, S.time);
      ring(P.cx, P.cy, '#9fd8ff'); G.burst(P.cx, P.cy, 30, { color: '#cfeaff', speed: 280, life: 0.8, size: 3, grav: -30 }); G.shake(5, 0.3);
    },
    stars() { S.stars = { t: 3.2, acc: 0, n: 0 }; G.shake(4, 0.3); },
    phoenix() { phoenix(false); },
    twin() { S.twin = { t: 12, x: P.cx - P.face * 40, y: P.y, face: P.face, atk: 0.2, swing: 0, w: 22, h: 38 }; ring(P.cx, P.cy, '#c8a0ff'); G.burst(P.cx, P.cy, 24, { color: '#b890ff', speed: 220, life: 0.7, size: 3, grav: -50 }); },
    hole() {
      const e = nearest(P.cx, P.cy, 460);
      S.hole = { x: e ? e.cx : P.cx + P.face * 200, y: e ? e.cy : P.cy - 30, t: 4, tick: 0.2, spin: 0 };
      ring(S.hole.x, S.hole.y, '#a07cff'); G.shake(5, 0.4);
    },
    rage() { S.rage = 12; ring(P.cx, P.cy, '#8fd0ff'); G.burst(P.cx, P.cy, 30, { color: '#bfe4ff', speed: 300, life: 0.6, size: 3 }); G.shake(5, 0.3); },
  };
  const ring = (x, y, color) => G.ring(x, y, color);
  // all the masks, fire around the hero, shots swallowed; auto = it rose by itself when the hero would have fallen
  function phoenix(auto) {
    P.hp = P.maxHp; P.soul = P.maxSoul; P.dead = false; P.invuln = Math.max(P.invuln, 4); P.hurtT = 0;
    S.aura = 4;
    G.clearHostile();
    for (const e of live()) if (dist(e.cx, e.cy, P.cx, P.cy) < 170) hurtE(e, P.spellDmg(40), 'spell');
    ring(P.cx, P.cy, '#ff9a5a'); ring(P.cx, P.cy, '#ffe0a0');
    G.burst(P.cx, P.cy, 44, { color: '#ffb070', speed: 340, life: 0.9, size: 4, grav: -80 }); G.shake(7, 0.4); G.flash = Math.max(G.flash, 0.5);
    if (auto) { G.toastMsg(sx('نهضتَ من رمادك: قلب العنقاء', 'You rise from the ashes: Phoenix Heart'), 3); Sound.play('heal'); }
  }
  // the hero would fall: the Phoenix takes the blow if it is ready
  function phoenixSaves() {
    if (!ready('phoenix')) return false;
    S.used.phoenix = true; phoenix(true); S.shown = { p: def('phoenix'), t: 0 }; return true;
  }

  // ---------------------------------------------------------------- numbers the hero asks for
  const dmgK = () => (S.rage > 0 ? 2 : 1) * (S.time > 0 ? 1.5 : 1);
  const strikeK = () => (S.rage > 0 ? 0.62 : 1);
  const frozenShot = p => S.time > 0 && !p.friendly;
  // Storm Rage: lightning from the struck to the two nearest
  function onNailHit(e) {
    if (!(S.rage > 0) || !e) return;
    const others = live().filter(o => o !== e && dist(o.cx, o.cy, e.cx, e.cy) < 260).sort((a, b) => dist(a.cx, a.cy, e.cx, e.cy) - dist(b.cx, b.cy, e.cx, e.cy)).slice(0, 2);
    for (const o of others) {
      S.fx.push({ type: 'arc', x0: e.cx, y0: e.cy, x1: o.cx, y1: o.cy, t: 0, life: 0.2, seed: Math.random() * 99 });
      hurtE(o, P.nailDamage() * 0.45, 'spell');
    }
    if (others.length) Sound.play('hit');
  }

  // ---------------------------------------------------------------- one step
  function spawnMeteor(n) {
    const v = view(), tg = live().filter(e => e.cx > v.x - 60 && e.cx < v.x + v.w + 60 && e.cy > v.y - 60 && e.cy < v.y + v.h + 60);
    const bosses = tg.filter(e => e.isBoss), pool = bosses.length && Math.random() < 0.65 ? bosses : tg;
    let tx, ty;
    if (pool.length) { const e = pool[Math.floor(Math.random() * pool.length)]; tx = e.cx + rand(-36, 36); ty = e.isBoss ? e.cy : e.y + e.h - 6; }
    else { tx = v.x + rand(0.1, 0.9) * v.w; ty = groundBelow(tx, v.y + v.h * 0.4); }
    const sy = v.y - 70, fall = 1100, tt = Math.max(0.2, (ty - sy) / fall), sxp = tx + rand(120, 200) * (Math.random() < 0.5 ? -1 : 1);
    S.fx.push({ type: 'meteor', x: sxp, y: sy, vx: (tx - sxp) / tt, vy: fall, tx, ty, t: 0, life: 4 });
  }
  function explode(m) {
    const R = 100;
    for (const e of live()) if (dist(e.cx, e.cy, m.tx, m.ty) < R + Math.max(e.w, e.h) / 2) hurtE(e, P.spellDmg(30), 'spell');
    G.burst(m.tx, m.ty, 18, { color: pick(['#ffe08a', '#ffb070', '#ffffff']), speed: 300, life: 0.6, size: 4, grav: 200 });
    G.ring(m.tx, m.ty, '#ffd890', true); Sound.play('slam'); G.shake(3, 0.12);
  }
  function update(dt) {
    for (let i = 0; i < POWERS.length; i++) { const k = 'power' + (i + 1); if (Input.pressed(k)) { Input.consume(k); use(POWERS[i].id); } }
    S.hudT += dt; if (S.shown) { S.shown.t += dt; if (S.shown.t > 1.6) S.shown = null; }
    // where the hero was a moment ago (the twin lags behind)
    S.hist.push({ x: P.cx, y: P.y, f: P.face }); if (S.hist.length > 40) S.hist.shift();

    if (S.time > 0) {
      S.time -= dt;
      for (const e of G.enemies) { if (e.dead) continue; if (e.isBoss && e.state === 'dying') { e.frozenT = 0; continue; } if (!e.ghostly || e.isBoss) e.frozenT = Math.max(e.frozenT || 0, S.time); }
      if (S.time <= 0) { for (const e of G.enemies) e.frozenT = Math.min(e.frozenT || 0, 0.01); G.ring(P.cx, P.cy, '#ffffff'); Sound.play('select'); }
    }
    if (S.stars) {
      const st = S.stars; st.acc -= dt;
      while (st.acc <= 0 && st.n < 16) { st.acc += 0.2; st.n++; spawnMeteor(st.n); }
      if (st.n >= 16) S.stars = null;
    }
    if (S.aura > 0) {
      S.aura -= dt; P.invuln = Math.max(P.invuln, 0.25);
      S.auraTick = (S.auraTick || 0) - dt;
      if (S.auraTick <= 0) {
        S.auraTick = 0.3;
        for (const e of live()) if (dist(e.cx, e.cy, P.cx, P.cy) < 95) hurtE(e, P.spellDmg(8), 'burn');
        for (const p of G.projs) if (!p.friendly && dist(p.x, p.y, P.cx, P.cy) < 90) p.dead = true;
      }
    }
    if (S.twin) {
      const w = S.twin; w.t -= dt; w.atk -= dt; w.swing = Math.max(0, w.swing - dt);
      const tg = nearest(w.x + w.w / 2, w.y + w.h / 2, 340);
      let gx, gy;
      if (tg) { gx = tg.cx - (w.x + w.w / 2 > tg.cx ? -1 : 1) * (tg.w / 2 + 30); gy = tg.y + tg.h - w.h; w.face = tg.cx >= w.x ? 1 : -1; }
      else { const h = S.hist[Math.max(0, S.hist.length - 24)] || { x: P.cx, y: P.y, f: P.face }; gx = h.x - h.f * 66; gy = h.y; w.face = P.face; }
      const dx = gx - (w.x + w.w / 2), dy = gy - w.y;
      w.x += clamp(dx, -430 * dt, 430 * dt); w.y += clamp(dy, -520 * dt, 520 * dt);
      if (tg && w.atk <= 0 && Math.abs(tg.cx - (w.x + w.w / 2)) < tg.w / 2 + 70 && Math.abs(tg.cy - (w.y + w.h / 2)) < tg.h / 2 + 60) {
        w.atk = 0.42; w.swing = 0.22; w.face = tg.cx >= w.x ? 1 : -1;
        hurtE(tg, P.nailDamage() * 1.2, 'side');
        G.slashFx(tg.cx, tg.cy, w.face); G.burst(tg.cx, tg.cy, 8, { color: '#c8a0ff', speed: 200, life: 0.4, size: 3 }); Sound.play('hit');
      }
      if (w.t <= 0) { G.burst(w.x + w.w / 2, w.y + w.h / 2, 18, { color: '#b890ff', speed: 200, life: 0.6, size: 3, grav: -40 }); S.twin = null; }
    }
    if (S.hole) {
      const h = S.hole; h.t -= dt; h.tick -= dt; h.spin += dt;
      const R = 280;
      for (const e of live()) {
        const d = dist(e.cx, e.cy, h.x, h.y); if (d > R || d < 6) continue;
        const pull = (e.isBoss ? 70 : 270) * (1.25 - d / R), ux = (h.x - e.cx) / d, uy = (h.y - e.cy) / d;
        e.x += ux * pull * dt; e.y += uy * pull * dt * (e.grav === false || e.fly ? 1 : 0.15);
      }
      for (const p of G.projs) if (!p.friendly && dist(p.x, p.y, h.x, h.y) < 80) p.dead = true;
      if (h.tick <= 0) { h.tick = 0.25; for (const e of live()) if (dist(e.cx, e.cy, h.x, h.y) < 125) hurtE(e, P.spellDmg(7), 'spell'); }
      if (h.t <= 0) {
        for (const e of live()) if (dist(e.cx, e.cy, h.x, h.y) < 175) hurtE(e, P.spellDmg(45), 'spell');
        G.burst(h.x, h.y, 40, { color: '#c0a0ff', speed: 380, life: 0.8, size: 4, grav: 0 }); G.ring(h.x, h.y, '#ffffff'); G.ring(h.x, h.y, '#a07cff'); G.shake(8, 0.4); Sound.play('slam');
        S.hole = null;
      }
    }
    if (S.rage > 0) { S.rage -= dt; if (Math.random() < 0.5) G.burst(P.cx + rand(-14, 14), P.cy + rand(-20, 18), 1, { color: '#bfe4ff', speed: 90, life: 0.3, size: 2, grav: -60 }); }
    for (const f of S.fx) {
      f.t += dt;
      if (f.type === 'meteor') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.y >= f.ty) { f.t = 99; explode(f); }
        else if (Math.random() < 0.6) G.burst(f.x, f.y, 1, { color: '#ffd890', speed: 40, life: 0.3, size: 3, grav: 0 });
      }
    }
    S.fx = S.fx.filter(f => f.t < (f.life || 1));
  }

  // ---------------------------------------------------------------- rest, rooms, new games
  function rest() {
    const n = Object.keys(S.used).length;
    S.used = {}; clearActive();
    if (n) G.toastMsg(sx('تجدّدت قواك الخارقة', 'Your powers are renewed'), 2);
  }
  function clearActive() { S.time = 0; S.stars = null; S.aura = 0; S.twin = null; S.hole = null; S.rage = 0; S.fx = []; S.shown = null; S.hist = []; }
  function reset() { S = fresh(); }

  // ---------------------------------------------------------------- the Elder teaches
  // powers the hero has earned and not been taught; they are taught at once (a flag each, so the save keeps them)
  function newlyEarned() { const n = sealCount(); return POWERS.filter(p => n >= p.seals && !known(p.id)); }
  function elder() {
    const fresh_ = newlyEarned();
    if (!fresh_.length) return null;
    for (const p of fresh_) G.flags['pw_' + p.id] = true;
    const lines = [sx('رأيتُ ما فعلتَ بالحرّاس. خذ إذن من نور الغسق ما لا يُعطى إلا للقلة: قوى تُستعمل مرة واحدة بين كل راحتين.', 'I have seen what you did to the guardians. Take, then, from the dusk what is given to few: powers that can be used once between two rests.')];
    for (const p of fresh_) lines.push(sx('«' + p.ar + '»: ' + p.dAr, p.en + ': ' + p.dEn));
    lines.push(sx('استعملها بالمفاتيح 1 إلى 6 أو باللمس على صورتها أسفل معداتك. واسترح على مقعد فتتجدّد كلها.', 'Use them with the keys 1 to 6, or tap their picture under your gear. Rest on a bench and they all return.'));
    Sound.play('ability'); G.flash = Math.max(G.flash, 0.4);
    return { lines, i: 0, t: 0 };
  }

  // ---------------------------------------------------------------- drawing
  // the picture of each power, drawn with paths: centre x, y, radius r
  function glyph(g, id, x, y, r, c) {
    g.save(); g.translate(x, y); g.fillStyle = g.strokeStyle = c; g.lineWidth = Math.max(1.5, r * 0.14); g.lineCap = 'round'; g.lineJoin = 'round';
    if (id === 'time') {
      g.beginPath(); g.arc(0, 0, r * 0.82, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r * 0.55); g.moveTo(0, 0); g.lineTo(r * 0.38, r * 0.2); g.stroke();
      for (let i = 0; i < 12; i += 3) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(Math.sin(a) * r * 0.82, -Math.cos(a) * r * 0.82); g.lineTo(Math.sin(a) * r * 0.64, -Math.cos(a) * r * 0.64); g.stroke(); }
    } else if (id === 'stars') {
      const star = (cx, cy, s) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? s * 0.32 : s; g.lineTo(cx + Math.sin(a) * rr, cy - Math.cos(a) * rr); } g.closePath(); g.fill(); };
      star(0, -r * 0.1, r * 0.72); star(-r * 0.62, r * 0.5, r * 0.3); star(r * 0.62, r * 0.55, r * 0.26);
    } else if (id === 'phoenix') {
      g.beginPath(); g.moveTo(0, -r * 0.95); g.bezierCurveTo(r * 0.9, -r * 0.2, r * 0.7, r * 0.8, 0, r * 0.9); g.bezierCurveTo(-r * 0.7, r * 0.8, -r * 0.9, -r * 0.2, 0, -r * 0.95); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(0, -r * 0.1); g.bezierCurveTo(r * 0.38, r * 0.25, r * 0.28, r * 0.62, 0, r * 0.66); g.bezierCurveTo(-r * 0.28, r * 0.62, -r * 0.38, r * 0.25, 0, -r * 0.1); g.fill(); g.globalCompositeOperation = 'source-over';
    } else if (id === 'twin') {
      const man = (dx, a) => { g.globalAlpha = a; g.beginPath(); g.arc(dx, -r * 0.5, r * 0.26, 0, 7); g.fill(); g.beginPath(); g.moveTo(dx - r * 0.34, r * 0.8); g.lineTo(dx - r * 0.22, -r * 0.18); g.lineTo(dx + r * 0.22, -r * 0.18); g.lineTo(dx + r * 0.34, r * 0.8); g.closePath(); g.fill(); };
      man(-r * 0.3, 1); man(r * 0.34, 0.5); g.globalAlpha = 1;
    } else if (id === 'hole') {
      for (let k = 0; k < 3; k++) { g.beginPath(); for (let i = 0; i <= 18; i++) { const a = i * 0.34 + k * 2.1, rr = r * (0.12 + i * 0.045); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); }
      g.fillStyle = '#05060c'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, 7); g.fill();
    } else if (id === 'rage') {
      g.beginPath(); g.moveTo(r * 0.2, -r * 0.95); g.lineTo(-r * 0.5, r * 0.1); g.lineTo(-r * 0.05, r * 0.1); g.lineTo(-r * 0.25, r * 0.95); g.lineTo(r * 0.55, -r * 0.2); g.lineTo(r * 0.08, -r * 0.2); g.closePath(); g.fill();
    }
    g.restore();
  }
  // one icon of the strip under the gear: ready (lit and breathing), spent (dim) or running (a ring of the time left)
  function drawIcon(g, p, x, y, S_, i) {
    const rdy = ready(p.id), run = active(p.id), t = G.t, rr = S_ / 2;
    g.save();
    if (rdy) { const k = 0.5 + 0.5 * Math.sin(t * 3 + i); bloom(g, x, y, rr * 1.7, p.color, 0.16 + 0.12 * k); }
    g.fillStyle = rdy ? 'rgba(10,16,30,0.82)' : 'rgba(6,9,16,0.7)'; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    g.strokeStyle = rdy ? p.color : 'rgba(140,150,170,0.45)'; g.lineWidth = rdy ? 2.4 : 1.6; g.stroke();
    g.globalAlpha = rdy ? 1 : 0.35; glyph(g, p.id, x, y, rr * 0.62, rdy ? p.color : '#9aa4b8'); g.globalAlpha = 1;
    if (run) { const left = remain(p.id), tot = { time: 5, stars: 3.2, phoenix: 4, twin: 12, hole: 4, rage: 12 }[p.id]; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, rr + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(left / tot, 0, 1)); g.stroke(); }
    g.fillStyle = rdy ? '#eef5ff' : '#8a94a8'; g.font = font(11, '800'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.fillText(String(i + 1), x + rr - 2, y + rr - 3);
    g.restore();
  }
  const active = id => ({ time: S.time > 0, stars: !!S.stars, phoenix: S.aura > 0, twin: !!S.twin, hole: !!S.hole, rage: S.rage > 0 }[id]);
  const remain = id => ({ time: S.time, stars: S.stars ? S.stars.t : 0, phoenix: S.aura, twin: S.twin ? S.twin.t : 0, hole: S.hole ? S.hole.t : 0, rage: S.rage }[id]) || 0;
  // the strip at the top left, and a tap on a picture uses the power
  function drawHUD(g) {
    const list = POWERS.filter(p => known(p.id)); if (!list.length || G.state !== 'play') return;
    const size = 36, gap = 8, x0 = 36, y = 178;
    list.forEach((p, k) => {
      const i = POWERS.indexOf(p), x = x0 + size / 2 + k * (size + gap);
      drawIcon(g, p, x, y, size, i);
      (G.menuHits || (G.menuHits = [])).push({ x: x - size / 2 - 3, y: y - size / 2 - 3, w: size + 6, h: size + 6, fn: () => use(p.id) });
    });
  }
  // over the picture of the world: the stillness of Time Stop, the name of the power just used
  function drawScreen(g) {
    if (S.time > 0) {
      const k = Math.min(1, S.time / 0.4) * Math.min(1, (5 - S.time) / 0.15 + 0.2);
      g.save(); g.fillStyle = 'rgba(110,160,230,' + 0.12 * k + ')'; g.fillRect(0, 0, VW, VH);
      const px = (P.cx - G.cam.x) * (G.zoomNow || 1), py = (P.cy - G.cam.y) * (G.zoomNow || 1), rg = g.createRadialGradient(px, py, 60, px, py, 520);
      rg.addColorStop(0, 'rgba(120,170,255,0)'); rg.addColorStop(1, 'rgba(60,90,160,' + 0.32 * k + ')'); g.fillStyle = rg; g.fillRect(0, 0, VW, VH); g.restore();
    }
    if (S.shown) {
      const a = clamp(S.shown.t / 0.2, 0, 1) * clamp((1.6 - S.shown.t) / 0.5, 0, 1), p = S.shown.p;
      g.save(); g.globalAlpha = a; setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(40, '800'); textShadow(g, pname(p), VW / 2, 150, p.color, 12);
      g.restore();
    }
  }
  // in the world: stars, the twin, the hole, the fire, the lightning
  function draw(g, t) {
    for (const f of S.fx) {
      if (f.type === 'meteor') {
        const sp = Math.hypot(f.vx, f.vy), ux = f.vx / sp, uy = f.vy / sp;
        const tr = g.createLinearGradient(f.x, f.y, f.x - ux * 120, f.y - uy * 120); tr.addColorStop(0, 'rgba(255,230,160,0.95)'); tr.addColorStop(1, 'rgba(255,160,80,0)');
        g.strokeStyle = tr; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - ux * 120, f.y - uy * 120); g.stroke();
        bloom(g, f.x, f.y, 34, '#ffe08a', 0.7); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(f.x, f.y, 5.5, 0, 7); g.fill();
      } else if (f.type === 'arc') {
        const a = 1 - f.t / f.life, n = 7; g.strokeStyle = 'rgba(200,235,255,' + a + ')'; g.lineWidth = 3; g.lineJoin = 'round'; g.shadowColor = '#8fd0ff'; g.shadowBlur = 12;
        g.beginPath(); g.moveTo(f.x0, f.y0);
        for (let i = 1; i < n; i++) { const k = i / n; g.lineTo(f.x0 + (f.x1 - f.x0) * k + Math.sin(f.seed + i * 9 + t * 40) * 14, f.y0 + (f.y1 - f.y0) * k + Math.cos(f.seed + i * 7 + t * 40) * 14); }
        g.lineTo(f.x1, f.y1); g.stroke(); g.shadowBlur = 0;
      }
    }
    if (S.hole) {
      const h = S.hole, k = Math.min(1, h.t / 0.4) * Math.min(1, (4 - h.t) / 0.3 + 0.2), R = 90 * (0.6 + 0.4 * k);
      bloom(g, h.x, h.y, 230, '#6a4cff', 0.22 * k);
      g.save(); g.translate(h.x, h.y);
      for (let i = 0; i < 4; i++) { g.rotate(h.spin * (2.2 - i * 0.4)); g.strokeStyle = 'rgba(' + (170 - i * 20) + ',' + (130 - i * 10) + ',255,' + (0.5 - i * 0.08) * k + ')'; g.lineWidth = 6 - i; g.beginPath(); g.ellipse(0, 0, R * (1 - i * 0.14), R * 0.34 * (1 - i * 0.1), i * 0.7, 0, 5.2); g.stroke(); }
      const bh = g.createRadialGradient(0, 0, 4, 0, 0, R * 0.55); bh.addColorStop(0, 'rgba(0,0,6,1)'); bh.addColorStop(0.75, 'rgba(10,6,30,0.95)'); bh.addColorStop(1, 'rgba(10,6,30,0)'); g.fillStyle = bh; g.beginPath(); g.arc(0, 0, R * 0.55, 0, 7); g.fill();
      g.restore();
    }
    if (S.aura > 0 && !P.dead) {
      const k = Math.min(1, S.aura / 0.4);
      bloom(g, P.cx, P.cy, 80, '#ff9a5a', 0.3 * k);
      for (let i = 0; i < 10; i++) { const a = t * 3 + i * Math.PI / 5, rr = 38 + Math.sin(t * 6 + i) * 5, x = P.cx + Math.cos(a) * rr, y = P.cy + Math.sin(a) * rr * 1.2;
        g.fillStyle = i % 2 ? 'rgba(255,200,110,' + 0.85 * k + ')' : 'rgba(255,120,60,' + 0.85 * k + ')'; g.beginPath(); g.moveTo(x, y - 9); g.quadraticCurveTo(x + 6, y, x, y + 5); g.quadraticCurveTo(x - 6, y, x, y - 9); g.fill(); }
    }
    if (S.rage > 0 && !P.dead) {
      const k = Math.min(1, S.rage / 0.5);
      bloom(g, P.cx, P.cy, 96, '#8fd0ff', 0.32 * k);
      g.save(); g.strokeStyle = 'rgba(225,245,255,' + 0.95 * k + ')'; g.lineWidth = 2.6; g.lineJoin = 'round'; g.shadowColor = '#7fc8ff'; g.shadowBlur = 14;
      for (let j = 0; j < 4; j++) {
        const a0 = rand(0, 6.28); let x = P.cx + Math.cos(a0) * 14, y = P.cy + Math.sin(a0) * 18; g.beginPath(); g.moveTo(x, y);
        for (let i = 0; i < 4; i++) { const a = a0 + rand(-0.6, 0.6); x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); } g.stroke();
      }
      g.restore();
    }
    if (S.twin) drawTwin(g, t);
    if (S.time > 0 && !P.dead) {                                        // a clock ring turning round the hero
      const k = Math.min(1, S.time / 0.4); g.save(); g.translate(P.cx, P.cy); g.strokeStyle = 'rgba(190,225,255,' + 0.7 * k + ')'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 46, 0, 7); g.stroke(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.moveTo(Math.cos(a) * 46, Math.sin(a) * 46); g.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); g.stroke(); }
      const a = (5 - S.time) * Math.PI * 2 / 5 - Math.PI / 2; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 40, Math.sin(a) * 40); g.stroke(); g.restore();
    }
  }
  // the twin: the hero's own drawing, dark violet and half there
  let tmp = null;
  function drawTwin(g, t) {
    const w = S.twin, a = Math.min(1, w.t / 0.5, (12 - w.t) / 0.3 + 0.2);
    if (!tmp) { const c = document.createElement('canvas'); c.width = 170; c.height = 170; tmp = { c, g: Guard.track(c.getContext('2d')) }; }
    const tg = tmp.g, cx = w.x + w.w / 2, cy = w.y + w.h / 2;
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, 170, 170); tg.globalAlpha = 1; tg.globalCompositeOperation = 'source-over';
    Guard.run(tg, 'twin', () => {
      tg.save(); tg.translate(85 - cx, 95 - cy);
      const c = Object.assign(Object.create(Object.getPrototypeOf(P)), P, { x: w.x, y: w.y, face: w.face, vx: 0, vy: 0, onGround: true, invuln: 0, hurtT: 0, atkT: w.swing > 0 ? 0.1 * (w.swing / 0.22) + 0.02 : 0, atkDir: 'side', atkAlt: 0, sitting: null, dead: false, sd: null, rendT: 0, rushT: 0, novaT: 0, wailT: 0, focusT: 0, diving: false });
      Art.drawPlayer(tg, c, t); tg.restore();
    });
    tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = 'rgba(140,90,240,0.8)'; tg.fillRect(0, 0, 170, 170); tg.globalCompositeOperation = 'source-over';
    bloom(g, cx, cy, 60, '#a070ff', 0.2 * a);
    g.save(); g.globalAlpha = 0.85 * a; g.shadowColor = '#b890ff'; g.shadowBlur = 16; g.drawImage(tmp.c, cx - 85, cy - 95); g.restore();
    g.fillStyle = 'rgba(210,170,255,' + 0.9 * a + ')'; g.beginPath(); g.arc(cx + w.face * 4, cy - 12, 2.2, 0, 7); g.fill();
  }

  // ---------------------------------------------------------------- the page in the Moves screen (the second tab)
  function tabs(g, tab) {
    chip(g, 60, 18, 150, 32, sx('الحركات', 'Moves'), tab === 0, () => { if (G.movesTab !== 0) { G.movesTab = 0; Sound.play('select'); } });
    chip(g, 220, 18, 150, 32, sx('القوى الخارقة', 'Powers'), tab === 1, () => { if (G.movesTab !== 1) { G.movesTab = 1; Sound.play('select'); } });
  }
  function drawPage(g) {
    g.fillStyle = 'rgba(3,5,10,0.97)'; g.fillRect(0, 0, VW, VH);
    const t = G.movesT || 0, ar = LANG.cur === 'ar', sel = clamp(G.powerSel || 0, 0, POWERS.length - 1), m = POWERS[sel], n = sealCount();
    setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, sx('القوى الخارقة', 'Powers'), VW / 2, 34, '#eef5ff');
    tabs(g, 1);
    drawPanel(g, 40, 70, 330, 440);
    POWERS.forEach((p, i) => {
      const y = 112 + i * 66, on = i === sel, kn = known(p.id), rdy = ready(p.id), run = active(p.id);
      (G.menuHits || (G.menuHits = [])).push({ x: 52, y: y - 30, w: 306, h: 60, fn: () => { if (G.powerSel !== i) { G.powerSel = i; Sound.play('select'); } } });
      if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(52, y - 30, 306, 60); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(52.5, y - 29.5, 305, 59); }
      g.save(); g.globalAlpha = kn ? 1 : 0.4;
      g.fillStyle = 'rgba(10,16,30,0.85)'; g.beginPath(); g.arc(ar ? 332 : 82, y, 22, 0, 7); g.fill(); g.strokeStyle = kn ? p.color : 'rgba(140,150,170,0.6)'; g.lineWidth = 2; g.stroke();
      glyph(g, p.id, ar ? 332 : 82, y, 14, kn ? p.color : '#9aa4b8'); g.restore();
      g.textBaseline = 'middle'; g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr';
      const tx = ar ? 300 : 114;
      g.font = font(19, '700'); g.fillStyle = kn ? '#eef5ff' : '#8a96aa'; g.fillText(pname(p), tx, y - 9);
      g.font = font(13, '600'); g.fillStyle = !kn ? '#c9a86a' : run ? '#9fe0d8' : rdy ? '#9ff0a8' : '#d8b070';
      g.fillText(!kn ? sx('تُفتح عند ' + p.seals + ' أختام', 'Opens at ' + p.seals + ' seals') : run ? sx('تعمل الآن', 'Running') : rdy ? sx('جاهزة', 'Ready') : sx('استُعملت: استرح لتتجدّد', 'Spent: rest to renew'), tx, y + 12);
      if (!kn) padlock(g, ar ? 70 : 340, y - 18, 0.8, 'rgba(201,168,106,0.9)');
      else { g.fillStyle = 'rgba(190,205,230,0.7)'; g.font = font(14, '800'); g.textAlign = 'center'; g.direction = 'ltr'; g.fillText(String(i + 1), ar ? 70 : 340, y - 18); }
    });
    drawPanel(g, 390, 70, 530, 440);
    g.save(); g.beginPath(); g.rect(402, 82, 506, 200); g.clip();
    const bg = g.createRadialGradient(655, 180, 10, 655, 180, 260); bg.addColorStop(0, 'rgba(70,60,130,0.55)'); bg.addColorStop(1, 'rgba(6,10,20,0.9)'); g.fillStyle = bg; g.fillRect(402, 82, 506, 200);
    const k = 0.5 + 0.5 * Math.sin(t * 2.4); bloom(g, 655, 180, 150, m.color, known(m.id) ? 0.2 + 0.1 * k : 0.06);
    g.globalAlpha = known(m.id) ? 1 : 0.4; glyph(g, m.id, 655, 180, 72, known(m.id) ? m.color : '#8a96aa'); g.globalAlpha = 1;
    g.restore();
    setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(26, '700'); g.fillStyle = '#ffe9a0'; g.fillText(pname(m), 655, 308);
    g.font = font(16, '500'); g.fillStyle = '#dfe9f6'; wrapText(g, pdesc(m), 480).slice(0, 4).forEach((l, i) => g.fillText(l, 655, 340 + i * 22));
    g.font = font(15, '700'); g.fillStyle = '#9fe0d8'; g.fillText(sx('الزر: ', 'Key: ') + (sel + 1) + sx('   أو اضغط على صورتها في الشاشة', '   or tap its picture on the screen'), 655, 442);
    g.font = font(15, '600'); g.fillStyle = known(m.id) ? '#9ff0a8' : '#e0c27a';
    g.fillText(known(m.id) ? sx('تعلّمتَها من الشيخ. استرح على مقعد فتتجدّد.', 'Learned from the Elder. Rest on a bench and it renews.') : sx('يعلّمها الشيخ في وادي الهمس لمن نال ' + m.seals + ' أختام (لديك ' + n + ')', 'The Elder in Hushvale teaches it at ' + m.seals + ' seals (you have ' + n + ')'), 655, 472);
    g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(sx('↑ ↓ اختيار    ← → التبديل بين الحركات والقوى    Esc رجوع', '↑ ↓ select    ← → Moves / Powers    Esc back'), VW / 2, VH - 16);
  }
  // keys on the Moves screen: Left and Right change the tab, Up and Down choose on the Powers page; true when the page took the key
  function pageKeys() {
    if (Input.pressed('left') || Input.pressed('right')) { G.movesTab = G.movesTab === 1 ? 0 : 1; Sound.play('select'); }
    if (G.movesTab !== 1) return false;
    const n = POWERS.length; G.powerSel = clamp(G.powerSel || 0, 0, n - 1);
    if (Input.pressed('up')) { G.powerSel = (G.powerSel + n - 1) % n; Sound.play('select'); }
    if (Input.pressed('down')) { G.powerSel = (G.powerSel + 1) % n; Sound.play('select'); }
    return true;
  }

  return { POWERS, use, update, draw, drawHUD, drawScreen, drawPage, pageKeys, tabs, drawIcon, glyph, rest, reset, clearActive, elder, newlyEarned, phoenixSaves, onNailHit, dmgK, strikeK, frozenShot,
    known, ready, active, remain, def, pname, pdesc, state: () => S, twinCanvas: () => tmp && tmp.c };
})();
