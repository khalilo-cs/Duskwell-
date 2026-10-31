#!/usr/bin/env python3
"""Writes the prompt pack by kind, one zip per kind (docs/prompts_by_kind/): monsters, bosses, moves, lands.
Run: python3 duskwell/tools/prompts/make_split.py"""
import os, zipfile, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'make_missing.py'), encoding='utf8').read()
ns = {'__file__': os.path.join(HERE, 'make_missing.py')}
exec(src.split('\nif os.path.isdir(OUT)')[0], ns)                    # the shared definitions only
ROOT, INFO, ANIMS, HERO_FR, BOSS_SET, STATE_WORDS, BOSS_EXTRA, STYLE, TECH, HERO, P = (ns[k] for k in
    ('ROOT', 'INFO', 'ANIMS', 'HERO', 'BOSS_SET', 'STATE_WORDS', 'BOSS_EXTRA', 'STYLE', 'TECH', 'HERO', 'P'))
mp = {'__file__': os.path.join(HERE, 'make_prompts.py')}
exec(open(os.path.join(HERE, 'make_prompts.py'), encoding='utf8').read().split('if os.path.isdir(OUT)')[0], mp)
HERO_FR, HERO_ROWS, MOVE_BRIEF, POWER_BRIEF = mp['HERO'], mp['HERO_ROWS'], mp['MOVE_BRIEF'], mp['POWER_BRIEF']
OUT = os.path.join(ROOT, 'docs', 'prompts_by_kind')
if os.path.isdir(OUT): shutil.rmtree(OUT)
def write(rel, text):
    path = os.path.join(OUT, rel); os.makedirs(os.path.dirname(path), exist_ok=True); open(path, 'w', encoding='utf8').write(text)
def ref(what): return '```\n' + STYLE + '\nCharacter reference of ' + what + ' Side view facing right (largest), front view, back view. Plain flat mid-grey background (#808080), no text, no labels, no swatches, no scenery.\n```\n\n'
HOW = """طريقة الاستعمال: كل برومبت جاهز للنسخ كما هو، والأسلوب والمواصفات التقنية مكتوبة داخله.
المطلوب في كل صورة **شريط واحد خام على خلفية رمادية موحّدة بلا أي نص ولا عناوين ولا لوحات**، وليس «لوحة عرض».
ابدأ بالصورة المرجعية للشخصية، ثم أرفقها مع كل برومبت بعدها حتى يبقى التصميم ثابتاً.
لا تستعمل تصاميم أو أسماء من ألعاب أخرى. بعد أن تصنع الصور أرسلها لي فأقصّها وأربطها باللعبة.
"""
HAVE = {'diver': '024 030 108 142 144', 'spider': '085 (small)', 'shroom': '085 (small)', 'jelly': '085 (small)', 'warden': '085 (small)', 'ram': '085 (small)',
        'mole': '085 (small)', 'husk': '003 070 (another design, Hollow Grunt)', 'moth': '079 (another design, Hushwing)', 'crawler': '061 (close: Hollow Grub)'}

# ---------------------------------------------------------------- 1. monsters
write('monsters/00_README.md', '# الوحوش (28)\n\nملف لكل وحش من وحوش اللعبة الثمانية والعشرين، بالاسم والوصف والحالات التي تستعملها اللعبة.\n\n' + HOW)
for k, v in INFO.items():
    if v['boss'] or k not in ANIMS: continue
    who = 'the creature "%s": %s' % (v['name'], v['text'])
    t = '# %s (`%s`)\n\nArea: **%s**. Pictures you already have: %s.\n\n## Reference\n' % (v['name'], k, v['area'], HAVE.get(k, 'none')) + ref(who)
    for s, f in ANIMS[k].items():
        c = max(len(f), 4 if s in ('hurt', 'dazed', 'skull') else 6)
        t += '## %s — %d frames\n' % (s, c) + P('Sprite strip of ' + who, 'Animation "%s", %d frames: %s.' % (s, c, STATE_WORDS.get(s, s))) + '\n'
    t += '## Attack effect alone\n' + P('Effect of ' + who, 'Its attack effect only (spit, slash, spark, dust or glow), 6 frames, no creature.') + '\n'
    write('monsters/%s.md' % k, t)

