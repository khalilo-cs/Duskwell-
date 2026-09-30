/* ===== الإدخال: لوحة مفاتيح + لمس + يد التحكم ===== */
(() => {
'use strict';
const Z = window.Z;
const down = Z.down = new Set(), hit = Z.hit = new Set();
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyX: 'dash', KeyL: 'dash',
  KeyC: 'fire', KeyJ: 'fire', KeyF: 'fire', Enter: 'start', KeyP: 'pause', Escape: 'pause', KeyM: 'mute',
};
addEventListener('keydown', e => {
  const a = KEYMAP[e.code]; if (!a) return; e.preventDefault(); Z.audio && Z.audio.init();
  if (!down.has(a)) hit.add(a); down.add(a);
  if (a === 'up' && !down.has('jump')) { hit.add('jump'); }
});
addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) down.delete(a); });
addEventListener('blur', () => { down.clear(); Z.onBlur && Z.onBlur(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { down.clear(); Z.onBlur && Z.onBlur(); } });

// أزرار اللمس
document.querySelectorAll('[data-act]').forEach(b => {
  const a = b.dataset.act;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); Z.audio && Z.audio.init();
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    if (!down.has(a)) hit.add(a); down.add(a); b.classList.add('on');
    if (a === 'up') { hit.add('jump'); }
  });
  const up = () => { down.delete(a); b.classList.remove('on'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
});
Z.isDown = a => down.has(a) || (a === 'jump' && down.has('up'));
Z.pressed = a => hit.has(a);

// اهتزاز خفيف عند الإصابة (أندرويد/ويب)
Z.vibrate = ms => {
  if (!Z.prog.vib) return;
  try { if (window.AndroidBridge && AndroidBridge.vibrate) AndroidBridge.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
};
})();
