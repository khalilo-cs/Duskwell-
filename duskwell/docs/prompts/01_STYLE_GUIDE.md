# Style guide

```
STYLE (paste at the start of every prompt)
Dark hand-painted 2D game art for a side-scrolling action-exploration game: moody, slightly desaturated palette with one glowing accent colour,
clean thin dark ink outline of even weight, soft painted shading from a single light source at the top-left, rim light on the edge facing the light,
readable silhouette at small size. Side view, character faces RIGHT. Original design, not a copy of any existing game or character.

TECHNICAL (paste at the end of every prompt)
One image. A plain flat mid-grey background (#808080), perfectly even: no gradient, no floor, no cast shadow, no vignette, no text, no labels, no frame lines,
no watermark. Every drawing sits in its own invisible cell of a regular grid with clear empty grey space around it, never touching or overlapping another.
All drawings in the sheet are the SAME SCALE (the body never gets bigger or smaller between frames) and share the same ground line: feet / lowest point
of the body on the same baseline in each row. Same character, same colours, same proportions in every frame. High resolution (at least 2048 px wide).
```

## Sheet layout
- One row per animation state, frames left to right in play order. Leave at least 40 px of empty grey between frames and between rows.
- Name the file `<id>_<state>.png`, e.g. `husk_walk.png`, or `<id>_sheet.png` when several states share one image (then keep one state per row, in the order listed in the file).
- Keep the same canvas scale for the whole character: a frame never gets re-scaled.
- Attacks need a clear anticipation frame, an impact frame and a recovery frame; the game holds the impact frame a few ticks for hit-stop, so make it the most extreme pose.
- Effects (slash arcs, rings, glow) are drawn **in a separate row** from the body whenever possible, so the game can place them on its own.
- Loops (idle, walk, run) must end almost where they start.

## What the game does with them
Creatures: states idle, walk, atk, hurt, death (some also dazed, dig, rise, roll, pile, fall, skull, crash, shatter). Bosses: poses plus procedural motion today; the sets below
would let every boss move by real frames. Hero: 16 rows listed in `02_hero.md`.
