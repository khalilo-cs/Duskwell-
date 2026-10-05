'use strict';
// How hard the game plays. The areas have a fixed order of depth (ORDER); enemies and bosses get
// tougher, quicker, sharper-eyed and born cleverer the deeper the area is, the hero stays untouchable a little shorter after a wound,
// and the soul vessel is large but slow to fill.
// What the creatures learn from the player on top of this is in mind.js.
const Diff = (() => {
  // the areas from the first to the last
  const ORDER = ['hushvale', 'crossroads', 'mossgrove', 'spore', 'crystal', 'webbed', 'aqueduct', 'rustworks',
    'frost', 'ember', 'stormcrest', 'mirror', 'ossuary', 'lunar', 'throne'];
  // depth of an area, 0 for the first
  const tier = area => Math.max(0, ORDER.indexOf(area));
  // the three settings the player picks (title and pause menus); every number below is for 'normal' and these factors scale it:
  // hp and boss for health, tempo and sight for how fast and how far the creatures act, innate for the cleverness they are born with
  // (added to the depth's own level), flinch for how far a blow pushes them, grace for the seconds of safety after a wound, fill for the soul a blow gathers
  const MODES = {
    easy:   { ar: 'سهل', en: 'Easy', hp: 0.75, boss: 0.8, tempo: 0.94, sight: 0.9, innate: -1, flinch: 1.15, grace: 1.35, fill: 1.25 },
    normal: { ar: 'عادي', en: 'Normal', hp: 1, boss: 1, tempo: 1, sight: 1, innate: 0, flinch: 1, grace: 1, fill: 1 },
    hard:   { ar: 'صعب', en: 'Hard', hp: 1.3, boss: 1.25, tempo: 1.07, sight: 1.12, innate: 1, flinch: 0.85, grace: 0.9, fill: 0.7 },
  };
  const ORDER_OF_MODES = ['easy', 'normal', 'hard'];
  let mode = 'normal';
  const M = () => MODES[mode];
  return {
    ORDER, tier, MODES, MODE_ORDER: ORDER_OF_MODES,
    get mode() { return mode; },
    // pick a setting and keep it for the next time the game opens
    setMode(m) { mode = MODES[m] ? m : 'normal'; try { localStorage.setItem('duskwell_diff', mode); } catch (e) { /* storage may be blocked */ } },
    loadMode() { try { const m = localStorage.getItem('duskwell_diff'); if (MODES[m]) mode = m; } catch (e) { /* ignore */ } },
    nextMode() { return ORDER_OF_MODES[(ORDER_OF_MODES.indexOf(mode) + 1) % ORDER_OF_MODES.length]; },
    // multiplier on the health of the enemies and bosses of an area
    enemyHp: area => (1.25 + 0.025 * tier(area)) * M().hp,
    bossHp: area => (1.2 + 0.02 * tier(area)) * M().boss,
    // how fast the creatures of an area act (their clocks run this much faster) and how far they notice the hero
    tempo: area => (1 + 0.01 * tier(area)) * M().tempo,
    sight: area => (1.05 + 0.01 * tier(area)) * M().sight,
    // the cleverness a creature is born with, by depth: level 0 in the first five areas, 1 in the next five, 2 in the last five (see mind.js)
    innate: area => Math.max(0, Math.min(3, Math.min(2, Math.floor(tier(area) / 5)) + M().innate)),
    // how much it hurts a creature to be pushed: the deeper, the less they flinch (a share of the normal knockback)
    flinch: area => Math.max(0.55, Math.min(1.3, (1 - 0.025 * tier(area)) * M().flinch)),
    // seconds the hero cannot be hurt again after a wound (before the cloak's factor)
    get grace() { return 1.1 * M().grace; },
    // the soul vessel holds three times what it did, and a blow gathers three quarters of what it was worth: it fills a little slower
    soulMax: 297,
    get soulFill() { return 0.75 * M().fill; },
  };
})();
