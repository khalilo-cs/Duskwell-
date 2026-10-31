#!/usr/bin/env python3
"""Writes the second prompt pack (docs/prompts_missing/*.md and docs/duskwell-prompts-missing.zip): what the first round of
pictures did not cover, a clean-redo prompt for what it did, and the inspection notes. Run: python3 duskwell/tools/prompts/make_missing.py"""
import os, re, zipfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'make_prompts.py'), encoding='utf8').read()
ns = {'__file__': os.path.join(HERE, 'make_prompts.py')}
exec(src.split('if os.path.isdir(OUT)')[0], ns)                      # the shared definitions only
exec(re.search(r'BOSS_EXTRA = \{.*?\}\n', src, re.S).group(0), ns)
ROOT, INFO, ANIMS, POSES, HERO, BOSS_SET, STATE_WORDS, BOSS_EXTRA = (ns[k] for k in ('ROOT', 'INFO', 'ANIMS', 'POSES', 'HERO', 'BOSS_SET', 'STATE_WORDS', 'BOSS_EXTRA'))
OUT = os.path.join(ROOT, 'docs', 'prompts_missing')

STYLE = ("Dark hand-painted 2D game art for a side-scrolling action-exploration game: moody, slightly desaturated palette with one glowing accent colour, "
         "clean thin dark ink outline of even weight, soft painted shading from a single light source at the top-left, rim light on the edge facing the light, "
         "readable silhouette at small size. Side view, the character faces RIGHT. Original design, not a copy of any existing game or character.")
TECH = ("THIS IS A RAW SPRITE STRIP, NOT A PRESENTATION BOARD: no title, no logo, no captions, no frame numbers, no labels, no panels, no borders, no UI, "
        "no colour swatches, no scenery, no moon, no floor, no cast shadow. One single plain flat mid-grey background (#808080), perfectly even, edge to edge. "
        "Only the frames listed, in one horizontal row, left to right in play order, evenly spaced with wide empty grey gaps, never touching. "
        "Every frame the same scale and on the same ground line; same design, colours and proportions in every frame. "
        "Each frame at least 220 pixels tall; use the widest canvas available (3:1 or 4:1).")
HERO = ("The hero: a slender hooded wanderer in a long tattered deep-teal cloak, a smooth pale oval mask with two thin glowing teal eye-slits and NO horns, "
        "dark leather armour with bronze buckles, a crescent-moon clasp at the throat, and a long straight sword. Same design as the reference image if one is attached.")

def P(*lines): return '```\n' + STYLE + '\n' + '\n'.join(lines) + '\n' + TECH + '\n```\n'
def write(rel, text):
    path = os.path.join(OUT, rel); os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'w', encoding='utf8').write(text)
if os.path.isdir(OUT): shutil.rmtree(OUT)

# ---------------------------------------------------------------- what the 150 pictures hold (by file number)
SEEN = {
 'hero sheets (all rows, small)': '005 006 007 009 020 021 022 025 026 034 037 040 041 042 044 047 058 060 064 065 073 075 078 080 081 082 083 084 086 087 089 090 091 094 097 102 104 107 110 113 114 115 116 120 122 123 126 127 128 129 130 133 135 139 140 145 146 148 149 150',
 'hero: sword attack': '002 031 124 134 147', 'hero: jump': '004 101 103 106 112 138', 'hero: run': '125', 'hero: idle': '121', 'hero: hurt': '141', 'hero: death': '063',
 'hero: air attack': '016 057 096', 'hero: dash': '038', 'hero: double jump': '032', 'hero: wall slide': '099', 'hero: wall jump': '100', 'hero: roll (new)': '053',
 'hero: focus / heal': '029', 'hero: cast': '012 027', 'hero: shake off a freeze (new)': '001',
 'hero: rest / wake up on the bench': '011 017 036 039 049 055 069 105 131 132 136 137 143',
 'move: Moon Rend': '050', 'move: Soul Nova': '109', 'move: Dive': '098', 'move: Comet Heart': '013',
 'power: Falling Stars': '015 048 051 066 067 074 076', 'power: Phoenix': '008 072', 'power: Stopped Time': '056',
 'new abilities not in the game': '010 (Shadow Dash) 033 (Gravity Push) 052 (Phantom Grip) 054 (Void Push)',
 'creature: Diver': '024 030 108 142 144', 'creatures 08-14 on one shared board (small)': '059 077 085 092 117 119',
 'creature concepts with new names': '003 070 (Hollow Grunt) 023 (Hollowling) 043 111 (Hollow Wraith) 014 (Bone Stalker) 018 (Mire Shroom) 028 (Sporeling) 045 (Moss Crawler) 061 (Hollow Grub) 062 (Bog Leech) 079 (Hushwing) 088 (Ancient Guardian)',
 'DO NOT USE: look like another famous game': '019 035 071 093 095 118',
 'world / tiles / overview only': '046 068',
}

