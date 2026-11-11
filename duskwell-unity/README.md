# Duskwell – the Unity version

A separate copy of the game made in Unity (2022.3 LTS), next to the first version in `duskwell/`.

Stages one and two: all 159 rooms of the world read from `Assets/Resources/world.json`, the hero with the same movement
numbers (run, jump with a cut rise, coyote time, jump buffer, one-way ledges, springing caps), doors between the rooms, spikes
and acid, the camera, the painted backgrounds and rock, keys and touch buttons; the 37 kinds of creature with their painted frames (walkers, flyers and hanging things in a first, simple
form), the blade's swing, wounds and knock-back, and the painted hearts. Not yet here: each creature's own behaviour, bosses,
the painted tile kits and decor, menus, sound, saving.

Everything is built from code at start (`Assets/Scripts/Game.cs`), so there is no hand-made scene.

## Building
`.github/workflows/unity.yml` builds the Android app with GameCI. It needs three repository secrets:
`UNITY_LICENSE` (the contents of the `.ulf` licence file of a free Personal licence), `UNITY_EMAIL` and `UNITY_PASSWORD`.
Or open the folder in Unity Hub and run **Build.Android** from a menu-less command line:
`Unity -batchmode -quit -projectPath duskwell-unity -executeMethod Build.Android`.
