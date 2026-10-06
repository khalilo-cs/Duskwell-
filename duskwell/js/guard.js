'use strict';
// A drawing that fails must not leave the picture broken. save() and restore() of the contexts are counted, so whatever a failing drawing
// left open can be closed again (a saved state holds the alpha, the transform and the clip as they were), the frame goes on with the next
// thing, and the failure is told once in the console. (A boss drawing that threw between its save() and restore() once left the alpha
// near 0 on the layer the hero and the creatures are drawn on, and they stayed invisible for the rest of the game.)
const Guard = (() => {
  const told = new Set();
  const track = g => {
    if (!g || g.__open !== undefined) return g;
    g.__open = 0;
    const save = g.save, restore = g.restore;
    g.save = function () { this.__open++; return save.call(this); };
    g.restore = function () { if (this.__open > 0) this.__open--; return restore.call(this); };
    return g;
  };
  const open = g => (g && g.__open) || 0;
  // close what is open above the level to (0 = everything)
  const unwind = (g, to) => { to = to || 0; for (let n = 0; open(g) > to && n < 5000; n++) g.restore(); };
  // the canvas was resized: its saved states are gone
  const forget = g => { if (g && g.__open !== undefined) g.__open = 0; };
  const report = (what, e) => {
    const k = what + ': ' + (e && e.message);
    if (told.has(k) || told.size > 20) return;
    told.add(k); console.error('Draw: ' + k);
  };
  // run one drawing; if it throws, close what it left open, say so once, and go on
  const run = (g, what, fn) => { const d = open(g); try { fn(); } catch (e) { unwind(g, d); report(what, e); } };
  return { track, open, unwind, forget, run, report };
})();
