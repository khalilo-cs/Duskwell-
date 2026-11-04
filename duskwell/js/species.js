'use strict';
// New species (js/species_meta.js, made by tools/sprites/cut_species.py from their painted sheets): each one is an area's own creature that
// moves and fights with the brain of an older one (a hound that leaps like the husk, a glass crab that patrols like the crawler ...),
// with its own look, stats, blood colour, bestiary page and places in the rooms of its area.
const Species = (() => {
  const LIST = typeof SPECIES !== 'undefined' ? SPECIES : [];
  const STATS = {                      // hp, geo, speed factor, blood
    gloomhound: [14, 4, 1.15, '#9fb8ff'], thornback: [16, 4, 0.85, '#8fe8b8'], cinderling: [16, 5, 1, '#ff9a4a'],
    frostwisp: [12, 4, 1, '#dff6ff'], glasscrab: [18, 5, 1, '#e6dcff'], bonejackal: [14, 4, 1.2, '#f2e8d0'],
    gearmite: [16, 5, 1, '#ffb070'], stormkite: [14, 5, 1.1, '#d0e4ff'], silkstalker: [14, 5, 1, '#e0d0ff'],
    sporeling: [14, 4, 1, '#ffc070'], tidecrab: [16, 5, 1, '#8fe8ff'], starwisp: [12, 4, 1, '#f4f4ff'],
  };
  const made = [];
  for (const s of LIST) {
    const Base = ENEMY_TYPES[s.parent]; if (!Base) continue;
    const st = STATS[s.k] || [14, 4, 1, '#ffffff'];
    const C = class extends Base {
      constructor(d) {
        super(Object.assign({}, d, s.move === 'spider' ? { ground: true } : null));
        this.hp = st[0]; this.geo = st[1]; this.blood = st[3];
        if (this.speed) this.speed *= st[2];
      }
    };
    ENEMY_TYPES[s.k] = C;
    // its frames: the brain of the creature it moves like, its own sheet
    if (typeof AnimArt !== 'undefined' && AnimArt.CFG[s.parent]) AnimArt.add(s.k, Object.assign({}, AnimArt.CFG[s.parent]));
    // its page in the bestiary
    if (typeof BESTIARY !== 'undefined' && !BESTIARY.some(b => !b.boss && b.k === s.k)) {
      BESTIARY.push({ k: s.k, area: s.area, ar: s.ar, en: s.en });
      BESTIARY_INDEX['e:' + s.k] = BESTIARY.length - 1;
    }
    made.push(s.k);
  }
  // places in the rooms of their area: on a floor with room to walk (or in the air for flyers), away from doors, benches,
  // stations, signs, people, pickups and the creatures already there; never in a boss arena
  function place() {
    if (typeof WORLD === 'undefined') return;
    for (const s of LIST) {
      if (!ENEMY_TYPES[s.k]) continue;
      const rooms = WORLD.order.map(id => WORLD.rooms[id]).filter(r => r.area === s.area && !r.arena && r.enemies);
      let n = 0;
      for (let ri = 0; ri < rooms.length && n < 4; ri += Math.max(1, Math.floor(rooms.length / 4))) {
        const r = rooms[ri], spot = findSpot(r, s.move === 'fly');
        if (!spot) continue;
        r.enemies.push({ type: s.k, x: spot.x, y: spot.y, species: true }); n++;
      }
    }
  }
  function findSpot(r, fly) {
    const solid = (x, y) => { const v = r.get ? r.get(x, y) : r.t[y * r.w + x]; return v === T_SOLID; };
    const free = (x, y) => x >= 0 && y >= 0 && x < r.w && y < r.h && (r.get ? r.get(x, y) : r.t[y * r.w + x]) === T_AIR;
    const busy = [].concat(r.doors || [], r.benches || [], r.stations || [], r.signs || [], r.npcs || [], r.items || [], r.enemies || [], r.mech || []);
    const near = (x, y) => busy.some(q => Math.abs((q.x || 0) - x) < 6 && Math.abs((q.y || 0) - y) < 5);
    const cand = [];
    for (let y = 2; y < r.h - 1; y++) for (let x = 3; x < r.w - 3; x++) {
      if (!solid(x, y + 1) || !free(x, y) || !free(x, y - 1) || !free(x, y - 2)) continue;
      // a run of floor at least 6 tiles wide to walk on
      let run = 0; for (let i = -3; i <= 3; i++) if (solid(x + i, y + 1) && free(x + i, y)) run++;
      if (run < 6 || near(x, y)) continue;
      if (fly) { if (free(x, y - 3) && free(x, y - 4)) cand.push({ x, y: y - 3 }); }
      else cand.push({ x, y });
    }
    if (!cand.length) return null;
    return cand[Math.floor(cand.length * 0.62) % cand.length];
  }
  place();
  return { list: made, place };
})();
