# Credits and licences

## Sound effects and ambience — CC0 1.0 (public domain)
Recordings from the **Superpowers Asset Packs** by Pixel-boy / Sparklin Labs,
https://github.com/sparklinlabs/superpowers-asset-packs (licence: CC0 1.0 Universal; credit is not required but is appreciated).
Trimmed, normalised and re-encoded by `tools/audio/build_sfx.py`; used in `audio/sfx`:

| Game event | Source files |
| --- | --- |
| nail swing | medieval-fantasy `woosh-1`, `woosh-2`; western-fps-2d `woosh-1..3` |
| nail hits an enemy, boss hit | prehistoric-platformer `hit-1`, `hit-2`; western-fps-2d `impact-1` |
| enemy death | medieval-fantasy `monster-1`, `monster-2`; prehistoric-platformer `dinosaur-5` |
| boss roar | prehistoric-platformer `dinosaur-1`, `dinosaur-3`, `dinosaur-4` (slowed) |
| boss death, ground slam | western-fps-2d `explosion-1..3` (slowed) |
| breaking walls | prehistoric-platformer `wood-1..5` (slowed) |
| geo, abilities, healing, resting | ninja-adventure `gold-1`, `power-up`, `power-up-2`, `secret-1` |
| forest ambience (Hushvale, Moss Grove) | medieval-fantasy `forest-ambience` (looped with a cross-fade) |

## Made for this game
- Music (`audio/music`): original compositions in `tools/music/compose.py`, played with sampled instruments from the **FluidR3 GM SoundFont** (MIT licence, Frank Wen).
- Painted backgrounds (`art/bg`): made by `tools/paint/painter.js`.
- App icon, store icon and feature picture (`duskwell-android/app/src/main/res`, `duskwell-android/store`): the project artist's title banner, laid out by `tools/paint/make_icon.py`.
- Backgrounds, strips, area pictures, palettes and prop silhouettes (`art/bg`, `art/areas`, `art/props`): cut from the project artist's concept sheets in `art/source` by `tools/paint/import_concept.py` and `tools/paint/import_layers.py`.
- Pixel hero and husk (`art/source`, `art/sprites`): the project artist's own Aseprite files and sprites; the 3D lighting is `js/pixel.js`.
- Fonts: **Cairo** and **Cinzel** (SIL Open Font License 1.1), bundled with the Android app.

## Not used
Hollow Knight's own art and music belong to Team Cherry and are not part of this game. The "Your images" panel only lets a player try
pictures from their own device; they stay in that browser and are never shipped.

## Charms
The 21 charms (`js/charms.js`), their names, effects and icons (`js/art_charms.js`, drawn in code) are original to this project. Equippable relics limited by a number of slots are a common genre mechanic, so only the idea is shared with other Metroidvanias; no names, art or text from Hollow Knight or any other game are used.

## Rimecrest, Cinderdeep and Lumen
The sixteen rooms of the two new areas (`js/world_frost.js`, `js/world_ember.js`), the nine creatures (mole, lava worm, bomb imp, veil, roller, slime, chain bearer, night moth, icicle),
the Rime Queen and the Cinder Colossus, their art (`js/art_sprites.js`, drawn in code), the two painted backgrounds (`art/bg/frost`, `art/bg/ember`, made by `tools/paint/painter.js`)
and the two music pieces (`audio/music/frost.mp3`, `ember.mp3`, composed in `tools/music/compose.py`, played with the FluidR3 GM SoundFont as above) are original to this project.
The Lumen lighting renderer (`js/lumen.js`: normal maps baked from tiles and silhouettes, point lights, ray-marched shadows, bloom, shafts, aberration, haze, caustics) is written for this game;
it uses only the browser's WebGL2 API and no library or shader code from elsewhere.

