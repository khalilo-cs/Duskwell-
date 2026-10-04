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
  return {
    ORDER, tier,
    // multiplier on the health of the enemies and bosses of an area
    enemyHp: area => 1.25 + 0.025 * tier(area),
    bossHp: area => 1.2 + 0.02 * tier(area),
    // how fast the creatures of an area act (their clocks run this much faster) and how far they notice the hero
    tempo: area => 1 + 0.01 * tier(area),
    sight: area => 1.05 + 0.01 * tier(area),
    // the cleverness a creature is born with, by depth: level 0 in the first five areas, 1 in the next five, 2 in the last five (see mind.js)
    innate: area => Math.min(2, Math.floor(tier(area) / 5)),
    // how much it hurts a creature to be pushed: the deeper, the less they flinch (a share of the normal knockback)
    flinch: area => Math.max(0.65, 1 - 0.025 * tier(area)),
    // seconds the hero cannot be hurt again after a wound (before the cloak's factor)
    grace: 1.1,
    // the soul vessel holds three times what it did, and a blow gathers three quarters of what it was worth: it fills a little slower
    soulMax: 297,
    soulFill: 0.75,
  };
})();