write('00_START_HERE.md', """# Duskwell — الحزمة الثانية: البرومبتات الناقصة

## نتيجة فحص الصور (150 صورة في الأجزاء الأربعة)
- **البطل:** مغطّى جيداً، بل أكثر من اللازم: نحو 60 ورقة شاملة، و13 ورقة مكرّرة لنفس حركة الاستيقاظ على المقعد، و7 أوراق للنجوم الساقطة.
- **الحركات الخاصة:** موجود قمر الهلال (Moon Rend) وانفجار الروح (Soul Nova) والهبوط (Dive) وقلب المذنّب (Comet Heart). **ناقص:** اندفاع الغسق (Dusk Rush).
- **القوى:** موجود النجوم الساقطة والعنقاء وإيقاف الزمن. **ناقص:** التوأم الظلّي والثقب الأسود والغضب.
- **الزعماء السبعة عشر: لا توجد ورقة واحدة مخصّصة لأي زعيم.** ظهروا فقط كصور مصغّرة في اللوحات العامة وبأسماء مختلفة عن أسماء اللعبة. هذا أكبر نقص.
- **الوحوش:** للبعوضة الغطّاسة (Diver) أوراق جيدة. للعنكبوت والفطر الماشي وقنديل الماء وحارس الدرع والكبش والخلد الجليدي لوحة مشتركة واحدة صغيرة لا تكفي. **19 وحشاً بلا أي صورة** (القائمة في `99_CHECKLIST.md`).

## مشاكل في الصور الحالية (مهمّة قبل أن نصنع المزيد)
1. **كلها «لوحات عرض»** بعناوين وشعارات وأرقام وخلفيات مشاهد وإطارات، والإطارات نفسها صغيرة جداً (30 إلى 80 بكسل). أدوات القص في اللعبة تحتاج **شريطاً واحداً نظيفاً على خلفية رمادية موحّدة** بلا أي نص. لذلك كتبتُ في كل برومبت هنا جملة صريحة: «شريط حركات خام وليس لوحة عرض».
2. **مقاس الصور 1536×1024 فقط.** اطلب صفاً واحداً في كل صورة وبأعرض نسبة ممكنة حتى يكبر كل إطار.
3. **ست صور لا تُستعمل أبداً:** 019 و035 و071 و093 و095 و118. فيها فارس بقناع أبيض وقرنين، وإحداها مكتوب عليها اسم لعبة أخرى مشهورة حرفياً. هذا مخالف لشرطك: لا شيء مأخوذ من تلك اللعبة. احذفها.
4. **أسماء مختلفة:** المولّد اخترع أسماء جديدة (Hollow Grunt وBone Stalker وغيرها). اللعبة تعرف وحوشها بأسمائها في هذه الملفات؛ استعمل الاسم والوصف كما هما.
5. **قناع البطل:** في الحزمة الأولى كتبتُ «قناع بقرون» بالخطأ، وصورك جاءت بقناع أملس بلا قرون، وهو الأفضل والأبعد عن التشابه. هذه الحزمة تصحّح الوصف: **قناع أملس بلا قرون**.

## ترتيب العمل المقترح
1. `bosses/`: الزعماء السبعة عشر، كل زعيم ثلاث صور على الأقل: الوقوف، والهجوم الرئيسي، والموت.
2. `creatures/`: الوحوش الناقصة.
3. `moves_powers/`: الحركة الخاصة الناقصة والقوى الثلاث الناقصة.
4. `hero/`: صفوف ناقصة للبطل (ضربة لأعلى، ضربة لأسفل، الالتفات، التعلّق بالحافة…).
5. `redo_clean/`: إعادة رسم ما عندك أصلاً كشرائط نظيفة، مع رقم أفضل صورة مرجعية لكل واحد. أرفق تلك الصورة مع البرومبت كمرجع للتصميم فقط.

كل برومبت جاهز للنسخ كما هو (الأسلوب والمواصفات التقنية مكتوبة داخله). بعد أن تصنع الصور أرسلها لي، فأقصّها وأربطها باللعبة.

`01_INSPECTION.md` فيه جدول كل صورة ورقمها وما فيها.
""")