# ---------------------------------------------------------------- 2. bosses
write('bosses/00_README.md', '# الزعماء (17)\n\nلا توجد حتى الآن صورة مخصّصة لأي زعيم. لكل زعيم: صورة مرجعية، ثم 11 شريط حركة، ثم شريط المؤثرات.\nابدأ لكل زعيم بثلاث صور على الأقل: الوقوف والهجوم الرئيسي والموت.\n\n' + HOW)
for k, v in INFO.items():
    if not v['boss']: continue
    who = 'the boss "%s": %s' % (v['name'], v['text'])
    t = '# %s (`%s`)\n\nArea: **%s**. Behaviour: %s\n\n## 1. Reference\n' % (v['name'], k, v['area'], BOSS_EXTRA.get(k, '')) + ref(who)
    for i, (n, c, d) in enumerate(BOSS_SET, 2): t += '## %d. %s — %d frames\n' % (i, n, c) + P('Sprite strip of ' + who, 'Animation "%s", %d frames: %s.' % (n, c, d)) + '\n'
    t += '## %d. Attack effects alone\n' % (len(BOSS_SET) + 2) + P('Effects of ' + who, 'The attack effects only (slashes, shock waves, projectiles, glows), 8 frames, no character.') + '\n'
    write('bosses/%s.md' % k, t)

# ---------------------------------------------------------------- 3. moves: hero animations, special moves, powers
write('moves/00_README.md', '# الحركات\n\n- `hero/`: كل حركات البطل (الأساسية والناقصة).\n- `special_moves/`: الحركات الخاصة الخمس.\n- `powers/`: القوى الست.\n\nقناع البطل **أملس بلا قرون**.\n\n' + HOW)
EXTRA = [('up_strike', 6, 'an upward sword strike while standing: crouch, spring the blade overhead, wide crescent arc above the head, recover'),
 ('down_strike', 5, 'a downward sword strike in mid-air: body tucked, blade pointing straight down under the feet, a bounce-back pose at the end'),
 ('turn_around', 4, 'turning from facing right to facing left while standing; the cloak swings across'),
 ('skid_stop', 4, 'stopping hard from a run: heels dig in, body leans back, cloak flies forward, dust at the feet'),
 ('hard_landing', 5, 'landing from a great height: deep crouch with one hand on the ground, cloak spread, then standing up'),
 ('ledge_grab', 6, 'catching the edge of a ledge with both hands, hanging, then pulling up and climbing over'),
 ('hurt_in_air', 4, 'hit while airborne: thrown back, cloak whipping, tumbling, regaining balance'),
 ('look_up_down', 6, 'three frames looking up then three frames looking down')]
rows = [(k, max(len(HERO_FR[k]), 6 if k not in ('sit', 'wall', 'dash') else 4), d) for k, d in HERO_ROWS.items()] + EXTRA
for i, (k, c, d) in enumerate(rows, 1):
    write('moves/hero/%02d_%s.md' % (i, k), '# Hero — %s\n\n' % k.replace('_', ' ') + P(HERO, 'Sprite strip of the hero, %d frames: %s.' % (c, d)))
for k, (n, d) in MOVE_BRIEF.items():
    write('moves/special_moves/%s.md' % k, '# %s\n\n## Effect: start, 4 frames\n' % n + P('Effect animation "%s", 4 frames, the start: %s. No character.' % (n, d))
          + '\n## Effect: main, 6 frames\n' + P('Effect animation "%s", 6 frames, the main motion: %s. No character.' % (n, d))
          + '\n## Effect: end, 6 frames\n' + P('Effect animation "%s", 6 frames, the impact and fade-out into sparks. No character.' % n)
          + '\n## The hero doing it, 6 frames\n' + P(HERO, 'Sprite strip of the hero performing "%s": %s. Effect drawn faint.' % (n, d)))
for k, (n, d) in POWER_BRIEF.items():
    write('moves/powers/%s.md' % k, '# %s\n\n## Activation, 6 frames\n' % n + P('Power effect "%s", 6 frames, the activation burst: %s. No character.' % (n, d))
          + '\n## Loop, 6 frames\n' + P('Power effect "%s", 6 frames, seamless loop: %s. No character.' % (n, d))
          + '\n## End, 5 frames\n' + P('Power effect "%s", 5 frames, fading out. No character.' % n)
          + '\n## The hero calling it, 6 frames\n' + P(HERO, 'Sprite strip of the hero calling the power "%s".' % n)
          + '\n## Icon\n```\n' + STYLE + '\nOne 512x512 round emblem icon of the power "%s" (%s), dark outline, centred, plain flat mid-grey background, no text.\n```\n' % (n, d))

