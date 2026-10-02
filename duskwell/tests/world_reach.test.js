// Every new room can be crossed with the abilities the game expects at that point, and the gates really gate:
// the explorer (explore.js) drives the real physics, so what it reaches is reachable by a player.
const { open } = require('./lib');
const { install, run } = require('./explore');
const D = { dash: true }, DW_ = { dash: true, wall: true }, DWD = { dash: true, wall: true, double: true };
// [room, arrival door, abilities, doors that must be reached, items that must be reached, abilities that must NOT be enough (door that stays out of reach)]
const SPECS = [
  ['fr1', 'w', D, ['e'], [], [{}, 'e']],
  ['fr2', 'w', DW_, ['e'], ['seed_fr2'], [D, 'e']],
  ['fr3', 'w', DW_, ['e'], ['seed_fr3'], null],
  ['fr4', 'w', DWD, ['e', 'ne'], ['charm_soles'], null],   // 'ne' is the way up to Stormcrest
  ['fr5', 'w', DW_, ['e'], ['cache_fr5'], null],
  ['fr5', 'e', DWD, ['w'], [], null],               // the way back up the gorge
  ['fr6', 'w', DW_, ['e'], ['seed_fr6'], null],
  ['fr7', 'w', DW_, ['e'], [], null],
  ['fr8', 'w', DW_, [], [], null],
  ['em1', 'e', D, ['w'], [], [{}, 'w']],
  ['em2', 'e', DW_, ['w'], ['cache_em2'], [D, 'w']],
  ['em3', 'e', DW_, ['w'], ['seed_em3'], null],
  ['em4', 'e', DW_, ['w'], [], null],
  ['em5', 'e', DWD, ['w'], ['cache_em5'], [DW_, 'w']],
  ['em6', 'e', DWD, ['w', 'nw'], ['seed_em6'], null],   // 'nw' is the way down to the Mirror Vault
  ['em7', 'e', DWD, ['w'], [], null],
  ['em8', 'e', DWD, [], [], null],
  // Stormcrest: wind is part of the physics, so the explorer also tries holding no direction
  ['sc1', 'w', DWD, ['e'], [], null, { neutral: true }],
  ['sc2', 'w', DWD, ['e'], ['cache_sc2'], null, { neutral: true }],
  ['sc3', 'w', DWD, ['e'], [], null, { neutral: true }],
  ['sc4', 'w', DWD, [], [], null],
  ['sc5', 'w', DWD, ['e'], ['seed_sc5'], null, { neutral: true }],
  ['sc6', 'w', DWD, ['e'], [], null],
  ['sc7', 'w', DWD, [], [], null],
  // the Mirror Vault: entered from the right like Cinderdeep
  ['mv1', 'e', DWD, ['w'], [], [DW_, 'w']],
  ['mv2', 'e', DWD, ['w'], ['cache_mv2'], [DW_, 'w']],
  ['mv3', 'e', DWD, ['w'], ['seed_mv3'], null],
  ['mv4', 'e', DWD, [], [], null],
  ['mv5', 'e', DWD, ['w'], ['cache_mv5'], null],
  ['mv6', 'e', DWD, ['w'], [], null],
  ['mv7', 'e', DWD, [], [], null],
];
(async () => {
  const { browser, page, errors } = await open();
  await install(page);
  let fails = 0;
  const only = process.argv[2];
  for (const [room, door, ab, doors, items, gate, xo] of SPECS) {
    if (only && only !== room) continue;
    const t0 = Date.now();
    const r = await run(page, room, ab, { door }, Object.assign({ breakAll: true }, xo));
    const missD = doors.filter(d => !r.doors.includes(d)), missI = items.filter(i => !r.items.includes(i));
    let line = room + ':' + door + ' reached ' + r.reached + '/' + r.standable + (missD.length ? '  MISSING doors ' + missD : '') + (missI.length ? '  MISSING items ' + missI : '');
    let ok = !missD.length && !missI.length;
    if (gate) {
      const g = await run(page, room, gate[0], { door }, Object.assign({ breakAll: true }, xo));
      const stuck = !g.doors.includes(gate[1]);
      line += stuck ? '  (gated: needs more than ' + JSON.stringify(gate[0]) + ')' : '  NOT GATED by ' + JSON.stringify(gate[0]);
      ok = ok && stuck;
    }
    console.log((ok ? 'PASS ' : 'FAIL ') + line + '  ' + (Date.now() - t0) + 'ms');
    if (!ok) fails++;
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); console.log(errors.join('\n') || 'no page errors');
  await browser.close(); process.exit(fails || errors.length ? 1 : 0);
})();
