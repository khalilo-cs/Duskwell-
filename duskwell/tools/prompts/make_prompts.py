#!/usr/bin/env python3
"""Writes the prompt pack (docs/prompts/*.md and docs/duskwell-prompts.zip): one prompt file per hero, boss and creature,
with the frame lists the game's cutting tools expect. Run from the repo root: python3 duskwell/tools/prompts/make_prompts.py"""
import json, os, re, zipfile, shutil
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'docs', 'prompts')
def meta(f, n): return json.loads(open(os.path.join(ROOT, 'js', f), encoding='utf8').read().split('const ' + n + ' = ')[1].split(';\n')[0])
ANIMS = meta('creature_anims_meta.js', 'CREATURE_ANIMS'); POSES = meta('boss_poses_meta.js', 'BOSS_POSES'); HERO = meta('hero_frames_meta.js', 'HERO_FRAMES')
best = open(os.path.join(ROOT, 'js', 'bestiary.js'), encoding='utf8').read()
INFO = {}
for m in re.finditer(r"\{ k: '(\w+)'(, boss: true)?, area: '(\w+)', ar: \[.*?\], en: \[(['\"])(.*?)\4, (['\"])(.*?)\6\]", best):
    INFO[m.group(1)] = dict(boss=bool(m.group(2)), area=m.group(3), name=m.group(5), text=m.group(7))

STYLE = """STYLE (paste at the start of every prompt)
Dark hand-painted 2D game art for a side-scrolling action-exploration game: moody, slightly desaturated palette with one glowing accent colour,
clean thin dark ink outline of even weight, soft painted shading from a single light source at the top-left, rim light on the edge facing the light,
readable silhouette at small size. Side view, character faces RIGHT. Original design, not a copy of any existing game or character.

TECHNICAL (paste at the end of every prompt)
One image. A plain flat mid-grey background (#808080), perfectly even: no gradient, no floor, no cast shadow, no vignette, no text, no labels, no frame lines,
no watermark. Every drawing sits in its own invisible cell of a regular grid with clear empty grey space around it, never touching or overlapping another.
All drawings in the sheet are the SAME SCALE (the body never gets bigger or smaller between frames) and share the same ground line: feet / lowest point
of the body on the same baseline in each row. Same character, same colours, same proportions in every frame. High resolution (at least 2048 px wide).
"""
HERO_BRIEF = ("The hero: a small hooded wanderer with a pale horned mask, a long dark-blue cloak that trails behind, thin limbs, and a slim curved nail-blade. "
              "Pale mask, deep blue cloak, a single teal glow in the eyes and on the blade.")