t = '# Inspection of the 150 pictures\n\nNumbers are the first three digits of each file name in `images/`.\n\n| What | Files |\n|---|---|\n'
for k, v in SEEN.items(): t += '| %s | %s |\n' % (k, v)
t += '\nAll files are presentation boards (titles, labels, scenery) at 1536 x 1024 or close to it; the frames inside are 30 to 80 px tall, too small to cut cleanly.\n'
write('01_INSPECTION.md', t)

# ---------------------------------------------------------------- hero rows that are missing or only tiny
HERO_MISSING = [
 ('up_strike', 6, 'an upward sword strike while standing: crouch, spring the blade overhead, wide crescent arc above the head, recover'),
 ('down_strike', 5, 'a downward sword strike in mid-air (pogo): body tucked, blade pointing straight down under the feet, a bounce-back pose at the end'),
 ('turn_around', 4, 'turning from facing right to facing left while standing; the cloak swings across'),
 ('skid_stop', 4, 'stopping hard from a run: heels dig in, body leans back, cloak flies forward, dust at the feet'),
 ('hard_landing', 5, 'landing from a great height: deep crouch with one hand on the ground, cloak spread, then standing up'),
 ('ledge_grab', 6, 'catching the edge of a ledge with both hands, hanging, then pulling up and climbing over'),
 ('hurt_in_air', 4, 'hit while airborne: thrown back, cloak whipping, tumbling, regaining balance'),
 ('bench_sit_loop', 6, 'sitting on a stone bench, sword across the knees, slow breathing loop only (no standing up)'),
 ('look_up_down', 6, 'three frames looking up (head tilting, cloak settling) then three frames looking down'),
]
for n, (k, c, d) in enumerate(HERO_MISSING, 1):
    write('hero/%02d_%s.md' % (n, k), '# Hero — %s\n\nNot in the pictures (or only as tiny frames inside a big board). %d frames.\n\n' % (k.replace('_', ' '), c)
          + P(HERO, 'Sprite strip of the hero, %d frames: %s.' % (c, d)))

# ---------------------------------------------------------------- moves and powers not drawn
MP = [
 ('move_dusk_rush', 'Dusk Rush', 'the hero lunges forward in a fast dash leaving a violet-black after-image trail and a long cutting streak'),
 ('power_shadow_twin', 'Shadow Twin', 'a translucent dark copy of the hero with a violet outline and drifting wisps appears beside them and fights'),
 ('power_black_hole', 'Black Hole', 'a swirling dark vortex with a bright violet-white rim that pulls debris inward in a spiral'),
 ('power_rage', 'Rage', 'red-orange flames and a shaking aura burst around the hero, eyes burning, a shock ring on activation'),
]
for k, n, d in MP:
    t = '# %s\n\nNo dedicated sheet among the pictures. Three strips: the effect alone (for the game to place anywhere), and the hero using it.\n\n' % n
    t += '## Effect alone — start\n' + P('Effect animation "%s", 5 frames, the start: %s. No character in it.' % (n, d))
    t += '\n## Effect alone — loop\n' + P('Effect animation "%s", 6 frames, the main loop, seamless: %s. No character in it.' % (n, d))
    t += '\n## Effect alone — end\n' + P('Effect animation "%s", 5 frames, fading out and dissolving into sparks. No character in it.' % n)
    t += '\n## The hero using it\n' + P(HERO, 'Sprite strip of the hero, 6 frames, using the power "%s": %s. Hero pose only, the effect drawn faint.' % (n, d))
    t += '\n## Icon\n```\n' + STYLE + '\nA single 512x512 round emblem icon of the power "%s" (%s), dark outline, centred, plain flat mid-grey background, no text.\n```\n' % (n, d)
    write('moves_powers/%s.md' % k, t)

