'use strict';
// The pixel-art hero (blue or dark version) and the husk, drawn through the lit sprite engine in
// pixel.js. HeroStyle remembers which look the player picked (pause menu: "Hero look").
const HeroStyle = (() => {
  const LIST = ['blue', 'dark', 'vector'];
  let i = 0;
  try { const v = localStorage.getItem('duskwell_hero_style'); if (LIST.includes(v)) i = LIST.indexOf(v); } catch (e) { /* ignore */ }
  return {
    cur: () => LIST[i],
    // the sheet in use: the artist's own, with the cloak's two blues swapped for the equipped cloak's colours
    sheet() {
      const base = 'hero_' + LIST[i], id = typeof Gear !== 'undefined' ? Gear.cloak() : 'drifter';
      if (id === 'drifter' || LIST[i] === 'vector') return base;
      const c = parseInt(Gear.def('cloak', id).color.slice(1), 16), at = (k, kk) => { const f = v => Math.min(255, Math.round(v * kk)); return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255); };
      const swaps = LIST[i] === 'blue' ? { 0x3d5da4: at(0, 1.1), 0x192c3e: at(0, 0.45) } : { 0x1d2036: at(0, 0.7), 0x18182f: at(0, 0.4) };
      return Pixel.variant(base, id, swaps) || base;
    },
    pixel: () => LIST[i] !== 'vector' && Pixel.ready('hero_' + LIST[i]),
    next() { i = (i + 1) % LIST.length; try { localStorage.setItem('duskwell_hero_style', LIST[i]); } catch (e) { /* ignore */ } },
    label() { return { blue: ['بكسل أزرق', 'Pixel blue'], dark: ['بكسل داكن', 'Pixel dark'], vector: ['مرسوم بالتفصيل', 'Detailed ink'] }[LIST[i]][LANG.cur === 'ar' ? 0 : 1]; },
  };
})();

const SLASH_IMG = new Image(); SLASH_IMG.src = SLASH_SRC;

// which animation and pose the hero is in this frame
function heroPose(p, t) {
  const m = Pixel.meta(HeroStyle.sheet()), A = m.anims;
  const o = { anim: 'idle', frame: 0, sx: 1, sy: 1, rot: 0, flash: 0, dy: 0 };
  const sdGo = !!(p.sd && p.sd.state === 'go'), charge = p.sd && p.sd.state === 'charge' ? clamp(p.sd.t / SD_CHARGE, 0, 1) : 0;
  const pick = (a, k) => A[a][Math.min(A[a].length - 1, k)];
  if (p.atkT > 0) {
    const pr = 1 - clamp(p.atkT / 0.16, 0, 1);
    o.anim = 'attack'; o.frame = pick('attack', Math.floor(pr * A.attack.length));
  } else if (sdGo) { o.anim = 'run'; o.frame = A.run[1 % A.run.length]; o.sx = 1.35; o.sy = 0.82; o.rot = 0.12; }
  else if (charge > 0) { o.frame = A.idle[0]; o.sy = 1 - 0.14 * charge; o.sx = 1 + 0.1 * charge; o.dy = 0; }
  else if (p.dashT > 0) { o.anim = 'run'; o.frame = A.run[2 % A.run.length]; o.sx = 1.3; o.sy = 0.85; o.rot = 0.14; }
  else if (p.diving) { o.anim = 'fall'; o.frame = A.fall[0]; o.sx = 0.8; o.sy = 1.22; }
  else if (p.wailT > 0) { o.anim = 'jump'; o.frame = A.jump[0]; o.sx = 0.9; o.sy = 1.14; o.dy = -4; }          // stretched, face to the sky
  else if (p.sitting) { o.frame = A.idle[0]; o.sy = 0.86; o.dy = 4; }
  else if (p.hurtT > 0) { o.anim = 'fall'; o.frame = A.fall[0]; o.flash = 0.55; o.rot = -0.2; }
  else if (p.sliding) { o.anim = 'fall'; o.frame = A.fall[0]; o.rot = 0.1; o.sy = 1.04; }
  else if (!p.onGround) { o.anim = p.vy < 0 ? 'jump' : 'fall'; o.frame = A[o.anim][0]; const s = 1 + clamp(-p.vy / 2600, -0.05, 0.1); o.sy = s; o.sx = 1 / s; }
  else if (p.landT > 0) { o.frame = A.idle[0]; o.sy = 0.88; o.sx = 1.08; }
  else if (Math.abs(p.vx) > 30) { o.anim = 'run'; o.frame = Pixel.frameOf(HeroStyle.sheet(), 'run', t * (0.6 + Math.abs(p.vx) / 500)); }
  else { o.frame = Pixel.frameOf(HeroStyle.sheet(), 'idle', t); }
  o.charge = charge; o.sdGo = sdGo;
  return o;
}