HERO_ROWS = {
 'idle': 'standing, breathing, cloak edge and a little hood sway; the loop must be seamless',
 'run': 'full run cycle, leaning forward, cloak streaming back, clear contact / passing / push-off poses, feet hit the same ground line',
 'jump': 'take-off crouch, rising stretch, apex tuck, falling with cloak lifted, landing squash (6 poses in order)',
 'slash1': 'first nail slash: wind-up, fast swing, follow-through; swing arc drawn as a separate crescent trail in the same cell',
 'slash2': 'second slash coming back the other way (mirror of the first in motion), different body lean',
 'hit': 'struck: flinch, head snapped back, arms flung, regaining balance',
 'death': 'falls, the mask cracks and splits, slumps to the ground, body fades to a pale husk (8 poses, slow)',
 'sit': 'sits on a stone bench, resting, cloak spread; 2 poses of slow breathing',
 'up': 'looks and strikes upward: nail raised overhead',
 'down': 'plunging nail-down strike in the air, body inverted slightly, blade pointing at the ground',
 'wall': 'clinging to a wall with one hand and both feet, cloak hanging down',
 'dash': 'a sideways dash: stretched low body and a long cloak streak (2 poses)',
 'double': 'double jump: a burst of pale light under the feet, body twisting in the air',
 'focus': 'gathering soul to heal: hands to the chest, light drawn into the body, cloak swirling up',
 'cast': 'casting a soul spell forward: palm thrust out, a glowing orb leaving the hand',
 'rest': 'waking / resting animation after a bench: stretching up, shaking the cloak',
}
MOVE_BRIEF = {
 'rend': ('Moon Rend', 'a huge crescent shock-wave of pale silver-blue light that flies forward from the nail and widens as it goes'),
 'rush': ('Dusk Rush', 'a fast lunging dash that leaves a violet-black after-image trail and a cutting streak'),
 'nova': ('Soul Nova', 'a ring explosion of soul energy bursting out from the body in all directions, with a bright core flash'),
 'dive': ('Dive', 'a downward plunge with a comet of white-teal light, ending in a ground-shock ring of dust and cracks'),
 'comet': ('Comet Heart', 'a charged super dash: a bright heart-shaped core with a long comet tail of crystal-pink light'),
}
POWER_BRIEF = {
 'time': ('Stopped Time', 'a pale gold clock-face ring and frozen-time ripples spreading over everything; hands stopped, glass-like cracks of light'),
 'stars': ('Falling Stars', 'a rain of bright meteor stars with long tails and star-burst impacts'),
 'phoenix': ('Phoenix', 'a rising fire-bird of orange and white light that wraps around the hero and heals'),
 'twin': ('Shadow Twin', 'a translucent dark echo of the hero that fights beside them, with a violet outline and drifting wisps'),
 'hole': ('Black Hole', 'a swirling dark vortex with a bright accretion rim that pulls things in, small debris spiralling'),
 'rage': ('Rage', 'red-orange flames and a shaking aura around the hero, the eyes burning, a shockwave on activation'),
}
STATE_WORDS = {
 'idle': 'idle breathing loop', 'walk': 'walk / move cycle', 'atk': 'attack: anticipation, strike, recovery', 'hurt': 'hurt flinch',
 'death': 'death: collapse and break-up, last frame a still remains', 'dazed': 'dazed after hitting a wall, stars or wobble', 'dig': 'digging down into the ground',
 'rise': 'rising out of the ground', 'roll': 'rolling as a ball, rotation visible frame to frame', 'pile': 'collapsing into a pile of parts', 'fall': 'falling apart',
 'skull': 'the lone skull left behind', 'crash': 'crashing into the ground', 'shatter': 'shattering into pieces',
}
BOSS_SET = [('idle', 6, 'breathing / hovering loop, seamless'), ('move', 6, 'walk / hover / charge travel cycle'), ('windup', 4, 'anticipation for the big attack: body coils, glow builds'),
            ('attack A', 6, 'the signature melee attack: windup, impact frame with a clear effect, recovery'), ('attack B', 6, 'the signature ranged or area attack: gather, release, recover'),
            ('attack C', 6, 'a third, different attack, matching the description'), ('hurt', 2, 'hit flinch'), ('stagger', 3, 'dazed / vulnerable after a big attack'),
            ('phase change', 6, 'transformation into the enraged second phase: roar, armour cracks, new glow'), ('enraged idle', 6, 'the second-phase breathing loop, more aggressive'),
            ('death', 8, 'slow, dramatic collapse, ending as a settled wreck')]

def head(title, brief): return '# ' + title + '\n\n' + brief + '\n\n'
S_BODY = STYLE.split('\n\nTECHNICAL')[0].split('\n', 1)[1].replace('\n', ' ')
T_BODY = STYLE.split('(paste at the end of every prompt)\n')[1].replace('\n', ' ').strip()
def write(path, text):
    if not path.endswith('01_STYLE_GUIDE.md'):                      # the two blocks are written into every prompt
        text = re.sub(r'\[STYLE(: ([^\]]*))?\]', lambda m: (m.group(2) + '. ' if m.group(2) else '') + S_BODY, text).replace('[TECHNICAL]', T_BODY)
    os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'w', encoding='utf8').write(text)
if os.path.isdir(OUT): shutil.rmtree(OUT)

