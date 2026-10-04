'use strict';
// How hard the game plays. The areas have a fixed order of depth (ORDER); enemies and bosses get
// tougher the deeper the area is, and the hero stays untouchable a little shorter after a wound.
const Diff = (() => {
  // the areas from the first to the last
  const ORDER = ['hushvale', 'crossroads', 'mossgrove', 'spore', 'crystal', 'webbed', 'aqueduct', 'rustworks',
    'frost', 'ember', 'stormcrest', 'mirror', 'ossuary', 'lunar', 'throne'];
  // depth of an area, 0 for the first
  const tier = area => Math.max(0, ORDER.indexOf(area));
  return {
    ORDER, tier,
    // multiplier on the health of the enemies and bosses of an area
    enemyHp: area => 1.15 + 0.02 * tier(area),
    bossHp: area => 1.15 + 0.015 * tier(area),
    // seconds the hero cannot be hurt again after a wound (before the cloak's factor)
    grace: 1.25,
  };
})();
