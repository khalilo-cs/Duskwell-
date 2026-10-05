'use strict';
// The Moves screen (pause menu): the five moves of the effects sheet. Each shows its effect playing, its keys, what it does,
// and where it comes from, whether it is learned or not, so nothing stays hidden behind a shop or a boss.
// And the teaching (Coach, below): when a move is learned its banner plays the effect and says the keys, a tip with the keys stays on
// the screen until the move is done once, the pause menu and this screen mark it new, and the training post in the village takes the blows.
const MOVES = [
  { id: 'rend', fx: 'moon', art: 'rend', at: [250, 215, 300, 150, 1],
    keys: ['اضغط X مطوّلاً حتى يلمع النصل ثم اتركه', 'Hold X until the blade gleams, then let go'],
    touch: ['اضغط زر الضرب مطوّلاً حتى يلمع النصل ثم اتركه', 'Hold the Strike button until the blade gleams, then let go'] },
  { id: 'rush', fx: 'rush', art: 'rush', at: [70, 222, 250, 100, 1],
    keys: ['C ثم X وأنت مندفع', 'C, then X while dashing'],
    touch: ['اضغط زر الاندفاع ثم زر الضرب', 'Press Dash, then Strike'] },
  { id: 'nova', fx: 'nova', art: 'nova', at: [0, 232, 380, 190, 0.5],
    keys: ['X + F معاً وفي الوعاء 66 روح', 'X + F together with 66 soul'],
    touch: ['زر الضرب وزر الروح معاً وفي الوعاء 66 روح', 'Strike and Soul together with 66 soul'] },
  { id: 'dive', fx: 'dive', ab: 'dive', at: [0, 226, 330, 130, 0.5],
    keys: ['في الهواء: ↓ ثم F', 'In the air: Down, then F'],
    touch: ['في الهواء: السهم ↓ مع زر الروح', 'In the air: Down with the Soul button'] },
  { id: 'comet', fx: 'comet', ab: 'superdash', at: [30, 222, 210, 110, 1],
    keys: ['Q مطوّلاً على الأرض أو على الجدار', 'Hold Q on the ground or on a wall'],
    touch: ['اضغط زر الشهاب مطوّلاً ثم اتركه', 'Hold the Comet button, then let go'] },
];
const moveKnown = m => (m.art ? Gear.hasArt(m.art) : !!P.ab[m.ab]);
const moveName = m => (m.art ? Gear.name('art', m.art) : tr('abil_' + m.ab));
const moveDesc = m => (m.art ? Gear.desc('art', m.art) : tr('abil_' + m.ab + '_d'));
const moveOf = id => MOVES.find(m => m.id === id);
// the touch buttons stand in for the keys on a phone
const isTouch = () => { try { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } };
const moveKeys = m => (isTouch() ? sx(m.touch[0], m.touch[1]) : sx(m.keys[0], m.keys[1]));
// the abilities of the world that are moves of the sheet
const MOVE_OF_ABILITY = { dive: 'dive', superdash: 'comet' };