write(os.path.join(OUT, '00_START_HERE.md'), """# Duskwell — prompt pack (حزمة البرومبتات)

## بالعربية
في هذه الحزمة ملف واحد لكل شخصية: البطل، والزعماء السبعة عشر، والوحوش الثمانية والعشرين، وملف للحركات المميزة والقوى.
كل ملف فيه برومبت جاهز بالإنجليزية (أدوات الرسم تفهمه أفضل) مع **قائمة الإطارات المطلوبة بالعدد والترتيب** كما تحتاجها أدوات القص في اللعبة.

الطريقة:
1. افتح ملف الشخصية وانسخ البرومبت كما هو: كتلتا الأسلوب والمواصفات التقنية مكتوبتان فيه سلفاً (وهما أيضاً في `01_STYLE_GUIDE.md` لتعديلهما).
2. أنشئ الصورة (ورقة واحدة لكل حالة، أو ورقة واحدة لكل شخصية إن كانت أداتك تتحمل ذلك).
3. اطلب من المولّد أن يبقى التصميم **ثابتاً** بين الصفوف؛ إن اختلف اللون أو الحجم أعد المحاولة أو أعطه الصورة الأولى مرجعاً.
4. أرسل لي الصور هنا وسأقصّها وأضيفها للّعبة وأضبط الحركة والاختبارات.

ما أستطيعه أنا: قص الأوراق وضبط مراسي الأقدام وربط الحركات بالحالات في اللعبة (انتظار، ضربة، ألم، موت…)، والتأثيرات البرمجية، والاختبارات.
ما لا أستطيعه: رسم صور جديدة بنفسي؛ لذلك هذه البرومبتات هي طريقك لإنتاج الفن الجديد.
لا تضع في البرومبتات أسماء ألعاب أو شخصيات من ألعاب أخرى، ولا ترفع إلى اللعبة صوراً لا تملك حقوقها.

## English
One prompt file per character: the hero, the 17 bosses, the 28 creatures, plus one for special moves and powers.
Every file lists the exact frames the cutting tools expect (count and order).
Prompts are ready to paste (the style and technical blocks are already inside them). Keep the character consistent between rows, and send the sheets back to be cut and wired in.

## Folder map
- `01_STYLE_GUIDE.md` — the two blocks to paste into every prompt, plus the grid and naming rules
- `02_hero.md` — the hero, 16 animation rows
- `03_moves_and_powers.md` — the 5 special moves and the 6 hero powers (effect sheets)
- `bosses/` — one file per boss (17)
- `creatures/` — one file per creature (28)
- `99_CHECKLIST.md` — everything that can be redone, with its current frame counts
""")

write(os.path.join(OUT, '01_STYLE_GUIDE.md'), '# Style guide\n\n```\n' + STYLE + '```\n\n' + """## Sheet layout
- One row per animation state, frames left to right in play order. Leave at least 40 px of empty grey between frames and between rows.
- Name the file `<id>_<state>.png`, e.g. `husk_walk.png`, or `<id>_sheet.png` when several states share one image (then keep one state per row, in the order listed in the file).
- Keep the same canvas scale for the whole character: a frame never gets re-scaled.
- Attacks need a clear anticipation frame, an impact frame and a recovery frame; the game holds the impact frame a few ticks for hit-stop, so make it the most extreme pose.
- Effects (slash arcs, rings, glow) are drawn **in a separate row** from the body whenever possible, so the game can place them on its own.
- Loops (idle, walk, run) must end almost where they start.

## What the game does with them
Creatures: states idle, walk, atk, hurt, death (some also dazed, dig, rise, roll, pile, fall, skull, crash, shatter). Bosses: poses plus procedural motion today; the sets below
would let every boss move by real frames. Hero: 16 rows listed in `02_hero.md`.
""")

def hero_text():
    t = head('The hero — every animation', HERO_BRIEF + '\n\nRedo or extend any row. The counts are what the game uses today; more frames are welcome (up to double).')
    t += '## Prompt (one sheet per row, or all rows on one sheet)\n\n```\n[STYLE]\n' + HERO_BRIEF + ' Animation sheet, frames left to right, one row per animation.\n'
    for k, v in HERO_ROWS.items():
        t += 'Row "%s" (%d frames now): %s.\n' % (k, len(HERO[k]), v)
    t += 'Also draw the nail-slash crescents (3 sizes) and a small dust puff (4 frames) in two extra rows.\n[TECHNICAL]\n```\n\n'
    t += '## One prompt per row (use these when the all-in-one sheet drifts)\n\n'
    for k, v in HERO_ROWS.items():
        t += '### %s\n```\n[STYLE]\n%s Row of %d frames (extend to %d if it improves the motion): %s.\n[TECHNICAL]\n```\n\n' % (k, HERO_BRIEF, len(HERO[k]), len(HERO[k]) * 2, v)
    t += '## Extra rows that would add life\n- idle variants: blink, look around, shiver in the cold (6 frames each)\n- turn-around (4 frames), skid stop (3), land-hard (5), wall-slide (4), wall-jump (4), ledge grab (4)\n- hurt-in-the-air (3), shield / dodge (4), sprint-dash (6), bench-stand-up (5)\n'
    return t
