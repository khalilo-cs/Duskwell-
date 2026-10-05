'use strict';
// The training post in the village: a wooden post wrapped in straw and cloth, with a painted target board. It takes every blow and never
// falls, gives no soul and no geo, is not in the bestiary and teaches the creatures nothing. It shows the damage of the last blow and of
// the run of blows, so a new move can be tried until it is known. (It is added to ENEMY_TYPES after mind.js has wrapped the others.)
class Dummy extends Enemy {
  constructor(d) {
    super(d, 46, 92);
    this.hp = 1e9; this.maxHp = 1e9; this.geo = 0; this.dmg = 0; this.kb = 0; this.dummy = true; this.blood = '#d9b77a';
    this.sway = 0; this.last = 0; this.total = 0; this.count = 0; this.idleT = 9; this.nums = [];
  }
  update(dt) {
    this.tick(dt);
    this.sway *= Math.pow(0.03, dt);
    this.idleT += dt;
    if (this.idleT > 2.4) { this.total = 0; this.count = 0; }
    for (const n of this.nums) n.t += dt;
    this.nums = this.nums.filter(n => n.t < 1.1);
  }
  hurt(dmg, dir, how) {
    this.lastHow = how; this.flash = 0.12; this.sway = (dir || 1) * 0.3; this.idleT = 0;
    this.last = Math.round(dmg); this.total += this.last; this.count++;
    this.nums.push({ v: this.last, t: 0, dx: rand(-16, 16) });
    Sound.play('hit'); G.hitstop(how === 'spell' ? 0.02 : 0.04);
    G.burst(this.cx, this.cy - 10, 7, { color: pick(['#d9b77a', '#a8804a', '#e8d4a0']), speed: 200, life: 0.4, size: 3 });
    G.slashFx(this.cx, this.cy, dir || 1);
    return true;
  }
  kill() { /* it does not fall */ }
}
ENEMY_TYPES.dummy = Dummy;

Art.enemy.dummy = function (g, e, t) {
  const fl = e.flash > 0, wood = fl ? '#fff4dc' : '#6a4a30', woodD = fl ? '#e8d4a8' : '#4a3220', straw = fl ? '#fff0c0' : '#c9a66a', cloth = fl ? '#ffd8d0' : '#7a2f2f';
  g.save(); g.translate(e.cx, e.y + e.h);
  g.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(g, 0, -1, 26, 5); g.fill();
  g.rotate(e.sway * 0.4 * Math.cos(t * 14) * 0.3 + e.sway * 0.35);                  // it rocks on its foot after a blow and settles
  const beam = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x, y, w, h); };
  beam(-5, -92, 10, 92, wood);                                                      // the post
  g.fillStyle = woodD; g.fillRect(-5, -92, 3, 92);
  beam(-28, -66, 56, 8, wood);                                                      // the arms
  // the body: a bundle of straw, tied
  g.beginPath(); g.moveTo(-17, -74); g.quadraticCurveTo(-23, -46, -15, -22); g.lineTo(15, -22); g.quadraticCurveTo(23, -46, 17, -74); g.closePath();
  g.fillStyle = straw; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.lineJoin = 'round'; g.stroke();
  g.strokeStyle = 'rgba(120,84,40,0.65)'; g.lineWidth = 1.2; g.beginPath();
  for (let k = -3; k <= 3; k++) { g.moveTo(k * 5, -70); g.lineTo(k * 5.8, -26); }
  g.stroke();
  g.fillStyle = cloth; g.fillRect(-18, -50, 36, 6); g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(-18, -50, 36, 6);       // a strip of cloth round the waist
  g.fillStyle = 'rgba(40,20,10,0.55)'; for (const x of [-12, -4, 4, 12]) g.fillRect(x - 0.8, -50, 1.6, 6);
  // the target board on the chest
  g.save(); g.translate(0, -48); ellipse(g, 0, 0, 15, 15); g.fillStyle = '#e9dcc0'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
  for (const [r, c] of [[11, '#a33a30'], [7.5, '#e9dcc0'], [4, '#a33a30']]) { ellipse(g, 0, 0, r, r); g.fillStyle = fl ? '#fff' : c; g.fill(); }
  g.restore();
  // the head: a sack tied at the neck, with a stitched cross
  g.beginPath(); g.arc(0, -84, 13, 0, Math.PI * 2); g.fillStyle = fl ? '#fff4e0' : '#b89a68'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2.4; g.stroke();
  g.fillStyle = cloth; g.fillRect(-9, -73, 18, 4); g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(-9, -73, 18, 4);
  g.strokeStyle = 'rgba(40,24,10,0.8)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, -88); g.lineTo(-2, -84); g.moveTo(-2, -88); g.lineTo(-6, -84); g.moveTo(3, -88); g.lineTo(7, -84); g.moveTo(7, -88); g.lineTo(3, -84); g.moveTo(-5, -78); g.lineTo(5, -78); g.stroke();
  g.restore();
  // the numbers: each blow floats up, and the run of blows is kept on a small plate above
  g.save(); setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const n of e.nums) { const k = n.t / 1.1; g.globalAlpha = 1 - k * k; g.font = font(20, '800'); textShadow(g, String(n.v), e.cx + n.dx, e.y - 14 - k * 36, '#ffe9a0', 4); }
  if (e.idleT < 2.4 && e.count > 0) {
    g.globalAlpha = Math.min(1, (2.4 - e.idleT) / 0.4); g.font = font(13, '700');
    const txt = sx('المجموع ', 'Total ') + e.total + '  ×' + e.count, w = g.measureText(txt).width + 18;
    g.fillStyle = 'rgba(6,10,20,0.85)'; g.fillRect(e.cx - w / 2, e.y - 62, w, 20); g.strokeStyle = 'rgba(255,233,160,0.7)'; g.lineWidth = 1; g.strokeRect(e.cx - w / 2 + 0.5, e.y - 61.5, w - 1, 19);
    g.fillStyle = '#9fe0d8'; g.fillText(txt, e.cx, e.y - 52);
  }
  g.restore();
};