# ---------------------------------------------------------------- bosses: all 17
for k, v in INFO.items():
    if not v['boss']: continue
    who = 'the boss "%s": %s' % (v['name'], v['text'])
    t = '# Boss — %s (`%s`)\n\nArea: **%s**. Behaviour: %s\n\nNo dedicated picture of this boss in the 150 files. Make the reference sheet first, then attach it to every strip prompt.\n\n' % (v['name'], k, v['area'], BOSS_EXTRA.get(k, ''))
    t += '## 1. Reference (one image, the only one allowed to show several views)\n```\n' + STYLE + '\nCharacter reference of ' + who + ' Three full-body views side by side: side view facing right (largest), front view, back view. Plain flat mid-grey background, no text, no labels, no swatches, no scenery.\n```\n\n'
    for i, (n, c, d) in enumerate(BOSS_SET, 2):
        t += '## %d. %s — %d frames\n' % (i, n, c) + P('Sprite strip of ' + who, 'Animation "%s", %d frames: %s.' % (n, c, d)) + '\n'
    t += '## %d. Attack effects alone\n' % (len(BOSS_SET) + 2) + P('Effects of ' + who, 'The attack effects only (slashes, shock waves, projectiles, glows), 8 frames, no character.') + '\n'
    write('bosses/%s.md' % k, t)

# ---------------------------------------------------------------- creatures: none, or only a shared small board
NONE = ['crawler', 'flyer', 'hopper', 'spitter', 'shard', 'sentinel', 'lavaworm', 'imp', 'veil', 'roller', 'slime', 'chainman', 'icicle', 'heap', 'skullbat', 'censer', 'lensling', 'orrery', 'lunarhare']
SMALL = {'spider': '085', 'shroom': '085', 'jelly': '085', 'warden': '085', 'ram': '085', 'mole': '085'}
NOTE = {'crawler': 'Picture 061 (Hollow Grub) is close; use it as a reference if you like it.', 'moth': ''}
for k in NONE + list(SMALL):
    v = INFO[k]; who = 'the creature "%s": %s' % (v['name'], v['text'])
    t = '# Creature — %s (`%s`)\n\nArea: **%s**. %s\n\n' % (v['name'], k, v['area'],
         ('Only on the shared board %s, too small to use: draw it again on its own.' % SMALL[k]) if k in SMALL else 'No picture of it among the 150 files. ' + NOTE.get(k, ''))
    t += '## Reference\n```\n' + STYLE + '\nCharacter reference of ' + who + ' Side view facing right (largest), front view, back view. Plain flat mid-grey background, no text, no labels, no swatches, no scenery.\n```\n\n'
    for s, f in ANIMS[k].items():
        c = max(len(f), 4 if s in ('hurt', 'dazed', 'skull') else 6)
        t += '## %s — %d frames\n' % (s, c) + P('Sprite strip of ' + who, 'Animation "%s", %d frames: %s.' % (s, c, STATE_WORDS.get(s, s))) + '\n'
    write('creatures/%s.md' % k, t)

