'use strict';
// Rooms of the Lunar Observatory and the Mirror Vault that are drawn in front of a whole painting (art/bg/<set>/sky.webp)
// instead of the layered backdrop of their area.
(() => {
  const SETS = { lunar_moon: ['lo1', 'lo4', 'lo7', 'lo10'], lunar_hall: ['lo2', 'lo8'], lunar_dome: ['lo5', 'lo9'],
    mirror_city: ['mv1', 'mv4', 'mv7', 'mv10'], mirror_hall: ['mv2', 'mv5', 'mv8'] };
  for (const [bg, ids] of Object.entries(SETS)) for (const id of ids) if (WORLD.rooms[id]) WORLD.rooms[id].bg = bg;
})();
