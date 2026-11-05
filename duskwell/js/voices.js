'use strict';
// The voices (js/voices_meta.js, made by tools/audio/voices.py): every creature calls now and then when the hero is near, cries
// when struck and when it dies, each in its own voice; every boss speaks as it rises, at half health and at its fall, its words
// written under it. They follow the game's sound switch and effects level.
const Voices = (() => {
  const meta = typeof VOICES !== 'undefined' ? VOICES : { creatures: [], bosses: {} };
  const has = new Set(meta.creatures), cache = {};
  let lastAt = 0;
  function play(name, vol) {
    if (typeof Sound === 'undefined' || !Sound.isOn()) return;
    const lv = Sound.levels ? Sound.levels().sfx : 1; if (!lv) return;
    let pool = cache[name]; if (!pool) pool = cache[name] = [];
    let a = pool.find(x => x.paused || x.ended);
    if (!a) { if (pool.length >= 3) return; a = new Audio('audio/' + (name.includes('/') ? name : 'voices/' + name) + '.mp3'); pool.push(a); }
    try { a.currentTime = 0; a.volume = Math.max(0, Math.min(1, (vol || 0.6) * lv)); a.play().catch(() => {}); } catch (e) { /* never break the game */ }
  }
  const near = e => typeof P !== 'undefined' && Math.abs(e.x + e.w / 2 - P.cx) < 520 && Math.abs(e.y + e.h / 2 - P.cy) < 320;
  // the creatures
  if (typeof Enemy !== 'undefined') {
    const hurt = Enemy.prototype.hurt, kill = Enemy.prototype.kill, update = Enemy.prototype.update;
    Enemy.prototype.hurt = function (dmg, dir, how) {
      const was = this.dead, r = hurt.apply(this, arguments);
      if (!was && !this.dead && has.has(this.kind) && G.t - (this._vHurt || -9) > 0.25) { this._vHurt = G.t; play(this.kind + '_hurt', 0.55); }
      return r;
    };
    Enemy.prototype.kill = function () {
      if (!this.dead && has.has(this.kind)) play(this.kind + '_die', 0.7);
      return kill.apply(this, arguments);
    };
    Object.assign(Enemy.prototype.hurt, hurt); Object.assign(Enemy.prototype.kill, kill);
    // now and then, a creature near the hero calls (looked at twice a second, never two calls at once)
    setInterval(() => {
      if (typeof G === 'undefined' || G.state !== 'play' || !G.enemies) return;
      for (const e of G.enemies) {
        if (e.dead || !has.has(e.kind) || (typeof Boss !== 'undefined' && e instanceof Boss) || !near(e)) continue;
        if (e._vNext === undefined) e._vNext = G.t + 1 + Math.random() * 6;
        if (G.t > e._vNext && G.t - lastAt > 1.2) { e._vNext = G.t + 5 + Math.random() * 7; lastAt = G.t; play(e.kind + '_idle', 0.35); break; }
      }
    }, 500);
  }
  // the bosses speak
  let line = null;
  function say(key, i) {
    const L = meta.bosses[key]; if (!L || !L[i]) return;
    play('boss_' + key + '_' + i, 0.95);
    line = { text: L[i], t: G.t, life: 4.2 };
  }
  if (typeof Boss !== 'undefined') {
    const upd = Boss.prototype.update, hurtB = Boss.prototype.hurt, killB = Boss.prototype.kill;
    if (upd) Boss.prototype.update = function (dt) {
      if (this.state === 'intro' && !this._spoke) { this._spoke = true; say(this.bossKey, 0); }
      return upd.apply(this, arguments);
    };
    if (hurtB) Boss.prototype.hurt = function () {
      const ph = this.phase, r = hurtB.apply(this, arguments);
      if (this.phase > ph && !this._spokeHalf) { this._spokeHalf = true; say(this.bossKey, 1); }
      return r;
    };
    if (killB) Boss.prototype.kill = function () { say(this.bossKey, 2); return killB.apply(this, arguments); };
    // the marks other wrappers left on the old functions stay on the new ones (js/mind.js looks for them)
    Object.assign(Boss.prototype.update, upd); Object.assign(Boss.prototype.hurt, hurtB); Object.assign(Boss.prototype.kill, killB);
  }
  // the words, under the boss's name
  function draw(g) {
    if (!line || G.t - line.t > line.life) return;
    const k = Math.min(1, (G.t - line.t) / 0.3, (line.life - (G.t - line.t)) / 0.5), ar = LANG.cur === 'ar';
    g.save(); g.globalAlpha = Math.max(0, k); setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(ar ? 26 : 22, '700'); textShadow(g, ar ? line.text.ar : line.text.en, VW / 2, VH - 92, '#ffe9c8', 10);
    g.restore();
  }
  // the weapons: each its own swing for each direction, and its own blow
  const weaponId = () => (typeof Gear !== 'undefined' && Gear.weapon && Gear.weapon()) || 'nail';
  function weapon(dir) { play('weapons/' + weaponId() + '_' + (dir || 'side'), 0.7); return true; }
  // the weight of a blow: heavy weapons shake the view and flash, light ones only tick
  const WEIGHT = { cleaver: [6, 0.18, 0.12], scythe: [4, 0.14, 0.08], bonesaw: [4, 0.14, 0.06], lance: [3, 0.1, 0.05], nail: [2, 0.08, 0.03], rapier: [1.5, 0.06, 0], fangs: [1.5, 0.06, 0] };
  function weaponHit() {
    play('weapons/' + weaponId() + '_hit', 0.75);
    const w = WEIGHT[weaponId()] || WEIGHT.nail;
    if (typeof G !== 'undefined') { G.shake(w[0], w[1]); if (w[2] && typeof Comfort !== 'undefined') G.flash = Math.max(G.flash || 0, w[2]); }
    return true;
  }
  // the air of the area: its loop fades in under the music when the hero enters, and out when the area changes
  let amb = null, ambTheme = null;
  setInterval(() => {
    if (typeof G === 'undefined' || !G.level || !G.level.def) return;
    const th = G.state === 'title' ? null : G.level.def.theme, on = typeof Sound !== 'undefined' && Sound.isOn(), lv = (Sound.levels ? Sound.levels().sfx : 1) * 0.32;
    if (th !== ambTheme) {
      const old = amb; ambTheme = th; amb = null;
      if (old) { const f = setInterval(() => { old.volume = Math.max(0, old.volume - 0.04); if (old.volume <= 0) { old.pause(); clearInterval(f); } }, 100); }
      if (th) { amb = new Audio('audio/amb/' + th + '.mp3'); amb.loop = true; amb.volume = 0; amb.play().catch(() => {}); }
    }
    if (amb) { const want = on ? lv : 0; amb.volume = Math.max(0, Math.min(1, amb.volume + Math.sign(want - amb.volume) * Math.min(0.04, Math.abs(want - amb.volume)))); if (on && amb.paused) amb.play().catch(() => {}); }
  }, 250);
  // the hero's own voice: a breath on a jump now and then, a cry when hurt, a sigh when healed, an effort on some strikes
  if (typeof Sound !== 'undefined') {
    const sp = Sound.play.bind(Sound); let heroAt = 0;
    Sound.play = function (name) {
      const r = sp.apply(Sound, arguments), now = (typeof G !== 'undefined' && G.t) || 0;
      if (name === 'hurt') { play('hero_hurt' + (Math.random() < 0.5 ? 0 : 1), 0.6); heroAt = now; }
      else if (name === 'heal') play('hero_heal', 0.5);
      else if (name === 'jump' && now - heroAt > 2.5 && Math.random() < 0.35) { play('hero_jump', 0.35); heroAt = now; }
      return r;
    };
  }
  const _weapon = weapon;
  function weaponVoiced(dir) { _weapon(dir); if (Math.random() < 0.3) play('hero_atk' + Math.floor(Math.random() * 3), 0.4); return true; }
  // the people: a greeting when spoken to, a farewell when left
  const people = typeof PEOPLE_LINES !== 'undefined' ? PEOPLE_LINES : {};
  let talking = null, said = null;
  setInterval(() => {
    if (typeof G === 'undefined' || !G.npcs) return;
    const inTalk = G.state === 'dialog' || G.state === 'shop';
    if (inTalk && !talking) {
      let best = null, bd = 1e9;
      for (const n of G.npcs) { const d = Math.abs(n.px - P.cx) + Math.abs(n.py - P.cy); if (d < bd) { bd = d; best = n; } }
      if (best && bd < 260 && people[best.type]) { talking = best; play('npc_' + best.type + '_0', 0.85); said = { text: people[best.type][0], t: G.t, life: 3.6 }; }
    } else if (!inTalk && talking) {
      if (people[talking.type]) { play('npc_' + talking.type + '_1', 0.8); said = { text: people[talking.type][1], t: G.t, life: 3 }; }
      talking = null;
    }
  }, 200);
  const drawBoss = draw;
  function drawAll(g) {
    drawBoss(g);
    if (said && G.t - said.t < said.life && G.state === 'play') {
      const k = Math.min(1, (G.t - said.t) / 0.3, (said.life - (G.t - said.t)) / 0.5), ar = LANG.cur === 'ar';
      g.save(); g.globalAlpha = Math.max(0, k); setDir(g); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(20, '700');
      textShadow(g, ar ? said.text.ar : said.text.en, VW / 2, VH - 120, '#e8f0ff', 8); g.restore();
    }
  }
  return { play, say, draw: drawAll, weapon: weaponVoiced, weaponHit };
})();
