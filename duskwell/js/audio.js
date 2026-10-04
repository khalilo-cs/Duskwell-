'use strict';
// Sound effects are synthesised on the fly. The score is recorded: one looping MP3 per area plus
// two boss themes (audio/music, rendered by tools/music from the original compositions), streamed
// through Web Audio so the loops are sample-exact. If those files cannot be fetched (for instance
// when index.html is opened straight from disk) the score falls back to a plain <audio> element,
// and failing that to the old procedural ambience, so the game always has music.
const Sound = (() => {
  // web audio nodes: master -> effects bus, recorded music bus, synth fallback bus
  let ctx = null, master = null, sfxBus = null, musicBus = null, fileBus = null, delay = null;
  // current state: mute, area theme, boss music, fallback score timer
  let muted = false, theme = 'title', mood = null, bossMode = false, bossTrack = 'boss', timer = null, step = 0;
  try { muted = localStorage.getItem('duskwell_mute') === '1'; } catch (e) { /* ignore */ }

  // root note (Hz) of the synth fallback for each area
  const ROOT = { ending: 73.4, bone: 65.4, lunar: 82.4, storm: 87.3, mirror: 69.3, frost: 98.0, ember: 58.3, foundry: 77.8, title: 73.4, town: 110, road: 98, cave: 73.4, moss: 87.3, crystal: 82.4, throne: 65.4, spore: 92.5, aqueduct: 69.3, webbed: 61.7 };
  // scale steps used by the fallback score
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
  // area theme -> music file
  const TRACK = { ending: 'ending', title: 'overture', road: 'road', town: 'hushvale', cave: 'crossroads', moss: 'moss', crystal: 'crystal', throne: 'throne', spore: 'spore', aqueduct: 'aqueduct', webbed: 'webbed', foundry: 'foundry', frost: 'frost', ember: 'ember', storm: 'storm', mirror: 'mirror', bone: 'ossuary', lunar: 'lunar' };
  // which battle theme each boss fights to (a boss key, or true for the last one); anything else gets the common one
  const BOSS_TRACKS = { king: 'king', bonewright: 'boss_bone', marrow: 'boss_bone', stargazer: 'boss_moon', regent: 'boss_moon' };
  const bossTrackOf = which => (which === true ? 'king' : (typeof which === 'string' && BOSS_TRACKS[which]) || 'boss');
  // folders of the recorded music and effects
  const MUSIC_DIR = 'audio/music/', SFX_DIR = 'audio/sfx/';
  const AMB_THEME = { town: 'forest', moss: 'forest', road: 'forest' };           // area -> ambience loop (audio/sfx/amb_*.mp3)
  // volumes
  const MUSIC_VOL = 0.8;
  const MASTER_VOL = 0.55;
  // the player's levels for the music and the effects (1, 0.7, 0.4 or 0), kept between visits
  const LEVELS = [1, 0.7, 0.4, 0];
  let musicLvl = 1, sfxLvl = 1;
  try { const v = JSON.parse(localStorage.getItem('duskwell_levels') || 'null'); if (v && LEVELS.includes(v.m) && LEVELS.includes(v.s)) { musicLvl = v.m; sfxLvl = v.s; } } catch (e) { /* ignore */ }

  // create the audio graph (needs a user gesture), then start the score and the effects
  function init() {
    if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : MASTER_VOL; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9 * sfxLvl; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32 * musicLvl; musicBus.connect(master);
    fileBus = ctx.createGain(); fileBus.gain.value = MUSIC_VOL * musicLvl; fileBus.connect(master);
    // soft echo for the procedural fallback score
    delay = ctx.createDelay(1.5); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(musicBus);
    // no music while the tab or the Android app is in the background
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) { ctx.suspend(); if (Score.el) Score.el.pause(); }
      else { ctx.resume(); if (Score.el && !muted) Score.el.play().catch(() => {}); }
    });
    Score.start();
    Rec.start();
  }

  // ------------------------------------------------------------------ recorded score
  const Score = {
    mode: 'pending',      // 'buffer' (Web Audio), 'element' (<audio>), 'synth' (procedural)
    meta: null,           // music.json: { name: { loop: seconds, gain } }
    cache: new Map(),     // decoded AudioBuffers, most recently used last
    loading: new Map(),   // name -> Promise<AudioBuffer>
    want: null, cur: null, el: null, fadeTimer: null,
    start() {
      const viaFile = location.protocol === 'file:';
      const metaReq = viaFile ? Promise.reject(new Error('file')) : fetch(MUSIC_DIR + 'music.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      metaReq.then(m => { this.meta = m; this.mode = 'buffer'; this.update(); })
        .catch(() => { this.mode = 'element'; this.update(); });
    },
    desired() { return bossMode ? bossTrack : (mood || TRACK[theme] || 'crossroads'); },
    update() {
      if (!ctx || this.mode === 'pending') return;
      if (this.mode === 'synth') { if (!timer) startMusic(); return; }
      const name = this.desired();
      if (name === this.want) return;
      this.want = name;
      if (this.mode === 'buffer') {
        this.load(name).then(buf => { if (this.want === name) this.playBuffer(name, buf); })
          .catch(() => { if (this.want === name) { this.mode = 'element'; this.want = null; this.update(); } });
      } else this.playElement(name);
    },
    load(name) {
      if (this.cache.has(name)) { const b = this.cache.get(name); this.cache.delete(name); this.cache.set(name, b); return Promise.resolve(b); }
      if (this.loading.has(name)) return this.loading.get(name);
      const p = fetch(MUSIC_DIR + name + '.mp3')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(data => new Promise((ok, fail) => { const q = ctx.decodeAudioData(data, ok, fail); if (q && q.catch) q.catch(fail); }))
        .then(buf => {
          this.loading.delete(name);
          this.cache.set(name, buf);
          // a decoded minute of stereo audio is ~20 MB, so keep only the newest two pieces
          while (this.cache.size > 2) this.cache.delete(this.cache.keys().next().value);
          return buf;
        }, err => { this.loading.delete(name); throw err; });
      this.loading.set(name, p);
      return p;
    },
    prefetch(name) { if (ctx && this.mode === 'buffer' && name !== this.want) this.load(name).catch(() => {}); },
    fadeOut(cur, sec) {
      if (!cur) return;
      const t = ctx.currentTime;
      cur.gain.gain.cancelScheduledValues(t);
      cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
      cur.gain.gain.linearRampToValueAtTime(0, t + sec);
      try { cur.src.stop(t + sec + 0.05); } catch (e) { /* already stopped */ }
    },
    playBuffer(name, buf) {
      const info = (this.meta && this.meta[name]) || { loop: buf.duration, gain: 1 };
      // Decoders that keep the MP3 encoder delay give ~1105 extra samples up front.
      const lead = buf.duration - info.loop > 0.02 ? 1105 / 44100 : 0;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.loopStart = lead; src.loopEnd = Math.min(buf.duration, lead + info.loop);
      const gain = ctx.createGain();
      src.connect(gain); gain.connect(fileBus);
      const fade = bossMode ? 0.35 : 1.8;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(info.gain, t + fade);
      src.start(t, lead);
      this.fadeOut(this.cur, bossMode ? 0.5 : 2.2);
      this.cur = { name, src, gain };
    },
    playElement(name) {
      const old = this.el;
      const el = new Audio(MUSIC_DIR + name + '.mp3');
      el.loop = true; el.volume = 0; el.muted = muted;
      el.addEventListener('error', () => { if (this.el === el) { this.el = null; this.mode = 'synth'; this.update(); } });
      this.el = el;
      el.play().catch(() => {});
      const target = MUSIC_VOL * MASTER_VOL * musicLvl * ((this.meta && this.meta[name] && this.meta[name].gain) || 0.8);
      const t0 = performance.now(), ms = bossMode ? 400 : 1800;
      clearInterval(this.fadeTimer);
      this.fadeTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        el.volume = target * k;
        if (old) old.volume = Math.max(0, old.volume * (1 - k));
        if (k >= 1) { clearInterval(this.fadeTimer); if (old) old.pause(); }
      }, 50);
    },
  };

  // ------------------------------------------------------------------ recorded effects and ambience
  // CC0 recordings (see CREDITS.md) that replace or sit under the synthesised effects. They need
  // fetch(), so from file:// the game keeps its synthesised sounds.
  const Rec = {
    meta: null, bufs: new Map(), last: {}, amb: null, ambWant: null, ambBus: null,
    start() {
      if (location.protocol === 'file:') return;
      this.ambBus = ctx.createGain(); this.ambBus.gain.value = 0.5; this.ambBus.connect(master);
      fetch(SFX_DIR + 'sfx.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(m => {
        this.meta = m;
        const names = new Set();
        for (const e of Object.values(m.events)) e.files.forEach(f => names.add(f));
        Promise.all([...names].map(n => this.decode(n))).then(() => this.ambience());
      }).catch(() => { this.meta = null; });
    },
    decode(name) {
      return fetch(SFX_DIR + name + '.mp3').then(r => r.arrayBuffer())
        .then(d => new Promise((ok, fail) => { const q = ctx.decodeAudioData(d, ok, fail); if (q && q.catch) q.catch(fail); }))
        .then(b => { this.bufs.set(name, b); return b; }, () => null);
    },
    // returns 'replace', 'layer' or false (nothing recorded for this event)
    play(name) {
      const e = this.meta && this.meta.events[name];
      if (!e || !ctx || muted) return false;
      const picks = e.files.filter(f => this.bufs.has(f));
      if (!picks.length) return false;
      const now = ctx.currentTime;
      if (now - (this.last[name] || 0) < 0.04) return e.layer ? 'layer' : 'replace';        // no machine-gun stacking
      this.last[name] = now;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = this.bufs.get(pick(picks));
      src.playbackRate.value = e.rate[0] + Math.random() * (e.rate[1] - e.rate[0]);
      g.gain.value = e.gain;
      src.connect(g); g.connect(sfxBus); src.start();
      return e.layer ? 'layer' : 'replace';
    },
    ambience() {
      if (!this.meta || !ctx) return;
      const name = AMB_THEME[theme] || null;
      if (name === this.ambWant) return;
      this.ambWant = name;
      const t = ctx.currentTime;
      if (this.amb) {
        const old = this.amb; this.amb = null;
        old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t); old.gain.gain.linearRampToValueAtTime(0, t + 2.5);
        try { old.src.stop(t + 2.6); } catch (e) { /* stopped */ }
      }
      const a = name && this.meta.ambience[name]; if (!a) return;
      const load = this.bufs.has(a.file) ? Promise.resolve(this.bufs.get(a.file)) : this.decode(a.file);
      load.then(buf => {
        if (!buf || this.ambWant !== name) return;
        const src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = buf; src.loop = true; src.connect(g); g.connect(this.ambBus);
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(a.gain, now + 3);
        src.start(); this.amb = { src, gain: g };
      });
    },
  };

  // one synthesised note: type, frequency slide, length, volume
  function tone(o) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + o.d);
    const v = o.v == null ? 0.2 : o.v;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.a || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + o.d + 0.05);
  }
  let noiseBuf = null;
  // filtered noise burst (hits, whooshes, rumbles)
  function noise(o) {
    if (!ctx || muted) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.d);
    f.Q.value = o.q || 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.v == null ? 0.2 : o.v, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0, Math.random()); src.stop(t0 + o.d + 0.05);
  }

  // synthesised sound effects by name
  const FX = {
    jump() { tone({ f: 300, f2: 560, d: 0.13, v: 0.12 }); },
    djump() { tone({ f: 420, f2: 900, d: 0.16, v: 0.13, type: 'triangle' }); noise({ f: 3000, f2: 800, d: 0.12, v: 0.06, type: 'highpass' }); },
    land() { noise({ f: 500, d: 0.09, v: 0.16 }); },
    slash() { noise({ f: 2600, f2: 900, d: 0.11, v: 0.13, type: 'bandpass', q: 1.2 }); },
    hit() { noise({ f: 3000, f2: 600, d: 0.12, v: 0.22 }); tone({ f: 180, f2: 60, d: 0.14, v: 0.16, type: 'square' }); },
    pogo() { tone({ f: 500, f2: 800, d: 0.08, v: 0.1, type: 'triangle' }); },
    enemyDie() { noise({ f: 1500, f2: 200, d: 0.3, v: 0.22 }); tone({ f: 220, f2: 50, d: 0.3, v: 0.16, type: 'sawtooth' }); },
    hurt() { tone({ f: 220, f2: 70, d: 0.35, v: 0.3, type: 'sawtooth' }); noise({ f: 900, d: 0.3, v: 0.2 }); },
    dash() { noise({ f: 600, f2: 4000, d: 0.2, v: 0.14, type: 'bandpass', q: 0.8 }); },
    geo() { tone({ f: 1400, d: 0.07, v: 0.09, type: 'triangle' }); tone({ f: 1900, d: 0.09, v: 0.09, type: 'triangle', delay: 0.05 }); },
    heal() { [0, 1, 2, 3].forEach(i => tone({ f: 420 * Math.pow(1.26, i), d: 0.3, v: 0.12, delay: i * 0.07 })); },
    focus() { tone({ f: 200, f2: 400, d: 0.9, v: 0.05, a: 0.4 }); },
    cast() { noise({ f: 900, f2: 3000, d: 0.25, v: 0.15, type: 'bandpass' }); tone({ f: 300, f2: 700, d: 0.25, v: 0.12, type: 'sawtooth' }); },
    bench() { [0, 4, 7, 12].forEach((s, i) => tone({ f: 220 * Math.pow(2, s / 12), d: 1.2, v: 0.1, delay: i * 0.12 })); },
    door() { noise({ f: 200, d: 0.5, v: 0.3 }); tone({ f: 70, f2: 40, d: 0.5, v: 0.25, type: 'square' }); },
    roar() { tone({ f: 90, f2: 45, d: 1.3, v: 0.3, type: 'sawtooth' }); tone({ f: 93, f2: 48, d: 1.3, v: 0.22, type: 'square' }); noise({ f: 400, d: 1.2, v: 0.2 }); },
    bossHit() { noise({ f: 2000, f2: 400, d: 0.1, v: 0.18 }); tone({ f: 120, f2: 70, d: 0.12, v: 0.15, type: 'square' }); },
    bossDie() { tone({ f: 150, f2: 30, d: 2.2, v: 0.35, type: 'sawtooth' }); noise({ f: 1800, f2: 100, d: 2, v: 0.3 }); },
    slam() { noise({ f: 300, f2: 60, d: 0.4, v: 0.4 }); tone({ f: 70, f2: 35, d: 0.4, v: 0.3, type: 'square' }); },
    shoot() { tone({ f: 700, f2: 300, d: 0.12, v: 0.1, type: 'square' }); },
    tele() { tone({ f: 200, f2: 500, d: 0.4, v: 0.08, type: 'triangle' }); },
    ability() { [0, 4, 7, 11, 14, 19].forEach((s, i) => tone({ f: 261 * Math.pow(2, s / 12), d: 1.6, v: 0.11, delay: i * 0.13, type: 'triangle' })); },
    select() { tone({ f: 600, d: 0.06, v: 0.08, type: 'triangle' }); },
    confirm() { tone({ f: 500, d: 0.06, v: 0.1, type: 'triangle' }); tone({ f: 750, d: 0.1, v: 0.1, type: 'triangle', delay: 0.06 }); },
    break() { noise({ f: 900, f2: 200, d: 0.3, v: 0.3 }); },
    bounce() { tone({ f: 180, f2: 620, d: 0.22, v: 0.16, type: 'triangle' }); noise({ f: 400, d: 0.1, v: 0.1 }); },
    shade() { tone({ f: 150, f2: 100, d: 0.6, v: 0.15, type: 'triangle' }); },
    creak() { tone({ f: 120, f2: 90, d: 0.4, v: 0.1, type: 'sawtooth' }); noise({ f: 700, f2: 300, d: 0.35, v: 0.08, type: 'bandpass', q: 3 }); },
    clunk() { tone({ f: 90, f2: 55, d: 0.18, v: 0.16, type: 'square' }); noise({ f: 500, d: 0.12, v: 0.1 }); },
    clank() { tone({ f: 1250, f2: 900, d: 0.18, v: 0.08, type: 'triangle' }); tone({ f: 1870, d: 0.12, v: 0.05, type: 'sine' }); noise({ f: 4000, d: 0.06, v: 0.08, type: 'highpass' }); },
    lever() { tone({ f: 180, f2: 120, d: 0.25, v: 0.16, type: 'square' }); tone({ f: 900, d: 0.12, v: 0.08, type: 'triangle', delay: 0.12 }); noise({ f: 800, d: 0.2, v: 0.12 }); },
    sdcharge() { tone({ f: 160, f2: 640, d: 0.8, v: 0.08, a: 0.2, type: 'sawtooth' }); noise({ f: 600, f2: 2400, d: 0.8, v: 0.05, type: 'bandpass', q: 2 }); },
    sdready() { tone({ f: 1320, d: 0.25, v: 0.1, type: 'triangle' }); tone({ f: 1980, d: 0.3, v: 0.06, type: 'sine', delay: 0.04 }); },
    thunder() { noise({ f: 380, f2: 50, d: 2.2, v: 0.3 }); tone({ f: 60, f2: 28, d: 1.8, v: 0.22, type: 'sawtooth' }); noise({ f: 160, d: 1.2, v: 0.2, delay: 0.5 }); },
    rendReady() { tone({ f: 1480, d: 0.35, v: 0.09, type: 'sine' }); tone({ f: 2220, d: 0.4, v: 0.06, type: 'sine', delay: 0.04 }); tone({ f: 2960, d: 0.5, v: 0.04, type: 'sine', delay: 0.09 }); },
    rend() { noise({ f: 5000, f2: 700, d: 0.45, v: 0.26, type: 'bandpass', q: 0.9 }); tone({ f: 880, f2: 220, d: 0.5, v: 0.16, type: 'sawtooth' }); tone({ f: 1760, f2: 440, d: 0.4, v: 0.08, type: 'triangle' }); noise({ f: 300, f2: 80, d: 0.3, v: 0.22 }); },
    rush() { noise({ f: 400, f2: 6000, d: 0.3, v: 0.24, type: 'bandpass', q: 0.7 }); tone({ f: 140, f2: 520, d: 0.3, v: 0.16, type: 'sawtooth' }); [0, 0.07, 0.14, 0.21].forEach(d => noise({ f: 3200, f2: 900, d: 0.08, v: 0.14, type: 'bandpass', q: 1.5, delay: d })); },
    novaCharge() { tone({ f: 120, f2: 880, d: 0.55, v: 0.12, a: 0.3, type: 'sawtooth' }); tone({ f: 240, f2: 1760, d: 0.55, v: 0.07, a: 0.3, type: 'triangle' }); noise({ f: 500, f2: 5000, d: 0.55, v: 0.1, type: 'bandpass', q: 2 }); },
    nova() { noise({ f: 6000, f2: 60, d: 1.2, v: 0.5 }); tone({ f: 70, f2: 30, d: 1.3, v: 0.38, type: 'sawtooth' }); [0, 7, 12, 16, 19].forEach((n, i) => tone({ f: 330 * Math.pow(2, n / 12), d: 1.4, v: 0.1, delay: 0.05 + i * 0.03, type: 'triangle' })); },
    buy() { tone({ f: 1320, d: 0.08, v: 0.1, type: 'triangle' }); tone({ f: 1760, d: 0.14, v: 0.1, type: 'triangle', delay: 0.06 }); noise({ f: 5000, d: 0.05, v: 0.06, type: 'highpass' }); },
    equip() { noise({ f: 2500, f2: 800, d: 0.14, v: 0.12, type: 'bandpass', q: 2 }); tone({ f: 330, f2: 200, d: 0.1, v: 0.1, type: 'square' }); tone({ f: 880, d: 0.12, v: 0.08, type: 'triangle', delay: 0.08 }); },
    sdlaunch() { noise({ f: 300, f2: 3000, d: 0.35, v: 0.22, type: 'bandpass', q: 0.8 }); tone({ f: 110, f2: 55, d: 0.4, v: 0.22, type: 'sawtooth' }); },
  };

  // one note of the fallback score
  function note(semi, dur, vol, oct) {
    const root = ROOT[theme] || 110;
    tone({ f: root * Math.pow(2, (semi + (oct || 0) * 12) / 12), d: dur, v: vol, a: 0.03, bus: musicBus, type: 'sine' });
    tone({ f: root * Math.pow(2, (semi + (oct || 0) * 12) / 12), d: dur, v: vol * 0.5, a: 0.03, bus: delay, type: 'sine' });
  }
  // fallback score: slow pads and sparse notes, a pulse in boss fights
  function startMusic() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!ctx || muted || ctx.state !== 'running' || Score.mode !== 'synth') return;
      step++;
      if (bossMode) {
        // pulse and tense line
        note(0, 0.25, 0.22, 0);
        if (step % 2 === 0) note(SCALE[(step >> 1) % 5], 0.2, 0.09, 2);
        if (step % 8 === 0) note(7, 1.2, 0.1, 1);
        return;
      }
      if (step % 10 === 1) {
        // slow pad chord
        [0, 7, 12].forEach((s, i) => tone({ f: (ROOT[theme] || 110) * Math.pow(2, s / 12), d: 6, v: 0.12, a: 2, bus: musicBus, type: 'triangle', delay: i * 0.05 }));
      }
      if (step % 3 === 0 && Math.random() < 0.7) note(SCALE[randi(0, SCALE.length - 1)], 1.8, 0.09, 1);
    }, bossMode ? 260 : 820);
  }

  // what the rest of the game calls
  return {
    init,
    play(name) { try { const r = Rec.play(name); if (r !== 'replace' && FX[name]) FX[name](); } catch (e) { /* audio must never crash the game */ } },
    // area theme: 'title', 'town', 'cave', 'moss', ... (see TRACK)
    setTheme(t) { if (t !== theme) { theme = t; Score.update(); Rec.ambience(); } },
    // a track for the moment, over the area's own (a shop, the menus): a name from music.json, or null to go back to the area's theme
    setMood(m) { if (m !== mood) { mood = m; Score.update(); } },
    // the name of the track that should be playing now (the tests read it)
    track() { return Score.desired(); },
    // boss music on/off; the final boss has a theme of its own
    boss(on, which) {
      const track = bossTrackOf(which);
      if (bossMode === on && (!on || bossTrack === track)) return;
      bossMode = on; if (on) bossTrack = track;
      if (ctx && Score.mode === 'synth') startMusic();
      Score.update();
    },
    prefetch(which) { Score.prefetch(bossTrackOf(which)); },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('duskwell_mute', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : MASTER_VOL;
      if (Score.el) Score.el.muted = muted;
      return !muted;
    },
    isOn: () => !muted,
    // the music and effect levels; cycle() moves one of them to the next step and keeps it
    levels: () => ({ music: musicLvl, sfx: sfxLvl }),
    cycle(which) {
      const next = v => LEVELS[(LEVELS.indexOf(v) + 1) % LEVELS.length];
      if (which === 'music') musicLvl = next(musicLvl); else sfxLvl = next(sfxLvl);
      try { localStorage.setItem('duskwell_levels', JSON.stringify({ m: musicLvl, s: sfxLvl })); } catch (e) { /* ignore */ }
      if (sfxBus) sfxBus.gain.value = 0.9 * sfxLvl;
      if (musicBus) musicBus.gain.value = 0.32 * musicLvl;
      if (fileBus) fileBus.gain.value = MUSIC_VOL * musicLvl;
      if (Score.el && Score.want) { const m = Score.meta && Score.meta[Score.want]; Score.el.volume = MUSIC_VOL * MASTER_VOL * musicLvl * ((m && m.gain) || 0.8); }
      return which === 'music' ? musicLvl : sfxLvl;
    },
    sfxState: () => ({ loaded: !!Rec.meta, buffers: Rec.bufs.size, ambience: Rec.ambWant, ambiencePlaying: !!Rec.amb }),
    musicState: () => ({ mode: Score.mode, want: Score.want, playing: Score.cur ? Score.cur.name : (Score.el ? Score.el.src : null), cached: [...Score.cache.keys()] }),
  };
})();
