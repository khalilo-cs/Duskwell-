/* ===== محرك الصوت: مؤثرات + موسيقى مولّدة (طبول، باس، آربيجيو، لحن) ===== */
(() => {
'use strict';
const Z = window.Z;
const A = Z.audio = {};
let ac = null, master = null, sfxBus = null, musBus = null, noiseBuf = null, timer = null;

A.init = () => {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      sfxBus = ac.createGain(); sfxBus.connect(master);
      musBus = ac.createGain(); musBus.gain.value = 0.42;
      // صدى بسيط للموسيقى
      const dly = ac.createDelay(1); dly.delayTime.value = 0.22; const fb = ac.createGain(); fb.gain.value = 0.28; const wet = ac.createGain(); wet.gain.value = 0.35;
      musBus.connect(master); musBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(master);
      const len = ac.sampleRate * 0.5, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; noiseBuf = b;
    } catch (e) { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume();
  if (ac && !timer && curTrack) A.music(curTrack);
};
const on = () => ac && Z.prog.sfx;

function osc(type, f0, f1, t, dur, vol, bus, det) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  if (det) o.detune.value = det;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, vol, hp, lp, bus) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf; const g = ac.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = s;
  if (hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
  node.connect(g); g.connect(bus || sfxBus); s.start(t); s.stop(t + dur + 0.05);
}
const seq = (arr, step, type, vol, dur) => { const t = ac.currentTime; arr.forEach((f, i) => osc(type || 'square', f, f, t + i * step, dur || step * 1.4, vol || 0.07)); };

const SFX = {
  jump: t => osc('square', 280, 620, t, 0.16, 0.07),
  djump: t => { osc('triangle', 380, 900, t, 0.2, 0.09); noise(t, 0.1, 0.05, 3000); },
  wjump: t => { osc('square', 330, 700, t, 0.14, 0.07); noise(t, 0.08, 0.06, 2000); },
  dash: t => { noise(t, 0.22, 0.13, 800, 6000); osc('sawtooth', 500, 150, t, 0.2, 0.05); },
  pound: t => { osc('sine', 160, 35, t, 0.35, 0.3); noise(t, 0.25, 0.25, 0, 900); },
  poundstart: t => osc('sawtooth', 500, 200, t, 0.1, 0.05),
  coin: t => { osc('square', 988, 988, t, 0.07, 0.06); osc('square', 1319, 1319, t + 0.07, 0.24, 0.06); },
  gem: t => [880, 1109, 1319, 1760].forEach((f, i) => osc('triangle', f, f, t + i * 0.07, 0.3, 0.1)),
  stomp: t => { osc('square', 240, 80, t, 0.12, 0.09); noise(t, 0.06, 0.08, 500); },
  bump: t => osc('triangle', 140, 90, t, 0.1, 0.12),
  brick: t => { noise(t, 0.25, 0.14, 300, 4000); osc('sawtooth', 220, 50, t, 0.18, 0.05); },
  power: t => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => osc('square', f, f, t + i * 0.06, 0.12, 0.06)),
  life: t => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => osc('square', f, f, t + i * 0.08, 0.14, 0.06)),
  hurt: t => { osc('sawtooth', 500, 110, t, 0.35, 0.09); noise(t, 0.12, 0.08, 400); },
  die: t => [494, 466, 440, 415, 392, 330].forEach((f, i) => osc('square', f, f * 0.9, t + i * 0.14, 0.2, 0.07)),
  kick: t => { osc('square', 500, 250, t, 0.1, 0.07); noise(t, 0.05, 0.06, 1500); },
  flag: t => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => osc('square', f, f, t + i * 0.09, 0.15, 0.06)),
  boss: t => { osc('sawtooth', 200, 40, t, 0.5, 0.12); noise(t, 0.4, 0.15, 0, 700); },
  bosshit: t => { osc('square', 300, 80, t, 0.25, 0.1); noise(t, 0.2, 0.12, 200); },
  bossdie: t => { for (let i = 0; i < 8; i++) { noise(t + i * 0.12, 0.3, 0.14, 0, 1500 - i * 100); osc('sawtooth', 300 - i * 25, 40, t + i * 0.12, 0.3, 0.07); } },
  fire: t => { noise(t, 0.16, 0.1, 1000, 5000); osc('sawtooth', 700, 300, t, 0.14, 0.04); },
  cannon: t => { osc('sine', 120, 40, t, 0.25, 0.22); noise(t, 0.2, 0.15, 0, 1200); },
  spring: t => osc('sine', 200, 900, t, 0.3, 0.14),
  splash: t => { noise(t, 0.3, 0.12, 400, 3500); osc('sine', 300, 120, t, 0.2, 0.06); },
  cp: t => { osc('square', 660, 880, t, 0.15, 0.07); osc('square', 880, 1320, t + 0.12, 0.22, 0.07); },
  select: t => osc('square', 660, 660, t, 0.05, 0.05),
  confirm: t => { osc('square', 660, 660, t, 0.06, 0.06); osc('square', 990, 990, t + 0.06, 0.12, 0.06); },
  back: t => osc('square', 400, 300, t, 0.08, 0.05),
  whoosh: t => noise(t, 0.3, 0.07, 500, 4000),
  crumble: t => noise(t, 0.35, 0.09, 100, 1500),
  crush: t => { osc('sine', 110, 30, t, 0.3, 0.3); noise(t, 0.2, 0.2, 0, 700); },
  ghost: t => osc('sine', 500, 300, t, 0.4, 0.05),
  win: t => [523, 659, 784, 1047, 1319, 1047, 1319, 1568].forEach((f, i) => osc('square', f, f, t + i * 0.11, 0.2, 0.06)),
  star: t => [784, 988, 1175, 1568, 1175, 1568, 1976].forEach((f, i) => osc('triangle', f, f, t + i * 0.06, 0.15, 0.09)),
};
A.sfx = name => { if (!on()) return; try { const f = SFX[name]; if (f) f(ac.currentTime); } catch (e) {} };
A.seq = seq;

