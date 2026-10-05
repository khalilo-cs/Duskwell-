'use strict';
// The things the side quests ask for (quests.js): a pack, a flask, a shard, a bone, a lens, a spool. Each lies on the floor the way runs
// along, on a free spot, at a share of the room's width; it is only there while the quest that wants it asks for it. Rooms that have no free
// spot on the way (none of these do) would leave the quest unfinishable, which tests/quests.test.js checks.
(function placeQuestItems() {
  // [item id, room, share of the room's width, picture]
  const ITEMS = [
    ['qi_m1_a', 'cx2', 0.3, 'pack'], ['qi_m1_b', 'cx4', 0.5, 'pack'], ['qi_m1_c', 'cx5', 0.6, 'pack'],
    ['qi_m5_a', 'wd3', 0.5, 'spool'],
    ['qi_m6_a', 'os2', 0.45, 'bone'], ['qi_m6_b', 'os5', 0.5, 'bone'],
    ['qi_m7_a', 'lo2', 0.4, 'lens'], ['qi_m7_b', 'lo1', 0.5, 'lens'],
    ['qi_w1_a', 'mg1', 0.35, 'flask'], ['qi_w1_b', 'mg4', 0.5, 'flask'], ['qi_w1_c', 'mg2', 0.7, 'flask'],
    ['qi_w4_a', 'fr3', 0.3, 'shard'], ['qi_w4_b', 'fr5', 0.5, 'shard'], ['qi_w4_c', 'fr7', 0.6, 'shard'],
  ];
  for (const [id, room, f, icon] of ITEMS) {
    const r = WORLD.rooms[room]; if (!r) continue;
    let list = WORLD.freeSpots(r); if (!list.length) continue;
    const low = Math.max(...list.map(s => s.y)); list = list.filter(s => s.y >= low - 2);
    list.sort((a, b) => Math.abs(a.x - r.w * f) - Math.abs(b.x - r.w * f));
    r.item(id, list[0].x, list[0].y, 'quest', { quest: id.split('_')[1], icon });
  }
})();
