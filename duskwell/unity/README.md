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
| `GameManager.cs` | Death sequence (slow motion, fade, respawn at the last bench, fade in), bench rest heals and refills soul then saves, loads the save on start, world flags (`HasFlag` / `SetFlag`) for bosses and items, death count and play time | One empty object in the scene |
| `Bench.cs` | Press Up inside the trigger to sit: player is rooted, healed and the game saves; any movement, jump or Down stands up. Shows an optional prompt and passes its room bounds to the camera on respawn | Each bench |
| `SaveSystem.cs` | `SaveData` (bench, max masks, abilities, flags, deaths, play time) stored as JSON in `PlayerPrefs` | Static, nothing to attach |
| `ScreenFader.cs` | Full-screen black fade on unscaled time, used by deaths and room changes | A black UI Image with a CanvasGroup |
| `HUD.cs` | Mask icons that rebuild on upgrades and flash when one breaks; soul vessel whose level eases toward the real value and pulses when a heal is affordable | The Canvas |
| `PersistentRoot.cs` | Keeps the player, camera, UI and managers alive across scene loads; a duplicate destroys itself | One root object holding all of them |
| `RoomTransition.cs` | Doorway at a room edge: id, target scene and door, which edge it sits on, spawn point and the room's camera bounds; re-arms only after the player steps out | Each doorway trigger |
| `RoomManager.cs` | Fade out, load the target scene asynchronously if needed, place the player at the matching door, clamp the camera, entry motion (side doors walk in, floor openings pop up, ceiling openings fall in), fade in | Persistent root |
| `PlayerDash.cs` | Gravity-free horizontal burst toward the held direction, cooldown, one air dash refilled by landing, wall cling or pogo; `unlocked` flag | Player |
| `PlayerWallJump.cs` | Wall sensors, slow slide while holding toward a wall, wall jump with input lock and coyote grace, faces away from the wall, refills air actions; `unlocked` flag | Player |
| `AbilityPickup.cs` | Grants Dash, Wall Jump or Double Jump once and saves its flag; removes itself if already collected | Ability relic |
| `StoneGuardianBoss.cs` | First boss as a `switch (currentState)` FSM: Dormant, Intro, Idle, Leap (shockwaves on landing), Slam (club hitbox, forward wave, falling rocks), Charge (until a wall) then Stunned, Dying, Dead. Phase two below half health: faster wind-ups and more rocks | Boss |
| `Shockwave.cs` | Ground wave that travels, hurts on touch and breaks on walls | Prefab |
| `FallingRock.cs` | Warning marker on the floor, then a falling rock that hurts and shatters | Prefab |
| `BossArena.cs` | Seals the gates when the player walks in, wakes the boss, saves the flag and reveals the reward on victory, resets everything if the player dies | Trigger inside the arena |
| `BossHealthBar.cs` | Boss name and health with a trailing lag bar, driven by static `BossEvents` so it works across scenes | Persistent canvas |
| `CameraFollow2D.cs` | `SmoothDamp` (or `Vector3.Lerp`) follow with look-ahead, clamped to the room's `BoxCollider2D` bounds, and `Shake(amplitude, duration)` that keeps running through hit stop | Main Camera (orthographic) |
| `ParallaxLayer.cs` | Moves a layer by `z / (cameraDistance + z)` of the camera's motion, so far layers look slow and negative-z foreground looks fast; optional horizontal looping | Each background / foreground sprite |