write(os.path.join(OUT, '02_hero.md'), hero_text())

t = head('Special moves and hero powers', 'Effect sheets. Each effect is drawn alone (no hero in it) on the plain grey background, so the game can place it on any character.')
for k, (n, d) in MOVE_BRIEF.items():
    t += '## Move: %s (`%s`)\n```\n[STYLE: glowing effect art, same painted look]\nEffect animation sheet "%s": %s.\nRow 1: start (4 frames). Row 2: main loop (6 frames, seamless). Row 3: impact / end (6 frames, fades out).\nBright core, soft outer glow, a few flying sparks; no character, no ground.\n[TECHNICAL]\n```\n\n' % (n, k, n, d)
for k, (n, d) in POWER_BRIEF.items():
    t += '## Power: %s (`%s`)\n```\n[STYLE: glowing effect art, same painted look]\nPower effect sheet "%s": %s.\nRow 1: activation burst (6 frames). Row 2: sustained loop (6 frames, seamless). Row 3: ending (5 frames).\nAlso a 128x128 icon of the power in a round emblem, with dark outline, in a separate cell.\n[TECHNICAL]\n```\n\n' % (n, k, n, d)
t += '## Shared effects worth redoing\n- hit sparks (4 sizes, 5 frames) · enemy death puff · soul orb (loop, 6) · geo coin spin (8) · dust (4) · landing ring (5) · heal burst (8) · mask crack (5)\n'
write(os.path.join(OUT, '03_moves_and_powers.md'), t)

BOSS_EXTRA = {
 'guardian': 'Leaps, slams the floor with its shell-mace, and charges; dazed after a charge.', 'spore': 'Scatters spore clouds and calls toxic bursts from the floor.',
 'weaver': 'Fast scythe cuts, thorn volleys, then spins like a storm.', 'drowned': 'Swings a great anchor, slams, and releases water.', 'wraith': 'Orbiting crystal shards fired at the hero; core opens to hurt it.',
 'brood': 'Drops spiderlings, lunges with fangs, spits venom.', 'king': 'Three phases: spear of light, ring of light, final rage; armour breaks between phases.',
 'queen': 'Floats, throws ice shards, calls ice pillars and lightning.', 'colossus': 'Smashes with both fists, lobs slag, rolls into a ball, shakes the floor.',
 'thunderhoof': 'Charges, stamps, calls lightning bolts from above.', 'roc': 'Strafes across the screen, dives, beats its wings to raise a gale.',
 'duelist': 'Parry stance that turns blows, then a lightning riposte; rapier lunges.', 'twin': 'Mirrors the hero\'s own moves: dash, slash, spell, dive.',
 'bonewright': 'Four arms: sweeps the floor, throws chisels, raises bone pillars, summons helpers.', 'marrow': 'Stamps, rains ribs, smashes with its fist, spits marrow, calls skeletons.',
 'stargazer': 'Aims rays through the telescope, calls meteors, spins stars, opens a time rift.', 'regent': 'Sends crescents, the full moon and the eclipse; drowns the arena in dark.'}
for k, v in INFO.items():
    if not v['boss']: continue
    have = len(POSES.get(k, []))
    t = head('Boss — %s (`%s`)' % (v['name'], k), 'Area: **%s**. Today: %d painted pose(s) plus procedural motion.\n\nDesign: %s\nBehaviour: %s\n' % (v['area'], have, v['text'], BOSS_EXTRA.get(k, '')))
    t += '## Prompt 1 — turnaround and model sheet\n```\n[STYLE]\nCharacter model sheet of the boss "%s": %s Three views on one sheet: side view facing right (largest), front view, back view, plus a close-up of the head/face and a close-up of the weapon or special organ. Show the colour palette as 6 small swatches.\n[TECHNICAL]\n```\n\n' % (v['name'], v['text'])
    t += '## Prompt 2 — the full animation set\nFrames left to right, one row per state; keep the body the same size and the feet / lowest point on one ground line. Use the model sheet above as the reference image.\n```\n[STYLE]\nAnimation sheet of the boss "%s" (%s) Behaviour: %s\n' % (v['name'], v['text'], BOSS_EXTRA.get(k, ''))
    for i, (n, c, d) in enumerate(BOSS_SET, 1): t += 'Row %d "%s", %d frames: %s.\n' % (i, n, c, d)
    t += 'Attack effects (slashes, shock-waves, projectiles, glows) go in a separate final row, drawn alone.\n[TECHNICAL]\n```\n\n'
    t += '## Prompt 3 — parts for the mesh-warp motion (optional but gives the best living motion)\n```\n[STYLE]\nThe boss "%s" taken apart into separate layers on the grey background, each laid out flat and complete (hidden parts painted in): body/torso, head, each arm, each leg or wing, tail, weapon, cape or hanging cloth, glowing core, small accessories. Each part has a visible pivot end (joint) overlapping where it would connect. Neutral pose.\n[TECHNICAL]\n```\n\n' % v['name']
    t += '## Prompt 4 — arena props\n```\n[STYLE]\nSmall props for the "%s" arena: 6 floor decorations, 3 hanging decorations, 2 breakable pillars (whole and broken), 4 debris chunks, glowing hazard marker (loop of 6 frames).\n[TECHNICAL]\n```\n' % v['name']
    write(os.path.join(OUT, 'bosses', k + '.md'), t)