# ---------------------------------------------------------------- redo what exists as clean strips
REDO = [
 ('hero_idle', '121', 'idle breathing loop', 6), ('hero_run', '125', 'run cycle', 8), ('hero_jump', '106', 'jump: crouch, take-off, rise, peak, fall, land', 8),
 ('hero_attack', '134', 'sword slash: wind-up, swing, impact, follow-through, recover', 8), ('hero_air_attack', '096', 'sword slash in mid-air', 8),
 ('hero_hurt', '141', 'hit: flinch, stagger, recover', 6), ('hero_death', '063', 'death: final blow, kneel, fall forward, lie still', 8),
 ('hero_dash', '038', 'dash forward with a cloak streak', 6), ('hero_double_jump', '032', 'double jump with a burst of light under the feet', 6),
 ('hero_wall_slide', '099', 'clinging and sliding down a wall', 4), ('hero_wall_jump', '100', 'pushing off a wall and leaping away', 6),
 ('hero_focus', '029', 'focus to heal: hands to the chest, light drawn in', 8), ('hero_cast', '027', 'casting a soul orb forward', 8),
 ('hero_rest', '143', 'waking on the bench: asleep, stretch, stand up, shake the cloak', 8),
]
for k, ref, d, c in REDO:
    write('redo_clean/%s.md' % k, '# Clean strip — %s\n\nYou already have it as a board: picture **%s**. Attach that picture as a reference for the design only, then ask for a clean strip.\n\n' % (k.replace('_', ' '), ref)
          + P(HERO, 'Use the attached picture only as the design reference; do not copy its layout, text or background.', 'Sprite strip of the hero, %d frames: %s.' % (c, d)))
for k, ref, n, d in [('move_moon_rend', '050', 'Moon Rend', 'a huge silver-blue crescent shock-wave flying forward'), ('move_soul_nova', '109', 'Soul Nova', 'a ring explosion of soul light'),
                     ('move_dive', '098', 'Dive', 'a downward plunge ending in a ground shock ring'), ('move_comet_heart', '013', 'Comet Heart', 'a charged dash with a bright core and a long comet tail'),
                     ('power_falling_stars', '074', 'Falling Stars', 'a rain of golden meteor stars with burst impacts'), ('power_phoenix', '072', 'Phoenix', 'a fire bird of orange and white light'),
                     ('power_stopped_time', '056', 'Stopped Time', 'a pale gold clock ring and frozen ripples, glass-like cracks of light')]:
    write('redo_clean/%s.md' % k, '# Clean strip — %s\n\nReference picture: **%s**.\n\n' % (n, ref)
          + P('Use the attached picture only as the design reference; do not copy its layout, text or background.', 'Effect animation "%s", 8 frames: %s. Effect only, no character.' % (n, d)))
write('redo_clean/creature_diver.md', '# Clean strips — Diver\n\nReference picture: **144**.\n\n' + ''.join(
      '## %s — %d frames\n' % (s, max(len(f), 6)) + P('Use the attached picture only as the design reference; do not copy its layout, text or background.',
      'Sprite strip of the creature "Diver": %s Animation "%s", %d frames: %s.' % (INFO['diver']['text'], s, max(len(f), 6), STATE_WORDS.get(s, s))) + '\n' for s, f in ANIMS['diver'].items()))

# ---------------------------------------------------------------- checklist
c = '# Checklist (second round)\n\n## Bosses (none drawn yet)\n' + ''.join('- [ ] %s (`%s`)\n' % (v['name'], k) for k, v in INFO.items() if v['boss'])
c += '\n## Creatures with no picture\n' + ''.join('- [ ] %s (`%s`)\n' % (INFO[k]['name'], k) for k in NONE)
c += '\n## Creatures only on a small shared board\n' + ''.join('- [ ] %s (`%s`)\n' % (INFO[k]['name'], k) for k in SMALL)
c += '\n## Moves and powers\n' + ''.join('- [ ] %s\n' % n for _, n, _ in MP)
c += '\n## Hero rows\n' + ''.join('- [ ] %s\n' % k.replace('_', ' ') for k, _, _ in HERO_MISSING)
c += '\n## Clean redo of what exists\n' + ''.join('- [ ] %s (ref %s)\n' % (k.replace('_', ' '), r) for k, r, _, _ in REDO)
c += '\n## Do not use\n- pictures 019 035 071 093 095 118\n'
write('99_CHECKLIST.md', c)

zp = os.path.join(ROOT, 'docs', 'duskwell-prompts-missing.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, fs in sorted(os.walk(OUT)):
        for f in sorted(fs): z.write(os.path.join(d, f), os.path.join('duskwell-prompts-missing', os.path.relpath(os.path.join(d, f), OUT)))
print('files', sum(len(f) for _, _, f in os.walk(OUT)), 'zip', os.path.getsize(zp))
