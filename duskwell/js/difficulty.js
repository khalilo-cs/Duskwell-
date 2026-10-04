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
    enemyHp: area => 1.6 + 0.05 * tier(area),
    bossHp: area => 1.5 + 0.04 * tier(area),
    // how fast the creatures of an area act (their clocks run this much faster) and how far they notice the hero
    tempo: area => 1.06 + 0.015 * tier(area),
    sight: area => 1.1 + 0.015 * tier(area),
    // the cleverness a creature is born with, by depth: level 0 in the first four areas up to 3 in the last ones (see mind.js)
    innate: area => Math.min(3, Math.floor(tier(area) / 4)),
    // how much it hurts a creature to be pushed: the deeper, the less they flinch (a share of the normal knockback)
    flinch: area => Math.max(0.5, 1 - 0.04 * tier(area)),
    // seconds the hero cannot be hurt again after a wound (before the cloak's factor)
    grace: 0.9,
    // the soul vessel holds three times what it did, and a blow gathers only half of what it was worth: it takes long to fill
    soulMax: 297,
    soulFill: 0.5,
  };
})();
