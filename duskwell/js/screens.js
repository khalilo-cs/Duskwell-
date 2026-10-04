'use strict';
// Full-screen menus that are not the world: the bestiary (and, below, the equipment screen).

// ---------------------------------------------------------------- the bestiary
function bestiarySeen(i) { const b = BESTIARY[i]; return !!G.seen[(b.boss ? 'b:' : 'e:') + b.k]; }
// how many entries have been met
function bestiaryCount() { return BESTIARY.filter((b, i) => bestiarySeen(i)).length; }
// bestiary input: back out, or move the selection
function updateBestiary(dt) {
  if (Input.pressed('pause') || Input.pressed('map') || Input.pressed('attack')) { G.state = 'pause'; Input.consume('pause'); Input.consume('map'); Sound.play('select'); return; }
  const n = BESTIARY.length, move = d => { G.bestSel = (G.bestSel + d + n) % n; G.bestT = 0; Sound.play('select'); };
  if (Input.pressed('left')) move(-1);
  if (Input.pressed('right')) move(1);
  if (Input.pressed('up')) move(-6);
  if (Input.pressed('down')) move(6);
  G.bestT += dt;
}
// bestiary screen: dots strip, portrait stage and the text panel
function drawBestiary(g) {
  g.fillStyle = 'rgba(3,5,10,0.96)'; g.fillRect(0, 0, VW, VH);
  const n = BESTIARY.length, i = G.bestSel, b = BESTIARY[i], seen = bestiarySeen(i), ar = LANG.cur === 'ar';
  setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(32, '700'); textShadow(g, tr('bestiary'), VW / 2, 34, '#eef5ff');
  g.font = font(15, '600'); g.fillStyle = '#9db5d6'; g.direction = 'ltr'; g.fillText(bestiaryCount() + ' / ' + n, VW / 2, 62);
  // the strip of portraits' dots: filled when met, gold for a boss
  const dx = 11, x0 = VW / 2 - (n - 1) * dx / 2;
  for (let k = 0; k < n; k++) { const s = bestiarySeen(k), on = k === i, x = x0 + k * dx, y = 80; g.fillStyle = BESTIARY[k].boss ? (s ? '#ffd98a' : '#5a4a2a') : (s ? '#9fd8ff' : '#2a3550'); g.beginPath(); g.arc(x, y, on ? 4.6 : 2.8, 0, 7); g.fill(); if (on) { g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke(); } }
  // the stage
  drawPanel(g, 40, 100, 520, 400);
  g.save(); g.beginPath(); g.rect(46, 106, 508, 388); g.clip();
  const sg = g.createRadialGradient(300, 330, 20, 300, 330, 320); sg.addColorStop(0, 'rgba(60,76,110,0.55)'); sg.addColorStop(1, 'rgba(8,12,22,0.2)'); g.fillStyle = sg; g.fillRect(46, 106, 508, 388);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(46, 436, 508, 58);
  if (seen) {
    const e = Art.creatureDummy(b.boss, 0) && null, dm = Art.creatureDummy(b.k, !!b.boss), w = dm ? dm.w : 40, h = dm ? dm.h : 40;
    const s = b.s || clamp(Math.min(400 / (w * 1.9), 300 / (h * 1.7)), 1.2, 5.2);
    const fly = FLYING.has(b.k), cy = fly ? 290 : 436;
    Art.drawCreature(g, b.k, !!b.boss, 300, cy, s, G.t, { face: 1, state: G.bestT % 4 > 2.8 && !b.boss ? 'anticipation' : undefined, tele: b.boss && G.bestT % 5 > 3.6 ? 1 : 0, stateT: 0.3 });
  } else {
    g.font = font(120, '700'); g.fillStyle = 'rgba(120,140,180,0.25)'; g.direction = 'ltr'; g.fillText('?', 300, 290);
  }
  g.restore();
  // the text panel
  drawPanel(g, 580, 100, 340, 400);
  setDir(g); g.textAlign = 'center';
  if (seen) {
    g.font = font(28, '700'); textShadow(g, bestiaryName(b), 750, 140, b.boss ? '#ffd98a' : '#eef5ff');
    g.font = font(16, '600'); g.fillStyle = b.boss ? '#e8c070' : '#9db5d6'; g.fillText((b.boss ? tr('boss') + '  ·  ' : '') + tr('area_' + b.area), 750, 172);
    const dm = Art.creatureDummy(b.k, !!b.boss);
    if (dm && dm.maxHp) { g.font = font(16, '600'); g.fillStyle = '#c8d6ec'; g.direction = 'ltr'; g.fillText(tr('hp') + ': ' + dm.maxHp, 750, 198); setDir(g); }
    g.font = font(19, '500'); g.fillStyle = '#e1ecf8';
    wrapText(g, bestiaryDesc(b), 300).forEach((l, k) => g.fillText(l, 750, 244 + k * 27));
  } else {
    g.font = font(26, '700'); g.fillStyle = '#6d7a8c'; g.fillText('؟؟؟', 750, 150); g.font = font(18, '500'); g.fillText(tr('bestiaryUnknown'), 750, 196);
  }
  g.font = font(15, '500'); g.fillStyle = 'rgba(200,215,240,0.6)'; g.fillText(tr('bestiaryHint'), VW / 2, VH - 22);
}
