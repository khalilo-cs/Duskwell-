// The difficulty setting: easy, normal and hard scale the creatures, the hero's grace and the soul the way the numbers say, the choice
// is kept for the next time, and it can be changed from the title and the pause menus.
const { open } = require('./lib');
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };
const near = (a, b) => Math.abs(a - b) < 1e-9;
(async () => {
  const { browser, page, errors } = await open({});
  const ev = (f, a) => page.evaluate(f, a);
  // ---- the numbers
  let r = await ev(() => {
    const out = {}; for (const m of ['easy', 'normal', 'hard']) {
      Diff.setMode(m);
      out[m] = { hp: Diff.enemyHp('hushvale'), hpDeep: Diff.enemyHp('throne'), boss: Diff.bossHp('hushvale'), tempo: Diff.tempo('hushvale'), sight: Diff.sight('hushvale'), inn0: Diff.innate('hushvale'), inn14: Diff.innate('throne'), inn7: Diff.innate('rustworks'), fl: Diff.flinch('hushvale'), flDeep: Diff.flinch('throne'), grace: Diff.grace, fill: Diff.soulFill };
    }
    Diff.setMode('normal'); return out;
  });
  const n = r.normal;
  ok('normal is what the game has always played at', near(n.hp, 1.25) && near(n.boss, 1.2) && near(n.tempo, 1) && near(n.sight, 1.05) && n.inn0 === 0 && n.inn14 === 2 && near(n.fl, 1) && near(n.grace, 1.1) && near(n.fill, 0.75) && near(n.hpDeep, 1.25 + 0.025 * 14), n);
  ok('easy: weaker, slower and less sharp-eyed creatures, no cleverness to begin with, a longer grace and a faster soul', r.easy.hp < n.hp && r.easy.boss < n.boss && r.easy.tempo < 1 && r.easy.sight < n.sight && r.easy.inn0 === 0 && r.easy.inn14 === 1 && r.easy.grace > n.grace && r.easy.fill > n.fill && r.easy.fl > n.fl, r.easy);
  ok('hard: tougher, quicker, born cleverer, a shorter grace and a slower soul', r.hard.hp > n.hp && r.hard.boss > n.boss && r.hard.tempo > 1 && r.hard.sight > n.sight && r.hard.inn0 === 1 && r.hard.inn14 === 3 && r.hard.grace < n.grace && r.hard.fill < n.fill && r.hard.flDeep < n.flDeep, r.hard);
  ok('easy is a quarter lighter than normal in health and hard a third heavier', near(r.easy.hp / n.hp, 0.75) && near(r.hard.hp / n.hp, 1.3), [r.easy.hp / n.hp, r.hard.hp / n.hp]);
  // ---- kept
  r = await ev(() => { Diff.setMode('hard'); const saved = localStorage.getItem('duskwell_diff'); localStorage.setItem('duskwell_diff', 'easy'); Diff.loadMode(); const back = Diff.mode; localStorage.setItem('duskwell_diff', 'nonsense'); Diff.loadMode(); const kept = Diff.mode; Diff.setMode('nonsense'); const bad = Diff.mode; Diff.setMode('normal'); return { saved, back, kept, bad }; });
  ok('the choice is written to storage and read back; a nonsense value in storage changes nothing, and a nonsense setting falls back to normal', r.saved === 'hard' && r.back === 'easy' && r.kept === 'easy' && r.bad === 'normal', r);
  r = await ev(() => { const o = []; Diff.setMode('easy'); o.push(Diff.nextMode()); Diff.setMode('normal'); o.push(Diff.nextMode()); Diff.setMode('hard'); o.push(Diff.nextMode()); Diff.setMode('normal'); return o; });
  ok('the menus step easy, normal, hard and round again', r.join() === 'normal,hard,easy', r);
  // ---- what it does in the game
  const hpIn = async mode => ev(mode => { Diff.setMode(mode); DW.enterRoom('cx2', { pos: { x: 100, y: 100 } }); const G = DW.G; return G.enemies.map(e => e.maxHp || e.hp).reduce((a, b) => a + b, 0); }, mode);
  const e = await hpIn('easy'), nn = await hpIn('normal'), h = await hpIn('hard');
  ok('the same room has less total health in easy and more in hard', e < nn && nn < h, { e, nn, h });
  r = await ev(() => { const { P } = DW; const o = {}; for (const m of ['easy', 'normal', 'hard']) { Diff.setMode(m); P.soul = 0; P.gainSoul(10); o[m] = P.soul; } Diff.setMode('normal'); return o; });
  ok('ten points of soul gathered fill 9.375, 7.5 and 5.25 in easy, normal and hard', near(r.easy, 9.375) && near(r.normal, 7.5) && near(r.hard, 5.25), r);
  r = await ev(() => { const { P, G } = DW; const o = {}; for (const m of ['easy', 'normal', 'hard']) { Diff.setMode(m); DW.enterRoom('cx2', { pos: { x: 100, y: 100 } }); G.state = 'play'; P.hp = P.maxHp; P.invuln = 0; P.hurtT = 0; P.hurt && P.hurt(1, { x: 0, y: 0 }); o[m] = P.invuln; } Diff.setMode('normal'); return o; });
  ok('the seconds of safety after a wound are longer in easy and shorter in hard', r.easy > r.normal && r.normal > r.hard && r.hard > 0.8, r);
  r = await ev(() => { Diff.setMode('hard'); const lv = Mind.describe('husk', 'hushvale').level; Diff.setMode('easy'); const lo = Mind.describe('b:guardian', 'throne').level; Diff.setMode('normal'); return { lv, lo }; });
  ok('what a creature is born with follows the setting: hard gives a first-area creature level 1, easy a last-area one level 1', r.lv === 1 && r.lo === 1, r);
  // ---- the menus
  r = await ev(() => { const G = DW.G; G.state = 'title'; G.confirmNew = false; Diff.setMode('normal'); const t = titleItems(); G.state = 'pause'; const p = pauseItems(); return { title: t.map(i => i.id), pause: p.map(i => i.id), label: t.find(i => i.id === 'diff').label }; });
  ok('the title and pause menus have a difficulty entry that shows the setting', r.title.includes('diff') && r.pause.includes('diff') && /عادي/.test(r.label), r);
  await ev(() => { const G = DW.G; G.state = 'title'; G.confirmNew = false; G.menuSel = titleItems().findIndex(i => i.id === 'diff'); });
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => ({ mode: Diff.mode, state: DW.G.state })); ok('Enter on it in the title menu steps the setting (normal to hard)', r.mode === 'hard' && r.state === 'title', r);
  await ev(() => { const G = DW.G; DW.enterRoom('town', { pos: { x: 200, y: 300 } }); G.trans = null; G.fadeA = 0; G.state = 'pause'; G.menuSel = pauseItems().findIndex(i => i.id === 'diff'); });
  await page.keyboard.press('Enter'); await ev(() => DW.step(2));
  r = await ev(() => ({ mode: Diff.mode, toast: DW.G.toast && DW.G.toast.text })); ok('and in the pause menu (hard to easy), with a note that it applies to the next rooms', r.mode === 'easy' && /الغرف|rooms/.test(r.toast || ''), r);
  r = await ev(() => { const out = [], G = DW.G; for (const lang of ['ar', 'en']) for (const m of ['easy', 'normal', 'hard']) for (const st of ['title', 'pause']) { setLang(lang); Diff.setMode(m); G.state = st; G.menuHits = []; try { DW.draw(); } catch (e2) { out.push(lang + m + st + ':' + e2.message); } } setLang('ar'); Diff.setMode('normal'); G.state = 'play'; return out; });
  ok('both menus draw with every setting in both languages', r.length === 0, r);
  ok('no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