## Stormcrest and the Mirror Vault
The fourteen rooms (`js/world_storm.js`, `js/world_mirror.js`), the wind zones (updrafts and crosswinds, `Level.winds`), the four bosses (Thunderhoof, the Storm Roc, the Glass Duelist,
the Wanderer's Twin) and their art, the two charms (Storm Cloak, Blade Echo), the painted backgrounds (`art/bg/storm`, `art/bg/mirror`) and the two music pieces (`audio/music/storm.mp3`, `mirror.mp3`)
are original to this project; the music is composed in `tools/music/compose.py` and played with the FluidR3 GM SoundFont as above. The Twin is drawn from the same idea as the hero (a horned mask and a
nail) but is not the hero's artwork. Nothing from Hollow Knight is used; a dark double of the player is a common genre idea.

## Equipment, the Ossuary, the Lunar Observatory, the bestiary and the orchestral music
The equipment (eight weapons, eight cloaks, three nail arts: `js/equipment.js`, `js/shops.js`, `js/art_gear.js`), the shops and their people (the smith, the outfitter, the travelling traders, the elder
and the merchant: `js/art_npcs.js`), the detail toolkit and the art of every creature and boss (`js/art_detail.js`, `js/art_creatures.js`, `js/art_deep.js`), the bestiary (`js/bestiary.js`, `js/screens.js`),
the two new areas with their fourteen rooms (`js/world_ossuary.js`, `js/world_lunar.js`), the low-gravity fields (`RoomBuilder.grav`), the six creatures (`js/enemies_deep.js`), the four bosses
(the Bonewright, the Marrow Tyrant, the Stargazer, the Eclipse Regent: `js/bosses_deep.js`), the two charms (Grave Whisper, Moonstep), the painted backgrounds (`art/bg/bone`, `art/bg/lunar`) and the six
new music pieces (`audio/music/overture.mp3`, `ending.mp3`, `ossuary.mp3`, `lunar.mp3`, `boss_bone.mp3`, `boss_moon.mp3`, composed in `tools/music/compose.py` and played with the FluidR3 GM SoundFont as above)
are all original to this project and drawn or written in code; no image, name, text or sound from Hollow Knight or any other game is used. The inked hero drawing (`wanderer()`) is ours;
the pixel hero (`art/source/hero.ase`) remains the artist's own work and stays the default look. Skeletons, bone pillars, lens-eyed bugs, brass orreries, eclipses and weak gravity are common
fantasy and Metroidvania motifs; only the ideas are shared.

## البطل الجديد (art/source/hero_parts, art/hero)
ورقة الأجزاء من أعمال صاحب المشروع (تصميم أصلي: قناع بيضاوي مشقوق بلا قرون وعباءة ممزقة)، وقصصتُها ورتّبتُها وحرّكتُها بكودنا. على صاحب المشروع التأكد من أن حقوق استعمالها تجارياً مضمونة له.

## المخلوقات (art/source/creatures, art/creatures)
ورقة الأوضاع من أعمال صاحب المشروع، وقصصتُها وجمّعتُها وحرّكتُها بكودنا. وورقة إطارات البطل المجاورة محفوظة في المستودع ولم تُدمج بعد. على صاحب المشروع التأكد من أن حقوق استعمالها تجارياً مضمونة له.

## The shop, forge, wizard, road and menu pieces
The five newer pieces (`audio/music/fiddler.mp3`, `forge.mp3`, `wizard.mp3`, `road.mp3`, `rest.mp3`) are original compositions written in `tools/music/compose.py` and played with the FluidR3 GM SoundFont as above. Their tunes are written from scratch; none of them is taken from, or arranged from, an existing song.

## The title, crossroads, abyss and two battle pieces
`audio/music/legend.mp3`, `adventure.mp3`, `abyss.mp3`, `boss_abyss.mp3` and `boss_march.mp3` are original compositions written in `tools/music/compose.py` and played with the FluidR3 GM SoundFont as above. Their tunes are written from scratch; none of them is taken from, or arranged from, an existing song. `tools/music/tonic.py` only measures the bass of the rendered pieces to find the key the combat pulse is tuned to.

## The Jukebox, the combat pulse and the echo stones
`js/jukebox.js`, `js/echo.js` and the pulse in `js/audio.js` are original code. The pulse is a synthesised drum (a sine that falls an octave and a half and a little band-passed noise); no recording is used for it.
