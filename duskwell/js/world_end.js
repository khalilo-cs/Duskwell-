'use strict';
// The last world file: it lists the rooms in order and cuts the doors, after every area file has added its rooms.
WORLD.order = Object.keys(WORLD.rooms);
for (const id of WORLD.order) WORLD.rooms[id].finish();