// ---- the teaching. Flags (saved with the game): mvnew_<id> learned from now on, mvseen_<id> looked at on the Moves screen,
// mvdid_<id> done once. A save from before this has none of them, so it is not reminded of what it already knows.
const Coach = (() => {
  const F = () => G.flags || (G.flags = {});
  const fresh = id => !!F()['mvnew_' + id] && !F()['mvdid_' + id];
  // the move to remind of: the latest learned and not yet done
  const pending = () => (G.coach && fresh(G.coach.id) ? moveOf(G.coach.id) : MOVES.find(m => fresh(m.id)) || null);
  return {
    // a move has just been learned: mark it, and let the tip start
    learned(id) { F()['mvnew_' + id] = true; delete F()['mvdid_' + id]; delete F()['mvseen_' + id]; G.coach = { id, left: 14, rooms: 0, room: G.level && G.level.id, t: 0 }; },
    // the hero has just done the move
    did(id) {
      if (!fresh(id)) return false;
      F()['mvdid_' + id] = true; if (G.coach && G.coach.id === id) G.coach = null;
      G.toastMsg(sx('أحسنت! أتقنتَ ', 'Well done! You have done ') + moveName(moveOf(id)), 2.6); Sound.play('equip');
      G.ring(P.cx, P.cy, '#9ff0a8', 0.9);
      return true;
    },
    pending,
    // the moves that are new and not looked at yet (the pause menu and the Moves screen mark them)
    unseen: () => MOVES.filter(m => F()['mvnew_' + m.id] && !F()['mvseen_' + m.id]),
    seen(id) { F()['mvseen_' + id] = true; },
    isNew: id => !!F()['mvnew_' + id] && !F()['mvseen_' + id],
    // each step of play: the tip stays 14 seconds after learning and comes back for 7 seconds in each of the next four rooms
    update(dt) {
      const m = pending();
      if (!m) { G.coach = null; return; }
      if (!G.coach || G.coach.id !== m.id) G.coach = { id: m.id, left: 7, rooms: 0, room: G.level && G.level.id, t: 0 };
      const c = G.coach; c.t += dt;
      if (G.level && c.room !== G.level.id) { c.room = G.level.id; if (c.rooms < 4) { c.rooms++; c.left = 7; } }
      if (c.left > 0) c.left -= dt;
    },
    // one line under the keys, about what the move needs right now
    note(m) {
      if (m.id === 'nova' && P.soul < Gear.NOVA_COST) return sx('الروح ' + Math.floor(P.soul) + ' / ' + Gear.NOVA_COST, 'Soul ' + Math.floor(P.soul) + ' / ' + Gear.NOVA_COST);
      if (m.id === 'rush' && !P.ab.dash) return sx('تحتاج اندفاع الظل', 'Needs the Shadow Dash');
      if (m.id === 'dive' && P.onGround) return sx('اقفز أولاً ثم انقضّ', 'Jump first, then dive');
      if (m.id === 'comet' && !P.onGround && !P.sliding) return sx('قف على الأرض أو الجدار', 'Stand on the ground or a wall');
      if (G.level && G.level.id === 'town' && G.enemies.some(e => e.dummy)) return sx('جرّبها على دمية التدريب في القرية', 'Try it on the training post in the village');
      return '';
    },
  };
})();

// the tip at the foot of the picture: the effect, the name, the keys and, while the blade is charging, how far it has got
function drawCoach(g) {
  const c = G.coach; if (!c || c.left <= 0 || G.state !== 'play' || G.dialog) return;
  const m = moveOf(c.id); if (!m) return;
  const k = Math.min(1, c.t / 0.4, c.left / 0.5), t = G.t, ar = LANG.cur === 'ar', w = 560, h = 66, x = (VW - w) / 2, y = VH - 78 + (1 - k) * 30;
  g.save(); g.globalAlpha = k; setDir(g);
  g.fillStyle = 'rgba(6,10,20,0.88)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(255,233,160,0.75)'; g.lineWidth = 1.6; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  FxArt.loop(g, m.fx, x + 52, y + h / 2, 84, 52, t);
  g.textBaseline = 'middle'; g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr';
  const tx = ar ? x + w - 16 : x + 104, note = Coach.note(m);
  g.font = font(18, '700'); g.fillStyle = '#ffe9a0'; g.fillText(moveName(m), tx, y + 17);
  g.font = font(14, '600'); g.fillStyle = '#9fe0d8'; g.fillText(moveKeys(m), tx, y + 38);
  if (note) { g.font = font(13, '500'); g.fillStyle = '#e0c27a'; g.fillText(note, tx, y + 56); }
  if (m.id === 'rend' && P.rendT > 0) {                                // the blade charging
    const f = Math.min(1, P.rendT / Gear.REND_CHARGE); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 8, y + h - 6, w - 16, 3); g.fillStyle = f >= 1 ? '#ffffff' : '#9fc4ff'; g.fillRect(x + 8, y + h - 6, (w - 16) * f, 3);
  }
  g.restore();
}
// where it comes from, as words (read from the shop and the world, so the text never goes stale)
function moveWhere(m) {
  if (m.art) {
    const it = SHOPS.smith.items.find(i => i.gear && i.gear[1] === m.art), lock = it && it.lock ? sx(it.lock[0], it.lock[1]) : '';
    return sx('يعلّمه الحدّاد في القرية مقابل ', 'Taught by the smith in the village for ') + (it ? it.price : '?') + (lock ? ' — ' + lock : '');
  }
  const room = m.ab === 'dive' ? 'sp4' : 'fd2', area = tr('area_' + WORLD.rooms[room].area);
  return m.ab === 'dive' ? sx('جائزة الحارس الأخير في ' + area, 'Prize of the last guardian in ' + area) : sx('تجدها مخبّأة في ' + area, 'Hidden away in ' + area);
}

function updateMoves(dt) {
  G.movesT = (G.movesT || 0) + dt;
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'pause'; Input.consume('pause'); Input.consume('map'); Sound.play('select'); return; }
  if (Input.pressed('up')) { G.moveSel = (G.moveSel + MOVES.length - 1) % MOVES.length; Sound.play('select'); }
  if (Input.pressed('down')) { G.moveSel = (G.moveSel + 1) % MOVES.length; Sound.play('select'); }
  Coach.seen(MOVES[clamp(G.moveSel || 0, 0, MOVES.length - 1)].id);                   // the one in view is looked at
}

