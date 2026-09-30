'use strict';
// Keyboard, touch buttons and gamepad, merged into one set of named actions.
// pressed() is an edge that stays true until a simulation step consumes it.
const Input = (() => {
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', Space: 'jump', KeyK: 'jump',
    KeyX: 'attack', KeyJ: 'attack',
    KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
    KeyF: 'cast', KeyV: 'cast', KeyI: 'cast',
    Tab: 'map', KeyM: 'map',
    Escape: 'pause', KeyP: 'pause',
    Enter: 'confirm', KeyN: 'mute',
  };
  const held = {}, touch = {}, pad = {}, padPrev = {}, q = {}, rel = {};
  const heldCount = {};

  function setHeld(src, act, on) {
    const was = isHeld(act);
    src[act] = on;
    const now = isHeld(act);
    if (now && !was) q[act] = true;
    if (!now && was) rel[act] = true;
  }
  function isHeld(a) { return !!(held[a] || touch[a] || pad[a]); }

  window.addEventListener('keydown', e => {
    const a = KEYS[e.code];
    if (!a) return;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    heldCount[e.code] = true;
    setHeld(held, a, true);
    // Z and Space also confirm menus
    if (a === 'jump') q.confirm = true;
  });
  window.addEventListener('keyup', e => {
    const a = KEYS[e.code];
    if (!a) return;
    heldCount[e.code] = false;
    // another key bound to the same action may still be down
    const still = Object.keys(KEYS).some(c => KEYS[c] === a && heldCount[c]);
    if (!still) setHeld(held, a, false);
  });
  window.addEventListener('blur', () => {
    for (const k in held) held[k] = false;
    for (const k in touch) touch[k] = false;
    for (const k in heldCount) heldCount[k] = false;
  });

  // on-screen buttons: each pointer remembers which button it pressed
  function bindTouch() {
    const buttons = document.querySelectorAll('[data-act]');
    const owner = new Map();
    buttons.forEach(b => {
      const act = b.dataset.act;
      const down = e => {
        e.preventDefault();
        owner.set(e.pointerId, b);
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        b.classList.add('on');
        setHeld(touch, act, true);
        if (act === 'jump') q.confirm = true;
      };
      const up = e => {
        if (owner.get(e.pointerId) !== b) return;
        owner.delete(e.pointerId);
        b.classList.remove('on');
        setHeld(touch, act, false);
      };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  }

  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const g = pads && Array.from(pads).find(p => p && p.connected);
    const now = {};
    if (g) {
      const b = i => !!(g.buttons[i] && g.buttons[i].pressed);
      const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      now.left = ax < -0.4 || b(14); now.right = ax > 0.4 || b(15);
      now.up = ay < -0.5 || b(12); now.down = ay > 0.5 || b(13);
      now.jump = b(0); now.attack = b(2) || b(1); now.dash = b(5) || b(7) || b(4);
      now.cast = b(3) || b(6); now.map = b(8); now.pause = b(9); now.confirm = b(0);
    }
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'cast', 'map', 'pause', 'confirm']) {
      const was = !!padPrev[a], on = !!now[a];
      if (a !== 'confirm') setHeld(pad, a, on);
      else if (on && !was) q.confirm = true;
      padPrev[a] = on;
    }
  }

  return {
    init() { bindTouch(); },
    poll: pollPad,
    down: a => isHeld(a),
    pressed: a => !!q[a],
    released: a => !!rel[a],
    consume: a => { q[a] = false; },
    endStep() { for (const k in q) q[k] = false; for (const k in rel) rel[k] = false; },
    axisX: () => (isHeld('right') ? 1 : 0) - (isHeld('left') ? 1 : 0),
    axisY: () => (isHeld('down') ? 1 : 0) - (isHeld('up') ? 1 : 0),
  };
})();
