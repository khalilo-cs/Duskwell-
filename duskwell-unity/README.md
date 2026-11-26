# Duskwell – the Unity version

A separate copy of the game made in Unity (2022.3 LTS), next to the first version in `duskwell/`.

Stages one to three: all 159 rooms of the world read from `Assets/Resources/world.json`, the hero with the same movement
numbers (run, jump with a cut rise, coyote time, jump buffer, one-way ledges, springing caps), doors between the rooms, spikes
and acid, the camera, the painted backgrounds and rock, keys and touch buttons; the 37 kinds of creature with their painted frames (walkers, flyers and hanging things in a first, simple
form), the blade's swing, wounds and knock-back, and the painted hearts. Stage three: the dash, the wall slide and wall jump, the double jump (all open from the start for now), each area's music and
air, the blade's and the creatures' sounds, a fade as a room opens, and the game goes on from the room last entered.
Stage four: every room looks as it was painted in the first version: each piece laid there (rock edges, ledges, spikes,
furnishings, set pieces, hills, cave arches: about 138,000 of them) is listed in `Resources/draws/` and laid the same way.
Stage five: the seventeen lords of the halls with their painted poses (approach, wind-up, lunge, a leap every third time, quicker
below half strength), their painted health bar, a beaten lord stays beaten; places blended between steps (smooth on any
screen), a stop of time and a shake at a blow, the blade's painted arc, dust at landings and deaths, a breath in every creature,
a drifting backdrop. Stage six: the life of every room (each area's own swaying plants, fluttering and scurrying things, which bend and flee
as the hero passes), shadowed edges of the view, pale shapes behind a dash. Not yet here: each creature's and lord's own attacks,
the painted tile kits and decor, menus, sound, saving.

Stage seven, the story and the rest of the game:
- **The story** (`StoryText.cs`): a told prologue and ending on painted panels (`Resources/story`), every area named with a
  line about it as it is entered, the twelve lords who swallowed the shards of the Lantern and the four who guard the roads, each
  with its name, title and words as it rises, at half strength and as it falls; every shard brings back a memory, and the
  memories tell the truth piece by piece; the King's fall ends the game.
- **The people** (`StoryUI.cs`): the Elder, the merchant, the smith, the seamstress, the seer and the wayfarers, with their painted
  portraits (`Resources/npc`, drawn by the first version's painters), each saying something new as the shards come back; the
  merchant sells masks and the smith sharpens the blade.
- **The puzzles** (`World.cs`): walls that give way after three blows (secrets behind them), levers that open far gates, floors
  that crumble and come back, cracked floors only the dive breaks, the Throne's gate that opens to the twelve shards, the halls'
  gates that shut as a lord wakes; benches to rest and keep the journey, old tablets, chests, mask seeds, charms.
- **The powers**, won from the lords as in the first version: dash, wall grip, double jump, dive, crystal heart; the soul the blade
  gathers heals a wound (held) or is thrown as an orb (pressed).
- **The fights** (`Fight.cs`): every lord has a great move of its kind besides its lunge and its leap (floor waves and falling
  stones, rings of light, cuts across the hall, pillars of light), quicker below half strength, raging at the end; the charm wardens
  are the middle lords; the painted shots of the first version (`Resources/proj`).
- **Arabic on screen** (`Arabic.cs`): letters joined and read from the right, with the Cairo font (`Resources/font`).

Everything is built from code at start (`Assets/Scripts/Game.cs`), so there is no hand-made scene.

## Building
**Step-by-step guide in Arabic: [`START_HERE.md`](START_HERE.md).** The zipped project is on the release *unity-1*.

Open the folder in Unity 2022.3 (with Android Build Support) from Unity Hub, then choose **Duskwell > Build Android APK** in the
menu; the app is written to `Build/duskwell-unity.apk`. The workflow *Pack the Unity project* offers the folder alone as a download.
