'use strict';
// How hard the game plays. The areas have a fixed order of depth (ORDER); enemies and bosses get
// tougher, quicker and sharper-eyed the deeper the area is, and the hero stays untouchable a little shorter after a wound.
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
    enemyHp: area => 1.3 + 0.03 * tier(area),
    bossHp: area => 1.3 + 0.025 * tier(area),
    // how fast the creatures of an area act (their clocks run this much faster) and how far they notice the hero
    tempo: area => 1 + 0.012 * tier(area),
    sight: area => 1.05 + 0.01 * tier(area),
    // seconds the hero cannot be hurt again after a wound (before the cloak's factor)
    grace: 1.05,
  };
})();