## Scene setup in short
1. **Layers**: `Ground`, `Player`, `Enemy`, `Hazard`. In Physics 2D settings, stop `Player` and `Enemy` bodies from colliding with each other so enemies hurt by trigger, not by pushing.
2. **Player**: `PlayerController2D` (ground mask = Ground) and `PlayerCombat` (hittable layers = Enemy + Hazard). Add three child trigger boxes with `NailHitbox` and drag them into the Side, Up and Down slots. Map an `Attack` button in the Input Manager, or keep `Fire1`.
3. **Health and soul**: add `PlayerHealth` (ground mask = Ground, drag the player's sprites into *Renderers To Flash*) and `PlayerSoul` (map a `Focus` button, or keep `Fire2`). Tag the player `Player`.
4. **Enemy**: `EnemyAI` with two empty children as waypoints, a `ledgeCheck` point in front of the feet, an `attackHitbox` trigger, and a small trigger child for contact damage.
5. **Spikes**: a trigger with the `Hazard` component, on layer `Hazard` and tagged `Hazard`, so touching costs a mask and a down strike bounces off.
6. **Benches**: a trigger with `Bench`, a child `sitPoint`, a unique `benchId` and the room's bounds collider.
7. **UI**: a Screen Space Overlay Canvas with `HUD` (mask container with a Horizontal Layout Group, a mask Image prefab, a Filled vertical soul Image) and a full-screen black Image with `ScreenFader`.
8. **Persistent root**: one root object with `PersistentRoot` holding the player, the camera, the canvas, `GameManager` and `RoomManager`. Drag the player's components, the camera, the fader and the start bench into `GameManager`.
9. **Rooms**: each room has a `BoxCollider2D` (trigger, on an ignored layer) marking its bounds. Each doorway is a `RoomTransition` with a unique `doorId`, the `targetScene` and `targetDoorId` of the matching door, the edge it sits on and a spawn point one or two tiles inside the room. Add every scene to Build Settings.
10. **Abilities**: add `PlayerDash` (map `Dash`, or keep `Fire3`) and `PlayerWallJump` (wall mask = Ground) to the player with `unlocked` off; place `AbilityPickup` relics, or use one as a boss reward.
11. **Boss**: build the arena with gate objects (inactive, solid when active), a `BossArena` trigger a few tiles past the entrance, the `StoneGuardianBoss` with its slam hitbox, ground check, arena edge markers and the `Shockwave` / `FallingRock` prefabs, and a `BossHealthBar` on the canvas.

Tuning notes are in each field's `[Tooltip]`, visible in the Inspector.


## PlayerController.cs — البطل في ملف واحد (على بنية مشروع DanielDFY)

ملف مستقل يمكن وضعه بدل `PlayerController.cs` في مشروع **DanielDFY / Hollow-Knight-Imitation**، أو استعماله هنا بدل الملفات المنفصلة (`PlayerController2D` و`PlayerCombat` و`PlayerDash` و`PlayerWallJump`). الكود مكتوب من جديد، لكنه يتبع بنية ذلك المشروع وقيمه:
- **الحركة:** `Rigidbody2D` بالسرعة المباشرة. القيم: مشي 5، قفز 7، قفزتان، قفز الجدار (8,10)، وترك الزر يجعل السقوط 5. الاندفاع 10 لمدة 0.15 ثانية ثم انتظار 0.4.
- **الضربات:** 0.3 ثانية بينها.
- **لمس الأرض:** `CircleCast` نحو طبقة `Platform`.
- **الجدار:** يُعرف بوسم `Wall`.
- **الضربة:** `CircleCastAll` نحو الأعلى أو الأمام أو الأسفل في الهواء، مع ارتداد لكل اتجاه.
- **الـ Animator:** يحمل أسماء معاملات المشروع نفسها: `IsGround` و`IsDown` و`IsJump` و`IsJumpFirst` و`IsJumpSecond` و`IsRun` و`IsRotate` و`stopTrigger` و`IsClimb` و`IsClimbJump` و`IsSprint` و`IsAttack` و`IsAttackUp` و`IsAttackDown` و`IsHurt` و`IsDead`.

**الإضافات:**
- زمن الذئب، وتخزين القفز، وجاذبية أثقل في السقوط.
- توقف لحظي واهتزاز للشاشة عند الضرب والإصابة (`HeroFeel`).
- الارتداد للأعلى بضربة سفلية على عدو أو فخ، ويعيد القفزة والاندفاع.
- جزيئات وأصوات، وأحداث `UnityEvent`.
- مشغّل إطارات يحمّل الرسوم من `Resources/Hero/<الحالة>/1.png, 2.png ...`.

**الإعداد:**
1. على البطل: `Rigidbody2D` و`BoxCollider2D` و`SpriteRenderer` (و`Animator` إن أردت أن يتولى الرسوم بدل الإطارات).
2. الطبقات: `Platform` للأرض، و`Enemy` و`Trap` و`Switch` و`Projectile` لما يُضرب، و`PlayerInvulnerable` للحصانة المؤقتة. ضع الوسم `Wall` على الجدران.
3. الرسوم: مجلد لكل حالة داخل `Assets/Resources/Hero/`: Idle, Run, Turn, Jump, DoubleJump, Fall, Land, WallCling, WallJump, Dash, AttackForward, AttackUp, AttackDown, Hurt, Dead.
4. المؤثرات الاختيارية في `Assets/Resources/Hero/FX/`: DashTrail, LandDust, WallDust, HitSpark, DoubleJumpPuff.
5. الأزرار: القفز Space/Z، والضرب J/X، والاندفاع K/C.

**ملاحظات:**
- صور مشروع DanielDFY مأخوذة من Hollow Knight وحقوقها لشركة Team Cherry، فلا تضعها في لعبة تنشرها. ارسم إطاراتك أنت. وصف تصميم البطل مكتوب في أعلى الملف.
- إن استعملته داخل هذا المشروع، أطفئ الملفات الأربعة التي يحل محلها. ولكي تؤذيه سكربتات `Hazard` و`FallingRock`، أضف `IDamageable` إلى تعريف الصنف؛ الدالة `TakeDamage` موجودة فيه.