# ---------------------------------------------------------------- 4. lands: tiles, walls, platforms, hazards, props, backgrounds
AREAS = [
 ('hushvale', 'Hushvale', 'a ruined village at dusk under a burnt-orange sky: old timber-and-stone houses, cobbles, lanterns, chimneys', 'warm stone and soot, orange lantern glow'),
 ('crossroads', 'Sunken Crossroads', 'dark blue underground crossroads of ancient carved stone, old pillars and broken arches', 'cold blue-grey stone, pale blue glow'),
 ('mossgrove', 'Mossgrove', 'a green cavern forest: mossy stone, roots, vines, ferns, glowing teal moss', 'deep green and teal, mint glow'),
 ('crystal', 'Crystal Spires', 'violet caves of growing crystal clusters and polished amethyst rock', 'purple stone, pink-violet crystal glow'),
 ('spore', 'Spore Hollows', 'warm brown caves full of giant mushrooms, gills, spore clouds and caps as platforms', 'brown and amber, orange spore glow'),
 ('aqueduct', 'Sunken Aqueduct', 'a flooded stone aqueduct: arches, channels, dripping water, algae, rusty grates', 'teal-blue stone, cyan water glow'),
 ('webbed', 'Webbed Depths', 'pitch-dark depths wrapped in thick spider silk, cocoons and hanging threads', 'near-black and grey-violet, pale silk shine'),
 ('rustworks', 'The Rustworks', 'an old foundry: riveted iron plates, gears, chains, pipes, furnaces, rust', 'rust brown and iron, orange furnace glow'),
 ('throne', 'The Hollow Throne', 'a cold dark royal palace: black marble, tall pillars, banners, carved masks, a great throne hall', 'blue-black marble, pale silver glow'),
 ('frost', 'Rimecrest', 'icy peaks and frozen caves: packed snow, blue ice, icicles, frozen stone', 'white and ice blue, bright cold light'),
 ('ember', 'Cinderdeep', 'volcanic depths: cracked basalt with glowing seams, ash, lava falls and pools', 'black basalt, red-orange lava glow'),
 ('stormcrest', 'Stormcrest', 'wind-torn cliffs high in a storm: slate rock, broken towers, lightning rods, wind streaks', 'slate blue, white lightning'),
 ('mirror', 'Mirror Vault', 'a sealed vault of black glass and silver frames that reflect everything, polished floors', 'black and silver-lilac, white sheen'),
 ('ossuary', 'The Ossuary', 'catacombs built from bones: skull walls, rib arches, bone pillars, candles, tombs', 'bone white and brown, warm candle glow'),
 ('lunar', 'Lunar Observatory', 'a moonlit observatory: brass telescopes, star charts, domes, low-gravity floating stones', 'deep blue and brass, silver moonlight'),
]
TILES = [
 ('ground_tiles', 'A square tile set, every tile exactly the same size (64x64 px), on a regular grid with a clear 16 px grey gap between tiles: '
  '6 solid inner fill tiles (variations of the same rock, seamless when placed side by side), 6 ground-top tiles (the walkable top edge with grass, frost or dust on it), '
  '4 ceiling-bottom tiles, 4 left-wall edge and 4 right-wall edge tiles, 4 outer corner and 4 inner corner tiles, 2 single-tile pillars. All tiles tile seamlessly with each other.'),
 ('walls_and_doors', 'Wall pieces and openings: 3 tall wall sections (seamless top to bottom), 2 breakable walls (whole, cracked, broken in 4 frames), a sealed gate (closed, opening in 5 frames, open), '
  'an archway door between rooms, a locked door with a keyhole, 2 window or niche pieces.'),
 ('platforms', 'Platforms: 3 thin one-way ledges (left end, middle, right end, seamless), a crumbling platform (whole, cracking, falling apart in 5 frames), a moving platform, '
  '2 small floating stepping stones, a hanging chain platform.'),
 ('hazards', 'Hazards: a strip of spikes (seamless to repeat sideways, pointing up) and the same pointing down and sideways, a pool of the area\'s liquid (water, acid or lava: '
  'surface strip seamless sideways plus a 6-frame surface ripple loop), a spinning saw blade on a rail (4 frames), an icicle or stalactite that falls (whole, shaking, falling, shattered).'),
 ('props_standing', '12 standing decorations that sit on the ground (rocks, plants, statues, lamps, crates, bones or crystals as fits the area), each a different size, from knee-high to twice the hero\'s height.'),
 ('props_hanging', '10 hanging decorations that hang from the ceiling (roots, vines, chains, lanterns, webs, icicles or banners as fits the area), different lengths.'),
 ('background_far', 'A seamless wide background layer, the farthest one: distant silhouettes of the area, very dark and low contrast, wide format 4:1, tiles left to right seamlessly. No characters.'),
 ('background_mid', 'A seamless wide middle background layer: the main shapes of the area at mid distance, darker than the play area, transparent-looking sky above them on the grey, wide format 4:1, tiles left to right seamlessly. No characters.'),
 ('background_near', 'A seamless wide near background layer: big dark shapes close to the camera (pillars, roots, rock), almost silhouettes, wide format 4:1, tiles left to right seamlessly. No characters.'),
 ('room_picture', 'One finished painting of a typical room of this area seen from the side, as a mood reference (this one image MAY have a full background, still no text).'),
]
LAND_TECH = ("NOT A PRESENTATION BOARD: no title, no logo, no captions, no numbers, no labels, no panels, no swatches. One plain flat mid-grey background (#808080), "
             "every piece separate with wide empty grey gaps, side view, lit from the top-left, same scale for all pieces (the hero is 2 tiles tall).")