// a small padlock for the moves not learned yet
function padlock(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = col; g.lineWidth = 2.2; g.beginPath(); g.arc(0, -3, 5, Math.PI, 0); g.stroke();
  g.fillStyle = col; g.fillRect(-7, -3, 14, 11);
  g.restore();
}

function drawMoves(g) {
  g.fillStyle = 'rgba(3,5,10,0.97)'; g.fillRect(0, 0, VW, VH);
  const t = G.movesT || 0, ar = LANG.cur === 'ar', sel = clamp(G.moveSel || 0, 0, MOVES.length - 1), m = MOVES[sel];
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, sx('الحركات', 'Moves'), VW / 2, 34, '#eef5ff');
  // left: the five, each with its effect playing
  drawPanel(g, 40, 70, 330, 440);
  MOVES.forEach((q, i) => {
    const y = 112 + i * 82, on = i === sel, known = moveKnown(q);
    (G.menuHits || (G.menuHits = [])).push({ x: 52, y: y - 38, w: 306, h: 76, fn: () => { if (G.moveSel !== i) { G.moveSel = i; Sound.play('select'); } } });
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(52, y - 38, 306, 76); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(52.5, y - 37.5, 305, 75); }
    g.save(); g.globalAlpha = known ? 1 : 0.4; FxArt.loop(g, q.fx, 104, y, 92, 58, t + i * 0.3); g.restore();
    g.textBaseline = 'middle'; g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr';
    const tx = ar ? 350 : 158;
    g.font = font(20, '700'); g.fillStyle = known ? '#eef5ff' : '#8a96aa'; g.fillText(moveName(q), tx, y - 10);
    g.font = font(14, '600'); g.fillStyle = known ? '#9ff0a8' : '#c9a86a'; g.fillText(known ? '✓ ' + sx('تعلّمتَها', 'Learned') : sx('لم تتعلّمها بعد', 'Not learned yet'), tx, y + 16);
    if (!known) padlock(g, ar ? 70 : 340, y - 20, 0.9, 'rgba(201,168,106,0.9)');
    else if (Coach.isNew(q.id)) { g.fillStyle = '#ffd86b'; g.fillRect(ar ? 56 : 306, y - 30, 40, 16); g.fillStyle = '#2a1c00'; g.font = font(11, '800'); g.textAlign = 'center'; g.fillText(sx('جديد', 'NEW'), ar ? 76 : 326, y - 21); }
  });
  // right: the selected one in a stage of its own
  drawPanel(g, 390, 70, 530, 440);
  g.save(); g.beginPath(); g.rect(402, 82, 506, 214); g.clip();
  const bg = g.createRadialGradient(655, 250, 10, 655, 250, 280); bg.addColorStop(0, 'rgba(60,80,120,0.6)'); bg.addColorStop(1, 'rgba(6,10,20,0.9)'); g.fillStyle = bg; g.fillRect(402, 82, 506, 214);
  g.fillStyle = 'rgba(160,185,225,0.16)'; g.fillRect(402, 262, 506, 2);
  const hx = 600; g.fillStyle = 'rgba(0,0,0,0.4)'; ellipse(g, hx, 264, 36, 6); g.fill();
  Art.drawHeroPreview(g, hx, 262, 2.3, t);
  g.globalAlpha = moveKnown(m) ? 1 : 0.85; FxArt.loop(g, m.fx, hx + m.at[0], m.at[1], m.at[2], m.at[3], t, m.at[4]);
  g.restore();
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font(26, '700'); g.fillStyle = '#ffe9a0'; g.fillText(moveName(m), 655, 322);
  g.font = font(16, '500'); g.fillStyle = '#dfe9f6'; wrapText(g, moveDesc(m), 480).slice(0, 3).forEach((l, i) => g.fillText(l, 655, 354 + i * 22));
  g.font = font(16, '700'); g.fillStyle = '#9fe0d8'; g.fillText(sx('الزر: ', 'Keys: ') + moveKeys(m), 655, 432);
  g.font = font(15, '600'); g.fillStyle = moveKnown(m) ? '#9ff0a8' : '#e0c27a'; wrapText(g, moveWhere(m), 490).slice(0, 2).forEach((l, i) => g.fillText(l, 655, 462 + i * 20));
  g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(sx('↑ ↓ اختيار    Esc رجوع', '↑ ↓ select    Esc back'), VW / 2, VH - 16);
}
