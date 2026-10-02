'use strict';
// "Your images": the player can replace the drawing of the hero, any monster or any boss with a
// picture from their own device, for learning and experiments. Load an image (a single sprite or
// a whole sheet), drag a box over the part you want, and assign it to a character.
// Crops are kept only in this browser (localStorage); nothing is uploaded or shipped with the game.
const Skins = (() => {
  const KEY = 'duskwell_skins_v1', MAX = 256;
  const SLOTS = [
    ['player', 'البطل', 'Hero'],
    ['husk', 'الهيكل', 'Husk'], ['crawler', 'الزاحف', 'Crawler'], ['flyer', 'الطائر', 'Flyer'], ['hopper', 'القافز', 'Hopper'],
    ['warden', 'حارس الدرع', 'Shield Warden'], ['ram', 'النطّاح', 'Ram'], ['spitter', 'البصّاق', 'Spitter'], ['shard', 'برج البلّور', 'Crystal turret'], ['sentinel', 'الحارس', 'Sentinel'],
    ['diver', 'البعوضة', 'Diver'], ['spider', 'العنكبوت', 'Spider'], ['shroom', 'الفطر الماشي', 'Shroom'], ['jelly', 'قنديل البحر', 'Jelly'],
    ['boss_guardian', 'زعيم: الحارس الحجري', 'Boss: Stone Guardian'], ['boss_spore', 'زعيم: أم الفطر', 'Boss: Sporecap'],
    ['boss_weaver', 'زعيم: حائكة الأشواك', 'Boss: Thorn Weaver'], ['boss_drowned', 'زعيم: العملاق الغريق', 'Boss: Drowned Giant'],
    ['boss_wraith', 'زعيم: شبح البلّور', 'Boss: Crystal Wraith'], ['boss_brood', 'زعيم: أم الحضنة', 'Boss: Brood Mother'],
    ['boss_king', 'زعيم: الملك المجوّف', 'Boss: Hollow King'],
    ['mole', 'الخلد', 'Mole'], ['lavaworm', 'دودة الحمم', 'Lava Worm'], ['imp', 'عفريت القنابل', 'Bomb Imp'], ['veil', 'الحجاب', 'Veil'],
    ['roller', 'المدحرج', 'Roller'], ['slime', 'الهلام', 'Slime'], ['chainman', 'حامل السلسلة', 'Chain Bearer'], ['moth', 'فراشة الليل', 'Night Moth'], ['icicle', 'الجليدة', 'Icicle'],
    ['boss_queen', 'زعيم: ملكة الصقيع', 'Boss: Rime Queen'], ['boss_thunderhoof', 'زعيم: حافر الرعد', 'Boss: Thunderhoof'], ['boss_roc', 'زعيم: طائر العاصفة', 'Boss: Storm Roc'],
    ['boss_duelist', 'زعيم: مبارز الزجاج', 'Boss: Glass Duelist'], ['boss_twin', 'زعيم: توأم الجوّال', 'Boss: Wanderer\'s Twin'], ['boss_colossus', 'زعيم: العملاق الجمري', 'Boss: Cinder Colossus'],
  ];
  const imgs = {};          // slot -> HTMLImageElement
  let data = {};            // slot -> data URL
  try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { data = {}; }
  for (const k in data) { const im = new Image(); im.src = data[k]; imgs[k] = im; }
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  };
  const ar = () => LANG.cur === 'ar';
  const T = (a, e) => (ar() ? a : e);

  // ---------------------------------------------------------------- drawing hooks
  function get(slot) { const im = imgs[slot]; return im && im.complete && im.naturalWidth ? im : null; }
  // fits the picture to a body box (a little larger, feet on the box bottom), facing and hit flash
  function draw(g, im, box, face, flash, scale) {
    const k = scale || 1.35, bw = box.w * k, bh = box.h * k;
    const s = Math.min(bw / im.naturalWidth, bh / im.naturalHeight) * 1.0, w = im.naturalWidth * s, h = im.naturalHeight * s;
    const cx = box.x + box.w / 2, by = box.y + box.h + 2;
    g.save(); g.translate(cx, by); if (face < 0) g.scale(-1, 1);
    if (flash > 0) g.filter = 'brightness(2.6)';
    g.drawImage(im, -w / 2, -h, w, h);
    g.restore();
  }

  // ---------------------------------------------------------------- the panel
  let root = null, sheet = null, sel = null, cur = 'player', drag = null, view = null;
  function css() {
    if (document.getElementById('skin-css')) return;
    const st = document.createElement('style'); st.id = 'skin-css';
    st.textContent = `
#skins{position:fixed;inset:0;z-index:50;background:rgba(4,6,12,.94);color:#e6eefa;font:500 14px/1.5 "Cairo",sans-serif;display:flex;flex-direction:column;padding:12px 16px;gap:10px;overflow:auto;touch-action:auto;user-select:none}
#skins h2{margin:0;font-size:20px}#skins p{margin:0;opacity:.75;font-size:13px}
#skins .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#skins button,#skins label.btn{background:#1b2436;color:#e6eefa;border:1px solid #3b4a66;border-radius:8px;padding:6px 12px;font:600 13px "Cairo",sans-serif;cursor:pointer}
#skins button.on{background:#36cfc2;color:#05070d;border-color:#36cfc2}
#skins .slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
#skins .slot{display:flex;align-items:center;gap:6px;background:#111827;border:1px solid #2a3550;border-radius:8px;padding:4px 6px;cursor:pointer}
#skins .slot.on{border-color:#36cfc2;box-shadow:0 0 0 1px #36cfc2 inset}
#skins .slot img,#skins .slot i{width:34px;height:34px;object-fit:contain;flex:none;background:#05070d;border-radius:6px}
#skins .slot span{flex:1;min-width:0;font-size:12px}
#skins .slot b{font-size:11px;color:#ff9a8a;padding:0 4px}
#skins canvas{max-width:100%;background:repeating-conic-gradient(#1a2030 0 25%,#121722 0 50%) 0 0/20px 20px;border-radius:6px;cursor:crosshair;touch-action:none}
#skins input[type=file]{display:none}`;
    document.head.appendChild(st);
  }
  function open(onClose) {
    css();
    root = document.createElement('div'); root.id = 'skins'; root.dir = ar() ? 'rtl' : 'ltr';
    root.innerHTML = `<div class="row" style="justify-content:space-between"><h2>${T('صورك الخاصة', 'Your images')}</h2><button data-x="close">${T('رجوع إلى اللعبة', 'Back to the game')}</button></div>
<p>${T('حمّل صورة من جهازك (صورة واحدة أو لوحة فيها صور كثيرة)، اختر الشخصية، ثم اسحب مربعاً فوق الجزء الذي تريده. الصور تبقى في متصفحك على جهازك فقط ولا تُرفع إلى أي مكان.', 'Load a picture from your device (one sprite or a whole sheet), pick a character, then drag a box over the part you want. Pictures stay in this browser on your device and are never uploaded.')}</p>
<div class="row"><label class="btn">${T('تحميل صورة…', 'Load a picture…')}<input type="file" accept="image/*"></label><button data-x="whole">${T('استعمل الصورة كاملة', 'Use the whole picture')}</button><button data-x="clear">${T('حذف كل الصور', 'Remove all')}</button></div>
<div class="slots"></div><canvas width="10" height="10"></canvas>`;
    document.body.appendChild(root);
    const q = s => root.querySelector(s);
    q('[data-x=close]').onclick = () => { close(); if (onClose) onClose(); };
    q('[data-x=clear]').onclick = () => { for (const k of Object.keys(data)) remove(k); renderSlots(); };
    q('[data-x=whole]').onclick = () => { if (sheet) assign(cur, 0, 0, sheet.naturalWidth, sheet.naturalHeight); };
    q('input[type=file]').onchange = e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => { sheet = im; sel = null; paint(); }; im.src = r.result; };
      r.readAsDataURL(f);
    };
    const cv = q('canvas');
    const pos = ev => { const b = cv.getBoundingClientRect(); return { x: (ev.clientX - b.left) * cv.width / b.width, y: (ev.clientY - b.top) * cv.height / b.height }; };
    cv.addEventListener('pointerdown', ev => { if (!sheet) return; cv.setPointerCapture(ev.pointerId); drag = pos(ev); sel = { x: drag.x, y: drag.y, w: 0, h: 0 }; paint(); });
    cv.addEventListener('pointermove', ev => { if (!drag) return; const p = pos(ev); sel = { x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) }; paint(); });
    cv.addEventListener('pointerup', () => {
      if (!drag) return; drag = null;
      if (sel && sel.w > 4 && sel.h > 4) assign(cur, sel.x / view.s, sel.y / view.s, sel.w / view.s, sel.h / view.s);
    });
    // the game must not steal keys while the panel is open
    root.addEventListener('keydown', e => e.stopPropagation());
    renderSlots(); paint();
  }
  function close() { if (root) root.remove(); root = null; }
  function renderSlots() {
    if (!root) return;
    const box = root.querySelector('.slots'); box.innerHTML = '';
    for (const [k, a, e] of SLOTS) {
      const d = document.createElement('div'); d.className = 'slot' + (k === cur ? ' on' : '');
      d.innerHTML = (data[k] ? `<img src="${data[k]}" alt="">` : '<i></i>') + `<span>${T(a, e)}</span>` + (data[k] ? '<b title="x">✕</b>' : '');
      d.onclick = ev => { if (ev.target.tagName === 'B') { remove(k); } else cur = k; renderSlots(); };
      box.appendChild(d);
    }
  }
  function paint() {
    if (!root) return;
    const cv = root.querySelector('canvas'), g = cv.getContext('2d');
    if (!sheet) { cv.width = 600; cv.height = 120; g.fillStyle = '#9db5d6'; g.font = '16px Cairo, sans-serif'; g.textAlign = 'center'; g.fillText(T('حمّل صورة لتبدأ', 'Load a picture to begin'), 300, 64); return; }
    const s = Math.min(1, 1100 / sheet.naturalWidth);
    view = { s }; cv.width = Math.round(sheet.naturalWidth * s); cv.height = Math.round(sheet.naturalHeight * s);
    g.drawImage(sheet, 0, 0, cv.width, cv.height);
    if (sel) { g.strokeStyle = '#36cfc2'; g.lineWidth = 2; g.setLineDash([6, 4]); g.strokeRect(sel.x, sel.y, sel.w, sel.h); g.fillStyle = 'rgba(54,207,194,0.15)'; g.fillRect(sel.x, sel.y, sel.w, sel.h); }
  }
  // crops the chosen box (downscaled to at most MAX px) and stores it for the slot
  function assign(slot, x, y, w, h) {
    const k = Math.min(1, MAX / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext('2d').drawImage(sheet, x, y, w, h, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/png');
    data[slot] = url; const im = new Image(); im.src = url; imgs[slot] = im;
    if (!save()) G.toastMsg(T('لا توجد مساحة كافية في المتصفح لحفظ الصورة.', 'Not enough browser storage to keep this picture.'), 3);
    renderSlots();
  }
  function remove(slot) { delete data[slot]; delete imgs[slot]; save(); }
  return { get, draw, open, close, isOpen: () => !!root };
})();
