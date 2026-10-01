# Duskwell – Unity C# scripts

These scripts mirror the systems of the browser version so the game can be moved to Unity.
They target Unity 2022 LTS (2D). On Unity 6, rename `rb.velocity` to `rb.linearVelocity`.
They compile cleanly against stand-in UnityEngine types; they have not been run inside the Unity editor yet.

| Script | What it does | Attach to |
| --- | --- | --- |
| `PlayerController2D.cs` | Instant run speed, jump arc from height and time-to-apex, variable jump (release cuts the rise), heavier fall gravity, coyote time, jump buffering, optional double jump, `Bounce()` and `ApplyRecoil()` for combat, `AirActionsReset` event | Player (Rigidbody2D + BoxCollider2D, child `groundCheck`) |
| `PlayerCombat.cs` | Buffered nail attacks (side / up / down-in-air), brief trigger hitboxes, one hit per target per swing, nail bounce (pogo) off enemies and `Hazard`-tagged spikes, recoil for player and enemy, real-time hit stop, `HitLanded` event. Also defines `HitInfo`, `IHittable`, `IDamageable` | Player |
| `NailHitbox.cs` | Enables its trigger collider only during a swing and forwards contacts to `PlayerCombat` | Three children of the player: Side, Up, Down |
| `EnemyAI.cs` | `switch (currentState)` FSM: Idle, Patrol (two waypoints), Chase (distance + `Physics2D.Raycast` sight), Anticipation (wind-up), Attack (lunge with trigger hitbox), Recoil (knockback). Ledge and wall checks, optional super armour, health, `StateChanged` and `Died` events | Enemy (Rigidbody2D, body collider, children `attackHitbox` and `ledgeCheck`) |
| `PlayerHealth.cs` | Masks, 1.3 s invulnerability with sprite blinking, knockback away from the attacker, damage hit stop, spike respawn at the last spot where both feet stood on ground, death and `RespawnAt(bench)`. Implements `IDamageable`; events `Damaged`, `Healed`, `Died`, `HazardRespawning` | Player |
| `PlayerSoul.cs` | Soul gained from nail hits on enemies, hold Focus on the ground to spend 33 soul per mask (0.9 s each), cancelled by moving, attacking or being hit; locks movement while focusing | Player |
| `Hazard.cs` | Trigger that sends the player back to safe ground and costs a mask; tag it `Hazard` so down strikes bounce off it | Spikes, thorns, acid |
| `HitStop.cs` | Shared freeze-frame clock used by combat and damage; overlapping requests never leave the game frozen | Created automatically |
| `CameraFollow2D.cs` | `SmoothDamp` (or `Vector3.Lerp`) follow with look-ahead, clamped to the room's `BoxCollider2D` bounds | Main Camera (orthographic) |
| `ParallaxLayer.cs` | Moves a layer by `z / (cameraDistance + z)` of the camera's motion, so far layers look slow and negative-z foreground looks fast; optional horizontal looping | Each background / foreground sprite |

## Scene setup in short
1. **Layers**: `Ground`, `Player`, `Enemy`, `Hazard`. In Physics 2D settings, stop `Player` and `Enemy` bodies from colliding with each other so enemies hurt by trigger, not by pushing.
2. **Player**: `PlayerController2D` (ground mask = Ground) and `PlayerCombat` (hittable layers = Enemy + Hazard). Add three child trigger boxes with `NailHitbox` and drag them into the Side, Up and Down slots. Map an `Attack` button in the Input Manager, or keep `Fire1`.
3. **Health and soul**: add `PlayerHealth` (ground mask = Ground, drag the player's sprites into *Renderers To Flash*) and `PlayerSoul` (map a `Focus` button, or keep `Fire2`). Tag the player `Player`.
4. **Enemy**: `EnemyAI` with two empty children as waypoints, a `ledgeCheck` point in front of the feet, an `attackHitbox` trigger, and a small trigger child for contact damage.
5. **Spikes**: a trigger with the `Hazard` component, on layer `Hazard` and tagged `Hazard`, so touching costs a mask and a down strike bounces off.
6. **Game manager**: listen to `PlayerHealth.Died`, fade the screen, then call `RespawnAt(benchPosition)`.

Tuning notes are in each field's `[Tooltip]`, visible in the Inspector.
