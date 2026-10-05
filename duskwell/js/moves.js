'use strict';
// The Moves screen (pause menu): the five moves of the effects sheet. Each shows its effect playing, its keys, what it does,
// and where it comes from, whether it is learned or not, so nothing stays hidden behind a shop or a boss.
const MOVES = [
  { id: 'rend', fx: 'moon', art: 'rend', at: [250, 215, 300, 150, 1],
    keys: ['اضغط X مطوّلاً حتى يلمع النصل ثم اتركه', 'Hold X until the blade gleams, then let go'] },
  { id: 'rush', fx: 'rush', art: 'rush', at: [70, 222, 250, 100, 1],
    keys: ['C ثم X وأنت مندفع', 'C, then X while dashing'] },
  { id: 'nova', fx: 'nova', art: 'nova', at: [0, 232, 380, 190, 0.5],
    keys: ['X + F معاً وفي الوعاء 66 روح', 'X + F together with 66 soul'] },
  { id: 'dive', fx: 'dive', ab: 'dive', at: [0, 226, 330, 130, 0.5],
    keys: ['في الهواء: ↓ ثم F', 'In the air: Down, then F'] },
  { id: 'comet', fx: 'comet', ab: 'superdash', at: [30, 222, 210, 110, 1],
    keys: ['Q مطوّلاً على الأرض أو على الجدار', 'Hold Q on the ground or on a wall'] },
];
const moveKnown = m => (m.art ? Gear.hasArt(m.art) : !!P.ab[m.ab]);
const moveName = m => (m.art ? Gear.name('art', m.art) : tr('abil_' + m.ab));
const moveDesc = m => (m.art ? Gear.desc('art', m.art) : tr('abil_' + m.ab + '_d'));
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
    if (on) { g.fillStyle = 'rgba(230,240,255,0.12)'; g.fillRect(52, y - 38, 306, 76); g.strokeStyle = 'rgba(230,240,255,0.7)'; g.lineWidth = 1.5; g.strokeRect(52.5, y - 37.5, 305, 75); }
    g.save(); g.globalAlpha = known ? 1 : 0.4; FxArt.loop(g, q.fx, 104, y, 92, 58, t + i * 0.3); g.restore();
    g.textBaseline = 'middle'; g.textAlign = ar ? 'right' : 'left'; g.direction = ar ? 'rtl' : 'ltr';
    const tx = ar ? 350 : 158;
    g.font = font(20, '700'); g.fillStyle = known ? '#eef5ff' : '#8a96aa'; g.fillText(moveName(q), tx, y - 10);
    g.font = font(14, '600'); g.fillStyle = known ? '#9ff0a8' : '#c9a86a'; g.fillText(known ? '✓ ' + sx('تعلّمتَها', 'Learned') : sx('لم تتعلّمها بعد', 'Not learned yet'), tx, y + 16);
    if (!known) padlock(g, ar ? 70 : 340, y - 20, 0.9, 'rgba(201,168,106,0.9)');
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
  g.font = font(16, '700'); g.fillStyle = '#9fe0d8'; g.fillText(sx('الزر: ', 'Keys: ') + sx(m.keys[0], m.keys[1]), 655, 432);
  g.font = font(15, '600'); g.fillStyle = moveKnown(m) ? '#9ff0a8' : '#e0c27a'; wrapText(g, moveWhere(m), 490).slice(0, 2).forEach((l, i) => g.fillText(l, 655, 462 + i * 20));
  g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(sx('↑ ↓ اختيار    Esc رجوع', '↑ ↓ select    Esc back'), VW / 2, VH - 16);
}
