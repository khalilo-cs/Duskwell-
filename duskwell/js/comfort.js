'use strict';
// Eye comfort. The painted backgrounds are saturated blues and oranges, the lights glow and the screen flashes white on a wound, a gate or
// a fallen guardian, which tires the eyes. Three levels (kept in this browser): Standard is the old look; Soft (the default) takes some colour
// and contrast from the picture, warms it a little and tones down the flashes, the shake, the glow and the lightning; Softest goes further.
// The colour change is a CSS filter on the canvas, so it covers every area, the menus and both lighting paths; the rest are factors the
// game multiplies its effects by (game.js, lumen.js).
const Comfort = (() => {
  const LEVELS = [
    { ar: 'عادي', en: 'Standard', css: '', flash: 1, shake: 1, aberr: 1, bloom: 1, bolt: 1 },
    { ar: 'مريح', en: 'Soft', css: 'saturate(0.74) contrast(0.93) brightness(0.96) sepia(0.08)', flash: 0.3, shake: 0.6, aberr: 0.5, bloom: 0.7, bolt: 0.5 },
    { ar: 'مريح جداً', en: 'Softest', css: 'saturate(0.55) contrast(0.88) brightness(0.92) sepia(0.14)', flash: 0.12, shake: 0.35, aberr: 0, bloom: 0.5, bolt: 0.25 },
  ];
  let lvl = 1;
  try { const v = localStorage.getItem('duskwell_comfort'); if (v === '0' || v === '1' || v === '2') lvl = +v; } catch (e) { /* storage may be blocked */ }
  const apply = () => { try { const c = document.getElementById('c'); if (c) c.style.filter = LEVELS[lvl].css; } catch (e) { /* no page */ } };
  apply();
  return {
    LEVELS,
    get level() { return lvl; },
    get flash() { return LEVELS[lvl].flash; },
    get shake() { return LEVELS[lvl].shake; },
    get aberr() { return LEVELS[lvl].aberr; },
    get bloom() { return LEVELS[lvl].bloom; },
    get bolt() { return LEVELS[lvl].bolt; },
    set(n) { lvl = LEVELS[n] ? n : 1; try { localStorage.setItem('duskwell_comfort', String(lvl)); } catch (e) { /* ignore */ } apply(); },
    next() { this.set((lvl + 1) % LEVELS.length); },
    label() { return LEVELS[lvl][LANG.cur === 'ar' ? 'ar' : 'en']; },
    apply,
  };
})();