write('lands/00_README.md', '# الأراضي: البلاطات والجدران والمنصات والمخاطر والزينة والخلفيات\n\nمجلد لكل منطقة من المناطق الخمس عشرة، وفيه عشرة برومبتات:\n'
      '1. بلاطات الأرض (حشوة، سطح يُمشى عليه، سقف، حواف، زوايا) بمقاس 64×64 بكسل تتصل ببعضها بلا فواصل.\n2. الجدران والأبواب والبوابات والجدران القابلة للكسر.\n3. المنصات (رفيعة، متهاوية، متحركة).\n'
      '4. المخاطر (أشواك، سائل المنطقة، منشار، صواعد تسقط).\n5. زينة واقفة.\n6. زينة معلّقة.\n7–9. ثلاث طبقات خلفية (بعيدة، وسطى، قريبة) تتكرّر أفقياً بلا فواصل.\n10. لوحة غرفة كاملة كمرجع للجو.\n\n'
      'وفي `00_common/` قطع مشتركة بين كل المناطق: المقعد ومحطة الفانوس والرافعة والصناديق واللافتات وعملات الجيو والكتابات المرشدة.\n\n' + HOW)
for i, (k, n, d, pal) in enumerate(AREAS, 1):
    for j, (t, w) in enumerate(TILES, 1):
        body = '```\n' + STYLE + '\nArea "%s": %s. Palette: %s.\n%s\n%s\n```\n' % (n, d, pal, w, LAND_TECH if t != 'room_picture' else 'No text, no labels.')
        write('lands/%02d_%s/%02d_%s.md' % (i, k, j, t), '# %s — %s\n\n' % (n, t.replace('_', ' ')) + body)
COMMON = [('bench', 'A stone rest bench in 3 versions (plain, mossy, iron), and a glow that rises when the hero sits (6 frames).'),
 ('lantern_station', 'A tall travel lantern station: dark (unlit), lighting up (5 frames), lit with a soft flame loop (6 frames).'),
 ('lever_and_switch', 'A wall lever (up, moving in 3 frames, down) and a floor pressure plate (up, pressed).'),
 ('chest_and_pickups', 'A small chest (closed, opening in 4 frames, open), a geo coin spinning (8 frames), a mask shard, a soul vessel fragment, a charm on a pedestal.'),
 ('signs_and_shrines', 'A wooden signpost, a carved stone tablet, a small shrine with a candle (6-frame flame), an echo stone that glows (6 frames).'),
 ('doors_between_areas', 'A big carved gate between areas: closed, opening in 6 frames, open; and an elevator platform with its chains.')]
for j, (t, w) in enumerate(COMMON, 1):
    write('lands/00_common/%02d_%s.md' % (j, t), '# Common — %s\n\n```\n%s\n%s\n%s\n```\n' % (t.replace('_', ' '), STYLE, w, LAND_TECH))

# ---------------------------------------------------------------- one zip per kind
names = {'monsters': 'duskwell-prompts-monsters.zip', 'bosses': 'duskwell-prompts-bosses.zip', 'moves': 'duskwell-prompts-moves.zip', 'lands': 'duskwell-prompts-lands.zip'}
for d, z in names.items():
    zp = os.path.join(OUT, z)
    with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as zf:
        for r, _, fs in sorted(os.walk(os.path.join(OUT, d))):
            for f in sorted(fs): zf.write(os.path.join(r, f), os.path.relpath(os.path.join(r, f), OUT))
    print(z, sum(len(f) for _, _, f in os.walk(os.path.join(OUT, d))), 'files', os.path.getsize(zp), 'bytes')
