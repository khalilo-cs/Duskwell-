'use strict';
// What the creatures learn from you. Every kind keeps a record (G.mind, saved with the game): how many of it you killed,
// how many times it wounded you, how many times it killed you. From those three numbers it gets a level, 0 to 5, and the level
// changes how every creature of that kind behaves, in this room and in every later one. The deeper areas are born with a level
// of their own (Diff.innate), so a player who has never met the kind still meets a clever one:
//   1  it is quicker, notices you from farther away and leads its shots a little
//   2  it sidesteps now and then when it sees your nail swing
//   3  it hops over your spell bolts, if spells are how you mostly killed it
//   4  when one of them has seen you the others of its kind in the room are on the alert too
//   5  it dodges more often and moves faster still
// Bosses do not sidestep: a boss that has beaten you before only shortens its pauses.
// Nothing here is in the creatures' own code: update() and seesPlayer() of every class are wrapped once, below.
const Mind = (() => {
  const LEVELS = [2, 5, 10, 18, 30];                                        // score needed for levels 1 to 5
  const NAMES = [['غِرّ', 'Green'], ['متنبّه', 'Wary'], ['متمرّس', 'Seasoned'], ['ماكر', 'Cunning'], ['خبير', 'Veteran'], ['داهية', 'Mastermind']];
  const ROOTED = new Set(['shard', 'spitter', 'icicle', 'censer', 'heap', 'mole', 'lavaworm', 'shroom', 'orrery']);       // these never move out of the way
  const SPELL_HOW = new Set(['spell', 'wail', 'dive', 'nova']);
  const MAX = 5;

  // the record key of a creature: its kind, or b:<boss> for a boss; null for things that do not learn (the shade)
  function keyOf(e) {
    if (!e) return null;
    if (e.isBoss) return 'b:' + e.bossKey;
    const k = e.kind === 'slimelet' ? 'slime' : e.kind === 'brood_child' ? 'spider' : e.kind;
    return k && k !== 'shade' ? k : null;
  }
  const rec = key => { if (!G.mind) G.mind = {}; return G.mind[key] || (G.mind[key] = { k: 0, w: 0, d: 0, sp: 0 }); };
  // score -> level
  const score = r => r.k + 1.5 * r.w + 4 * r.d;
  const levelOf = r => { const s = score(r); let l = 0; while (l < MAX && s >= LEVELS[l]) l++; return l; };
  // the level of a creature: what it has learned from you, or what its depth gives it, whichever is more
  function level(e) {
    const k = keyOf(e); if (!k) return 0;
    const learned = G.mind && G.mind[k] ? levelOf(G.mind[k]) : 0;
    return Math.max(learned, e.area ? Diff.innate(e.area) : 0);
  }
  // share of this kind's deaths that spells dealt
  const spellShare = r => (r.k ? r.sp / r.k : 0);

  // add to a record, and say so when the level goes up
  function bump(e, field, n) {
    const key = keyOf(e); if (!key) return;
    const r = rec(key), before = levelOf(r);
    r[field] += n;
    const after = levelOf(r);
    if (after > before && typeof G.toastMsg === 'function') {
      const i = typeof BESTIARY_INDEX !== 'undefined' ? BESTIARY_INDEX[(e.isBoss ? 'b:' : 'e:') + key.replace(/^b:/, '')] : undefined;
      const name = i !== undefined ? bestiaryName(BESTIARY[i]) : key;
      G.toastMsg(tr('mindUp').replace('{n}', name).replace('{l}', after), 3);
    }
  }
  // called by the game: you killed one, one wounded you (and maybe killed you)
  function killed(e, how) { bump(e, 'k', 1); if (SPELL_HOW.has(how)) { const key = keyOf(e); if (key) rec(key).sp++; } }
  function wounded(e) {
    if (!e) return;
    bump(e, 'w', 1);
    if (G.player && G.player.hp <= 0) bump(e, 'd', 1);
  }

  // set a creature up when it appears: the depth of its area (Diff) and, for a boss, the shorter pauses its memory gives it
  function prepare(e, area) {
    e.area = area; e.tempo = Diff.tempo(area); e.sightK = Diff.sight(area);
    if (e.kb) e.kb *= Diff.flinch(area);                              // the deep ones are hard to push around
    if (e.isBoss) { const l = level(e); if (l) e.spd = Math.max(0.55, e.spd * (1 - 0.045 * l)); }
  }
  // how much faster than normal a creature acts: the area's tempo times what it has learned
  const tempo = e => Math.min(1.5, (e.tempo || 1) * (1 + 0.04 * level(e)));
  // how much farther it notices you
  const sight = e => (e.sightK || 1) * (1 + 0.12 * level(e)) * (e.alertT > 0 ? 1.8 : 1);

  // the things it does with what it learned: sidestep a swing, hop a bolt, call the others
  function act(e, dt) {
    const p = G.player, l = level(e); if (!p || p.dead || e.dead) return;
    e.dodgeCD = (e.dodgeCD || 0) - dt; e.alertT = (e.alertT || 0) - dt;
    const swing = p.atkT > (e._atk || 0) + 0.001; e._atk = p.atkT;                  // a new swing of the nail has begun
    const busy = e.currentState === ST.ANTICIPATION || e.currentState === ST.ATTACK || e.stun > 0 || e.isBoss || ROOTED.has(e.kind);
    if (l >= 2 && !busy && e.dodgeCD <= 0 && swing) {
      const dx = e.cx - p.cx;
      if (Math.abs(dx) < 120 && Math.abs(e.cy - p.cy) < 70 && Math.sign(dx) === p.face && Math.random() < Math.min(0.65, 0.13 * l)) {
        e.dodgeT = 0.22; e.dodgeVx = Math.sign(dx) * 340; e.dodgeCD = 1.4 - 0.1 * l;
        if (e.onGround) e.vy = -200;
      }
    }
    if (l >= 3 && !busy && e.onGround && e.dodgeCD <= 0 && spellShare(rec(keyOf(e))) >= 0.4) {
      for (const q of G.projs) {
        if (!q.friendly || q.dead || q.kind !== 'bolt') continue;
        const ahead = (e.cx - q.x) * Math.sign(q.vx || 1);
        if (ahead > 20 && ahead < 170 && Math.abs(q.y - e.cy) < 40) { e.vy = -430; e.dodgeCD = 1.2; break; }
      }
    }
    if (l >= 4 && e.currentState === ST.CHASE && !ROOTED.has(e.kind) && !e.isBoss) {
      e.callCD = (e.callCD || 0) - dt;
      if (e.callCD <= 0) { e.callCD = 1; for (const o of G.enemies) if (o !== e && !o.dead && o.kind === e.kind && Math.abs(o.cx - e.cx) < 480) o.alertT = 3; }
    }
  }
  // the dodge goes on for its short time after the creature's own update has set its velocity
  function after(e, dt) { if (e.dodgeT > 0) { e.dodgeT -= dt; e.vx = e.dodgeVx; } }

  // a straight, fast shot is turned toward where the hero will be, not where he is: the stronger the creature's level, the more so
  function lead(e, q) {
    const l = level(e), p = G.player; if (!l || !p || q.kind !== 'shard') return;
    const sp = Math.hypot(q.vx, q.vy); if (sp < 100) return;
    const dx = p.cx - q.x, dy = p.cy - q.y, t = Math.hypot(dx, dy) / sp;
    const a0 = Math.atan2(dy, dx), a1 = Math.atan2(dy + p.vy * t, dx + p.vx * t);
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const k = Math.min(1, 0.3 * l), c = Math.cos(d * k), sn = Math.sin(d * k);
    const vx = q.vx * c - q.vy * sn, vy = q.vx * sn + q.vy * c; q.vx = vx; q.vy = vy;
  }

  // wrap one class once: its update runs faster, then acts on what was learned. A subclass that calls super.update() is not wrapped twice.
  function wrap(cls) {
    if (!cls || !Object.prototype.hasOwnProperty.call(cls.prototype, 'update') || cls.prototype.update._mind) return;
    const orig = cls.prototype.update;
    cls.prototype.update = function (dt) {
      if (this._inMind || !keyOf(this) || this.isBoss) return orig.call(this, dt);           // bosses run on their own clock (their pauses shorten instead)
      this._inMind = true;
      try {
        act(this, dt);
        const n = G.projs.length;
        orig.call(this, dt * tempo(this));
        for (let i = n; i < G.projs.length; i++) {
          const q = G.projs[i]; if (q.friendly || q.owner) continue;
          q.owner = this;                                                      // whoever fired it gets the credit
          lead(this, q);
        }
        after(this, dt);
      } finally { this._inMind = false; }
    };
    cls.prototype.update._mind = true;
  }
  for (const c of Object.values(ENEMY_TYPES)) wrap(c);
  // bosses: only the projectiles they fire are given an owner (their melee is credited in bosses.js). The base class and any boss with its own update
  // are wrapped; the guard keeps a boss that calls super.update() from being wrapped twice over
  for (const c of [Boss, Guardian, Weaver, Wraith, King, Sporecap, Drowned, Brood, Queen, Colossus, Thunderhoof, Roc, Duelist, Twin, Bonewright, Marrow, Stargazer, Regent]) {
    if (!c || !Object.prototype.hasOwnProperty.call(c.prototype, 'update') || c.prototype.update._own) continue;
    const orig = c.prototype.update;
    c.prototype.update = function (dt) {
      if (this._inOwn) return orig.call(this, dt);
      this._inOwn = true;
      try {
        const n = G.projs.length; orig.call(this, dt);
        for (let i = n; i < G.projs.length; i++) if (!G.projs[i].friendly && !G.projs[i].owner) G.projs[i].owner = this;
      } finally { this._inOwn = false; }
    };
    c.prototype.update._own = true;
  }
  // every ask about what a creature can see goes through its sight
  const seen = Enemy.prototype.seesPlayer;
  Enemy.prototype.seesPlayer = function (range) { return seen.call(this, range * sight(this)); };

  // the record as text, for the bestiary: level name and what it has learned
  function describe(key, area) {
    const r = G.mind && G.mind[key], l = Math.max(r ? levelOf(r) : 0, area ? Diff.innate(area) : 0), ar = LANG.cur === 'ar';
    const learned = [];
    if (l >= 1) learned.push(ar ? 'أسرع ويرى أبعد' : 'quicker, sees farther');
    if (l >= 2 && !key.startsWith('b:')) learned.push(ar ? 'يتفادى ضربة النصل' : 'sidesteps the nail');
    if (key.startsWith('b:') && l >= 1) learned.push(ar ? 'فترات راحته أقصر' : 'shorter pauses');
    if (l >= 3 && !key.startsWith('b:') && spellShare(r) >= 0.4) learned.push(ar ? 'يقفز فوق التعاويذ' : 'hops your spells');
    if (l >= 4 && !key.startsWith('b:')) learned.push(ar ? 'ينبّه إخوته' : 'warns its kin');
    return { level: l, name: NAMES[l][ar ? 0 : 1], learned, score: r ? Math.floor(score(r)) : 0, next: l < MAX ? LEVELS[l] : null };
  }
  const reset = () => { G.mind = {}; };
  return { keyOf, level, killed, wounded, prepare, tempo, sight, describe, reset, LEVELS, MAX };
})();
