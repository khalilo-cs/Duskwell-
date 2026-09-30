'use strict';
// Procedural sound effects and a slow ambient score. No audio files are needed.
const Sound = (() => {
  let ctx = null, master = null, sfxBus = null, musicBus = null, delay = null;
  let muted = false, theme = 'town', bossMode = false, timer = null, step = 0;
  try { muted = localStorage.getItem('duskwell_mute') === '1'; } catch (e) { /* ignore */ }

  const ROOT = { town: 110, cave: 73.4, moss: 87.3, crystal: 82.4, throne: 65.4 };
  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    // soft echo for the music
    delay = ctx.createDelay(1.5); delay.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(musicBus);
    startMusic();
  }

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
    shade() { tone({ f: 150, f2: 100, d: 0.6, v: 0.15, type: 'triangle' }); },
  };

  function note(semi, dur, vol, oct) {
    const root = ROOT[theme] || 110;
    tone({ f: root * Math.pow(2, (semi + (oct || 0) * 12) / 12), d: dur, v: vol, a: 0.03, bus: musicBus, type: 'sine' });
    tone({ f: root * Math.pow(2, (semi + (oct || 0) * 12) / 12), d: dur, v: vol * 0.5, a: 0.03, bus: delay, type: 'sine' });
  }
  function startMusic() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (!ctx || muted || ctx.state !== 'running') return;
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

  return {
    init,
    play(name) { try { if (FX[name]) FX[name](); } catch (e) { /* audio must never crash the game */ } },
    setTheme(t) { if (t !== theme) { theme = t; } },
    boss(on) { if (bossMode !== on) { bossMode = on; if (ctx) startMusic(); } },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('duskwell_mute', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : 0.55;
      return !muted;
    },
    isOn: () => !muted,
  };
})();
