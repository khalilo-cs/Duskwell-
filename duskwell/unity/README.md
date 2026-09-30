# Duskwell – Unity C# scripts

These scripts mirror the systems of the browser version so the game can be moved to Unity.
They target Unity 2022 LTS (2D). On Unity 6, rename `rb.velocity` to `rb.linearVelocity`.

| Script | What it does | Attach to |
| --- | --- | --- |
| `PlayerController2D.cs` | Instant run speed, jump arc from height and time-to-apex, variable jump (release cuts the rise), heavier fall gravity, coyote time, jump buffering, optional double jump, `Bounce()` and `ApplyRecoil()` for combat | Player (Rigidbody2D + BoxCollider2D, child `groundCheck`) |
| `EnemyAI.cs` | `switch (currentState)` brain: Patrol between two waypoints, Chase when the player is seen (distance + `Physics2D.Raycast`), Attack when close (windup, lunge, recover) | Enemy (Rigidbody2D, tag the player `Player`) |
| `CameraFollow2D.cs` | `SmoothDamp` (or `Vector3.Lerp`) follow with look-ahead, clamped to the room's `BoxCollider2D` bounds | Main Camera (orthographic) |
| `ParallaxLayer.cs` | Moves a layer by `z / (cameraDistance + z)` of the camera's motion, so far layers look slow and negative-z foreground looks fast; optional horizontal looping | Each background / foreground sprite |

Tuning notes are in each field's `[Tooltip]`, visible in the Inspector.
