'use strict';
// The echo stones. In the hall of every guardian that has fallen stands a stone that remembers the fight: speak to it (Up) and the guardian
// comes again, in the same hall, with the doors shut. An echo gives no seal and no gift a second time and costs nothing when it wins (the
// hero comes back to the bench with what he carries), but the time is kept. The second echo, the harsh one, opens when the first is won:
// the guardian is half as strong again and quicker. The first win of each echo pays geo; the records are in G.flags, so they are saved.
const Echo = (() => {
  const TIERS = { 1: { hp: 1, tempo: 1, geo: 0.6 }, 2: { hp: 1.5, tempo: 1.12, geo: 1.5 } };
  const flagOf = (boss, tier) => 'echo' + tier + '_' + boss;
  const best = (boss, tier) => G.flags[flagOf(boss, tier)] || 0;
  const clock = s => Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0');
  const tierName = tier => (tier === 2 ? sx('الصدى القاسي', 'The harsh echo') : sx('الصدى', 'The echo'));

  // where the stone stands: on the floor by the door the hero came in through (the side the arena is entered from)
  function stone() {
    const a = G.arena; if (!a || a.state !== 'won') return null;
    if (a.stone === undefined) {
      const L = G.level, R = L.def, x = (a.def.triggerDir || 1) > 0 ? 3 : L.w - 4;
      const d = R.doors.find(q => (a.def.triggerDir || 1) > 0 ? q.x === 0 : q.x + q.w === L.w);
      a.stone = d ? { px: x * TILE + 16, py: (d.y + d.h) * TILE } : null;
    }
    return a.stone;
  }
  const near = () => { const s = stone(); return s ? nearest([s], P.cx, 54) : null; };

  // Up beside the stone: what it remembers and the choices
  function talk() {
    const a = G.arena, boss = a.def.boss, name = tr('boss_' + boss), b1 = best(boss, 1), b2 = best(boss, 2);
    const lines = [sx('الحجر يحفظ صدى ' + name + '. إن لمسته عاد إلى هذه القاعة وأُغلقت الأبواب. لا ختم ولا هدية مرة ثانية، لكنّ الزمن يُسجَّل، وإن سقطت فلا تفقد شيئاً.',
      'The stone keeps the echo of ' + name + '. Touch it and the guardian returns to this hall and the doors close. No seal and no gift a second time, but the time is kept, and if you fall you lose nothing.')];
    if (b1) lines.push(sx('أفضل زمن: ' + clock(b1) + (b2 ? '    القاسي: ' + clock(b2) : '    الصدى القاسي يُفتح بعد أن تغلب الصدى.'), 'Best time: ' + clock(b1) + (b2 ? '    Harsh: ' + clock(b2) : '    The harsh echo opens once you have won the echo.')));
    const choices = [{ label: tierName(1), fn: () => start(1) }];
    if (b1) choices.push({ label: tierName(2), fn: () => start(2) });
    choices.push({ label: sx('اتركه', 'Leave it'), fn() {} });
    return { lines, i: 0, t: 0, choices, sel: 0 };
  }

  // the guardian comes again
  function start(tier) {
    const a = G.arena; if (!a || a.state !== 'won') return;
    a.state = 'fight'; a.trial = { tier, t: 0 };
    for (const gt of a.def.gates) closeGate(gt);
    G.flash = 0.5; Sound.play('roar');
    spawnArenaBoss(a, TIERS[tier].hp, TIERS[tier].tempo);
  }

  // the clock runs while the guardian fights
  function update(dt) {
    const a = G.arena;
    if (a && a.trial && G.boss && G.boss.state === 'fight') a.trial.t += dt;
  }

  // the guardian fell again: the time, the record, the first-win geo; the doors open and nothing else is given
  function won(b) {
    const a = G.arena, tl = a.trial, boss = a.def.boss, k = flagOf(boss, tl.tier), prev = G.flags[k] || 0, t = Math.max(0.1, Math.round(tl.t * 10) / 10);
    const rec = !prev || t < prev;
    if (rec) G.flags[k] = t;
    const geo = prev ? 0 : Math.round(b.geo * TIERS[tl.tier].geo);
    Mind.killed(b, b.lastHow);
    a.state = 'won'; a.trial = null; G.boss = null; G.bossBarShow = false;
    for (const e of G.enemies) if (e.kind === 'brood_child') e.dead = true;
    if (geo) G.dropGeo(b.cx, b.cy, geo);
    G.flash = 0.8; Sound.boss(false); openGates();
    G.burst(b.cx, b.cy, 40, { color: '#9fe0d8', speed: 320, life: 1.1, size: 4, grav: -30 });
    G.toastMsg(tierName(tl.tier) + ': ' + clock(t) + (!prev ? sx('   أول انتصار', '   first win') : rec ? sx('   رقم قياسي جديد', '   a new record') : sx('   الأفضل ', '   best ') + clock(prev)) + (geo ? '   +' + geo : ''), 5);
  }

  // the clock under the boss bar
  function hud(g) {
    const a = G.arena, b = G.boss; if (!a || !a.trial || !b || b.state === 'intro') return;
    const bt = best(a.def.boss, a.trial.tier);
    g.save(); setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(15, '700');
    textShadow(g, tierName(a.trial.tier) + '   ' + clock(a.trial.t) + (bt ? '   ·   ' + sx('الأفضل ', 'Best ') + clock(bt) : ''), VW / 2, VH - 16, '#9fe0d8', 4);
    g.restore();
  }

  // the stone: a standing slab with a rune that breathes; a small pip for each echo won
  function draw(g, t) {
    const s = stone(); if (!s) return;
    const boss = G.arena.def.boss, p = G.player, close = p && !p.dead && Math.abs(p.cx - s.px) < 90, br = 0.5 + 0.5 * Math.sin(t * 2.2);
    g.save(); g.translate(s.px, s.py);
    const gl = g.createRadialGradient(0, -52, 4, 0, -52, 74); gl.addColorStop(0, 'rgba(159,224,216,' + (0.28 + 0.16 * br + (close ? 0.15 : 0)) + ')'); gl.addColorStop(1, 'rgba(159,224,216,0)');
    g.fillStyle = gl; g.fillRect(-80, -130, 160, 150);
    g.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(g, 0, -1, 30, 5); g.fill();
    g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-26, 0); g.lineTo(-24, -10); g.lineTo(24, -10); g.lineTo(26, 0); g.closePath();                      // the footing
    g.fillStyle = '#2a3140'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
    g.beginPath(); g.moveTo(-19, -10); g.lineTo(-21, -66); g.quadraticCurveTo(-20, -96, 0, -99); g.quadraticCurveTo(20, -96, 21, -66); g.lineTo(19, -10); g.closePath();    // the slab
    const sg = g.createLinearGradient(-20, 0, 20, 0); sg.addColorStop(0, '#46526a'); sg.addColorStop(0.55, '#323c50'); sg.addColorStop(1, '#222a3a');
    g.fillStyle = sg; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.stroke();
    g.strokeStyle = 'rgba(20,26,38,0.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-12, -30); g.lineTo(-8, -22); g.lineTo(-11, -14); g.moveTo(11, -78); g.lineTo(7, -70); g.stroke();      // cracks
    const ra = 0.55 + 0.35 * br + (close ? 0.1 : 0);                                                                              // the rune
    g.strokeStyle = 'rgba(159,224,216,' + ra + ')'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.arc(0, -58, 12, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, -72); g.lineTo(0, -44); g.moveTo(-8, -66); g.lineTo(0, -58); g.lineTo(8, -66); g.stroke();
    for (let i = 0; i < 3; i++) {                                                                                                 // motes drifting up
      const k = ((t * 0.35 + i / 3) % 1); g.fillStyle = 'rgba(190,240,232,' + (0.8 * (1 - k)) + ')'; g.beginPath(); g.arc(Math.sin(t + i * 2.1) * 14, -40 - k * 70, 1.8, 0, Math.PI * 2); g.fill();
    }
    for (let q = 1; q <= 2; q++) {                                                                                                // the echoes won
      g.beginPath(); g.arc(q === 1 ? -6 : 6, 6, 3, 0, Math.PI * 2);
      g.fillStyle = best(boss, q) ? (q === 1 ? '#ffd24a' : '#ff7a6a') : 'rgba(10,14,22,0.7)'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
    }
    g.restore();
  }

  return { stone, near, talk, start, update, won, hud, draw, best, clock, TIERS, flagOf };
})();