/* ---------------- الموسيقى ---------------- */
const SC = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9], dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10] };
const PROG = { major: [[0, 4, 7], [5, 9, 12], [3, 7, 10], [4, 7, 11]], minor: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]] };
let curTrack = null, step = 0, nextT = 0, pat = null;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function buildPattern(tr) {
  const r = Z.rng(tr.seed), sc = SC[tr.scale] || SC.major, minor = tr.scale === 'minor' || tr.scale === 'phryg';
  const chords = PROG[minor ? 'minor' : 'major'];
  const bars = [];
  // لحن من 4 مقاطع مع تكرار وتنويع
  const phrase = () => Array.from({ length: 16 }, (_, i) => (i % 2 === 0 || r() < 0.35) && r() > 0.22 ? sc[Math.floor(r() * sc.length)] + (r() < 0.3 ? 12 : 0) : -1);
  const A_ = phrase(), B_ = phrase();
  for (let b = 0; b < 8; b++) {
    const ch = chords[[0, 1, 2, 3, 0, 1, 2, 3][b] % 4], mel = b % 4 === 3 ? B_ : A_;
    bars.push({ ch, mel: mel.map((m, i) => (b >= 4 && m >= 0 && r() < 0.15) ? m + 2 : m) });
  }
  return bars;
}
function tick() {
  if (!ac || !curTrack || !Z.prog.music) return;
  const tr = curTrack, spb = 60 / tr.bpm / 4;
  while (nextT < ac.currentTime + 0.25) {
    const bar = pat[Math.floor(step / 16) % pat.length], i = step % 16, t = nextT, root = tr.root;
    if (nextT < ac.currentTime - 0.1) { nextT = ac.currentTime; }
    const bassNote = bar.ch[0] - 12;
    // طبول
    if (tr.drums !== false) {
      if (i % 4 === 0) osc('sine', 150, 42, t, 0.16, 0.5, musBus);
      if (tr.boss ? (i === 4 || i === 12 || i === 14) : (i === 4 || i === 12)) { noise(t, 0.1, 0.22, 1200, 0, musBus); osc('triangle', 220, 120, t, 0.08, 0.15, musBus); }
      if (i % 2 === 1 || tr.boss) noise(t, 0.035, i % 4 === 3 ? 0.13 : 0.07, 6000, 0, musBus);
    }
    // باس
    if (i % 2 === 0 && (tr.bass !== false)) osc('triangle', mtof(root + bassNote), mtof(root + bassNote), t, spb * 1.8, 0.5, musBus);
    if (tr.boss && i % 4 === 2) osc('sawtooth', mtof(root + bassNote), mtof(root + bassNote) * 0.99, t, spb * 1.5, 0.12, musBus);
    // آربيجيو
    if (tr.arp !== false) { const n = bar.ch[i % 3] + (i % 6 >= 3 ? 12 : 0); osc('square', mtof(root + n), mtof(root + n), t, spb * 0.9, 0.06, musBus); }
    // لحن
    const m = bar.mel[i]; if (m >= 0 && tr.lead !== false) { const f = mtof(root + 12 + m); osc(tr.leadWave || 'triangle', f, f, t, spb * 2.2, 0.22, musBus); osc('square', f, f, t, spb * 1.2, 0.05, musBus, 6); }
    nextT += spb; step++;
  }
}
A.music = tr => {
  curTrack = tr; A.stopMusic(true);
  if (!ac || !tr || !Z.prog.music) return;
  pat = buildPattern(tr); step = 0; nextT = ac.currentTime + 0.1;
  timer = setInterval(tick, 40);
};
A.stopMusic = keep => { if (timer) { clearInterval(timer); timer = null; } if (!keep) curTrack = null; };
A.pause = () => { if (timer) { clearInterval(timer); timer = null; } };
A.resume = () => { if (curTrack && !timer && ac && Z.prog.music) { nextT = ac.currentTime + 0.05; timer = setInterval(tick, 40); } };
A.setMusic = v => { Z.prog.music = v; Z.save(); if (!v) A.pause(); else if (curTrack) { A.music(curTrack); } };
A.setSfx = v => { Z.prog.sfx = v; Z.save(); };
})();
