// Dev helper: prints every room as ASCII and checks door pairing. Usage: node duskwell/tools-dump.js [roomId]
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = {}; vm.createContext(ctx);
for (const f of ['util.js', 'world.js', 'world_frost.js', 'world_ember.js', 'world_end.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, 'js', f), 'utf8') + (f === 'world_end.js' ? ';this.WORLD=WORLD;' : ''), ctx);
const W = ctx.WORLD, only = process.argv[2];
let errors = 0;
for (const id of W.order) {
  const r = W.rooms[id];
  for (const d of r.doors) {
    const t = W.rooms[d.to];
    const back = t && t.doors.find(x => x.id === d.toDoor);
    if (!back || back.to !== id || back.toDoor !== d.id) { console.log('DOOR MISMATCH', id, d.id, '->', d.to, d.toDoor); errors++; }
    const edge = d.x === 0 || d.y === 0 || d.x + d.w === r.w || d.y + d.h === r.h;
    if (!edge) { console.log('DOOR NOT AT EDGE', id, d.id); errors++; }
  }
  const chk = (e, what) => {
    const c = r.at(e.x, e.y);
    if (c === 1 || c === 4) { console.log('ENTITY IN SOLID', id, what, e.type || e.id, e.x, e.y); errors++; }
  };
  r.enemies.forEach(e => {
    chk(e, 'enemy');
    const ground = ['crawler', 'hopper', 'spitter', 'sentinel', 'shard', 'shroom', 'warden', 'ram', 'mole', 'lavaworm', 'imp', 'roller', 'slime', 'chainman'].includes(e.type);
    if (ground) { const b = r.at(e.x, e.y + 1); if (b !== 1 && b !== 2 && b !== 4) { console.log('ENEMY NOT ON GROUND', id, e.type, e.x, e.y); errors++; } }
  });
  r.enemies.forEach(e => { if (e.type === 'icicle' && r.at(e.x, e.y - 1) !== 1) { console.log('ICICLE NOT UNDER A CEILING', id, e.x, e.y); errors++; } });
  r.items.forEach(e => chk(e, 'item'));
  r.benches.forEach(e => { chk(e, 'bench'); const b = r.at(e.x, e.y + 1); if (b !== 1 && b !== 2 && b !== 7) { console.log('BENCH FLOATING', id, e.x, e.y); errors++; } });
  if (only && only !== id) continue;
  if (process.argv[2] === undefined) continue;
  console.log('== ' + id + ' ' + r.w + 'x' + r.h);
  const ch = ' #-^B';
  for (let y = 0; y < r.h; y++) {
    let line = '';
    for (let x = 0; x < r.w; x++) line += ' #-^%XmC~'[r.at(x, y)] || '?';
    const arr = line.split('');
    r.enemies.forEach(e => { if (e.y === y) arr[e.x] = e.type[0]; });
    r.items.forEach(e => { if (e.y === y) arr[e.x] = '*'; });
    r.benches.forEach(e => { if (e.y === y) arr[e.x] = 'B'; });
    r.doors.forEach(d => { for (let j = d.y; j < d.y + d.h; j++) for (let i = d.x; i < d.x + d.w; i++) if (j === y) arr[i] = 'D'; });
    console.log(String(y).padStart(2) + ' ' + arr.join(''));
  }
}
console.log(errors ? errors + ' problem(s)' : 'world OK (' + W.order.length + ' rooms)');