CREATURE_DYNAMIC = {'husk': 'hops on landing', 'flyer': 'wings beat continuously', 'diver': 'hovers then dives', 'moth': 'wing dust glows', 'jelly': 'bell pulses'}
for k, v in INFO.items():
    if v['boss'] or k not in ANIMS: continue
    st = ANIMS[k]
    rows = ''.join('Row %d "%s", %d frames: %s.\n' % (i, s, len(f), STATE_WORDS.get(s, s)) for i, (s, f) in enumerate(st.items(), 1))
    t = head('Creature — %s (`%s`)' % (v['name'], k), 'Area: **%s**.\n\nToday: %s.\n\nDesign and behaviour: %s\n' % (v['area'], ', '.join('%s %d' % (s, len(f)) for s, f in st.items()), v['text']))
    t += '## Prompt 1 — model sheet\n```\n[STYLE]\nCreature model sheet of "%s": %s Side view facing right (largest), front view, a close-up of the face and of any weapon or special feature, and 5 colour swatches.\n[TECHNICAL]\n```\n\n' % (v['name'], v['text'])
    t += '## Prompt 2 — animation sheet (the counts the game uses; you may draw up to double the frames for smoother motion)\n```\n[STYLE]\nAnimation sheet of the creature "%s" (%s)\n%sAttack row: show a readable anticipation pose (the player must be able to tell the attack is coming), a hard impact pose, then recovery.\n[TECHNICAL]\n```\n\n' % (v['name'], v['text'], rows)
    t += '## Prompt 3 — extra life (optional)\n```\n[STYLE]\nExtra animation rows for "%s": idle variant (blink / sniff / twitch, 6 frames), spotting the player (alert pose, 4 frames), turn-around (4 frames), landing or stop (3 frames), a signature hurt-recoil when hit hard (4 frames), a small effect row for its attack (glow, spit, dust, spark; 6 frames).\n[TECHNICAL]\n```\n' % v['name']
    write(os.path.join(OUT, 'creatures', k + '.md'), t)

c = '# Checklist\n\nTick each item when the sheet has been made and sent.\n\n## Hero\n- [ ] ' + '\n- [ ] '.join('%s (%d frames now)' % (k, len(v)) for k, v in HERO.items()) + '\n\n## Moves and powers\n- [ ] ' + '\n- [ ] '.join('%s' % n for n, d in list(MOVE_BRIEF.values()) + list(POWER_BRIEF.values())) + '\n\n## Bosses\n'
c += ''.join('- [ ] %s (`%s`, %d pose(s) now)\n' % (v['name'], k, len(POSES.get(k, []))) for k, v in INFO.items() if v['boss'])
c += '\n## Creatures\n' + ''.join('- [ ] %s (`%s`, %s)\n' % (v['name'], k, ' '.join('%s%d' % (s, len(f)) for s, f in ANIMS[k].items())) for k, v in INFO.items() if not v['boss'] and k in ANIMS)
write(os.path.join(OUT, '99_CHECKLIST.md'), c)

zp = os.path.join(ROOT, 'docs', 'duskwell-prompts.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in os.walk(OUT):
        for f in sorted(fs): z.write(os.path.join(d, f), os.path.join('duskwell-prompts', os.path.relpath(os.path.join(d, f), OUT)))
print('files', sum(len(f) for _, _, f in os.walk(OUT)), 'zip', os.path.getsize(zp))