// the nail's crescent: the artist's drawing, enlarged and turned for up and down strikes
function drawSlash(g, p, fx, fy, k) {
  if (!SLASH_IMG.complete || !SLASH_IMG.naturalWidth) return;
  const m = Pixel.meta(HeroStyle.sheet()), sl = m.slash, pr = 1 - clamp(p.atkT / 0.16, 0, 1);
  const grow = (1.1 + 0.5 * pr) * (Charms.has('reach') ? 1.3 : 1), a = pr < 0.5 ? 0 : 1 - (pr - 0.5) * 1.4;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = a;
  if (p.atkDir === 'side') g.translate(fx, fy), g.scale(p.face * k, k);
  else g.translate(fx, fy - 12 * k), g.rotate(p.atkDir === 'up' ? -Math.PI / 2 : Math.PI / 2), g.scale(k, k);
  const ox = sl.x, oy = p.atkDir === 'side' ? sl.y + sl.h / 2 : sl.y + sl.h / 2 + 12;
  g.translate(ox, oy); g.scale(grow, grow);
  g.drawImage(SLASH_IMG, 0, -sl.h / 2);
  g.restore();
  const bx = p.atkDir === 'side' ? fx + p.face * (sl.x + sl.w * 0.9) * k : fx, by = p.atkDir === 'up' ? fy - 58 : p.atkDir === 'down' ? fy + 8 : fy + (sl.y + sl.h / 2) * k;
  bloom(g, bx, by, 46, '#e8f0ff', 0.28 * a);
}

// returns true when it drew the hero
Art.drawPixelHero = function (g, p, t, alpha) {
  if (!HeroStyle.pixel()) return false;
  const name = HeroStyle.sheet(), o = heroPose(p, t), k = Pixel.SCALE, feetY = p.y + p.h + o.dy;
  Pixel.shadow(g, p.cx, p.y + p.h, 20);
  Pixel.draw(g, name, o.frame, p.cx, feetY, { face: p.face, sx: o.sx, sy: o.sy, rot: o.rot * p.face, flash: o.flash, alpha, scale: k });
  if (p.atkT > 0 && Gear.weapon() === 'nail') drawSlash(g, p, p.cx, feetY, k);
  return true;
};
Art.drawPixelGhosts = function (g, p, t) {
  if (!HeroStyle.pixel()) return false;
  const name = HeroStyle.sheet(), A = Pixel.meta(name).anims;
  for (const gh of p.ghost) {
    const life = gh.sd ? 0.26 : 0.22, a = (gh.sd ? 0.55 : 0.45) * (1 - (t - gh.t) / life);
    if (a > 0) Pixel.silhouette(g, name, A.run[2 % A.run.length], gh.x + p.w / 2, gh.y + p.h, { face: gh.face, sx: 1.3, sy: 0.85, tint: gh.sd ? '#ff9a50' : '#4a6aa8', alpha: a, scale: Pixel.SCALE });
  }
  return true;
};

// ---------------------------------------------------------------- the husk
Art.enemy.husk = function (g, e, t) {
  if (!Pixel.ready('husk')) return Art.enemy.crawler(g, e, t);
  const A = Pixel.meta('husk').anims;
  let anim = 'idle';
  if (!e.onGround) anim = e.vy < 0 ? 'jump' : 'fall';
  else if (Math.abs(e.vx) > 8) anim = 'run';
  const o = { face: e.face, flash: e.flash > 0 ? 0.85 : 0, scale: 3 };
  if (e.currentState === ST.ANTICIPATION) { o.sy = 0.82; o.sx = 1.12; }       // gathers itself before the leap
  Pixel.shadow(g, e.cx, e.y + e.h, 18);
  const speed = e.currentState === ST.CHASE ? 1.5 : 1;
  Pixel.draw(g, 'husk', Pixel.frameOf('husk', anim, t * speed), e.cx, e.y + e.h + 1, o);
  if (e.currentState === ST.CHASE || e.currentState === ST.ANTICIPATION) bloom(g, e.cx + e.face * 6, e.cy - 6, 14, '#ff7a22', 0.4);   // its eye flares when it hunts
};
