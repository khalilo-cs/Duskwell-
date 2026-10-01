using System.Collections;
using UnityEngine;

// Masks, invulnerability after a hit, knockback, spike respawn at the last safe ground, death.
//
// Setup: on the player, next to PlayerController2D. Drag the player's SpriteRenderers into
// "renderersToFlash". Spikes use the Hazard component; enemies call TakeDamage through IDamageable.
[RequireComponent(typeof(PlayerController2D), typeof(Rigidbody2D))]
public class PlayerHealth : MonoBehaviour, IDamageable
{
    [Header("Masks")]
    public int maxMasks = 5;

    [Header("After a hit")]
    [Tooltip("Seconds of invulnerability after taking damage (Hollow Knight uses about 1.3).")]
    public float invulnerableTime = 1.3f;
    [Tooltip("Blink speed of the sprite while invulnerable.")]
    public float flashInterval = 0.08f;
    public SpriteRenderer[] renderersToFlash;
    [Tooltip("x = speed away from the attacker, y = upward pop. Units per second.")]
    public Vector2 knockback = new Vector2(7f, 8f);
    [Tooltip("Seconds the knockback overrides movement input.")]
    public float knockbackTime = 0.2f;
    [Tooltip("Real-time freeze on taking damage; sells the impact.")]
    public float damageHitStop = 0.12f;

    [Header("Hazards (spikes, acid)")]
    public int hazardDamage = 1;
    [Tooltip("Seconds the screen holds before the player reappears on safe ground.")]
    public float hazardRespawnDelay = 0.35f;
    [Tooltip("Ground layers used to decide whether the current footing is safe.")]
    public LayerMask groundMask;
    [Tooltip("Half the player's width: both feet must stand on ground for a position to be saved.")]
    public float footHalfWidth = 0.3f;
    public float safeCheckInterval = 0.2f;

    public int CurrentMasks { get; private set; }
    public bool IsInvulnerable => invulnerableTimer > 0f;
    public bool IsDead { get; private set; }
    public Vector3 LastSafePosition => lastSafe;

    public event System.Action<int> Damaged;      // remaining masks
    public event System.Action<int> Healed;       // remaining masks
    public event System.Action Died;
    public event System.Action HazardRespawning;  // fade the screen here

    PlayerController2D controller;
    Rigidbody2D rb;
    float invulnerableTimer;
    float safeTimer;
    Vector3 lastSafe;
    bool respawning;

    void Awake()
    {
        controller = GetComponent<PlayerController2D>();
        rb = GetComponent<Rigidbody2D>();
        CurrentMasks = maxMasks;
        lastSafe = transform.position;
    }

    void Update()
    {
        if (invulnerableTimer > 0f)
        {
            invulnerableTimer -= Time.deltaTime;
            bool visible = invulnerableTimer <= 0f || Mathf.Repeat(invulnerableTimer, flashInterval * 2f) > flashInterval;
            SetVisible(visible);
        }
    }

    void FixedUpdate()
    {
        // Remember the last place where both feet stood on solid ground; spikes send the player back here.
        if (respawning || !controller.IsGrounded) { safeTimer = 0f; return; }
        safeTimer += Time.fixedDeltaTime;
        if (safeTimer < safeCheckInterval) return;
        safeTimer = 0f;
        Vector2 p = transform.position;
        bool left = Physics2D.Raycast(p + new Vector2(-footHalfWidth, 0f), Vector2.down, 1.2f, groundMask).collider != null;
        bool right = Physics2D.Raycast(p + new Vector2(footHalfWidth, 0f), Vector2.down, 1.2f, groundMask).collider != null;
        if (left && right) lastSafe = transform.position;
    }

    // ---------------- IDamageable ----------------
    public void TakeDamage(int amount, Vector2 sourcePosition)
    {
        if (IsDead || respawning || IsInvulnerable || amount <= 0) return;
        CurrentMasks = Mathf.Max(0, CurrentMasks - amount);
        if (Damaged != null) Damaged(CurrentMasks);
        HitStop.Freeze(damageHitStop);
        if (CurrentMasks == 0) { Die(); return; }

        // push away from the source; straight above or below pushes against the facing direction
        float dx = transform.position.x - sourcePosition.x;
        int away = Mathf.Abs(dx) > 0.05f ? (dx > 0f ? 1 : -1) : -controller.Facing;
        controller.ApplyRecoil(new Vector2(away * knockback.x, knockback.y), knockbackTime);
        invulnerableTimer = invulnerableTime;
    }

    // ---------------- hazards ----------------
    public void HazardHit()
    {
        if (IsDead || respawning) return;
        CurrentMasks = Mathf.Max(0, CurrentMasks - hazardDamage);
        if (Damaged != null) Damaged(CurrentMasks);
        HitStop.Freeze(damageHitStop);
        if (CurrentMasks == 0) { Die(); return; }
        StartCoroutine(RespawnOnSafeGround());
    }

    IEnumerator RespawnOnSafeGround()
    {
        respawning = true;
        if (HazardRespawning != null) HazardRespawning();
        controller.enabled = false;
        rb.velocity = Vector2.zero;
        rb.simulated = false;
        yield return new WaitForSeconds(hazardRespawnDelay);
        transform.position = lastSafe;
        rb.simulated = true;
        controller.enabled = true;
        respawning = false;
        invulnerableTimer = invulnerableTime;
    }

    // ---------------- healing, death, bench respawn ----------------
    public void Heal(int masks)
    {
        if (IsDead || masks <= 0 || CurrentMasks >= maxMasks) return;
        CurrentMasks = Mathf.Min(maxMasks, CurrentMasks + masks);
        if (Healed != null) Healed(CurrentMasks);
    }

    void Die()
    {
        IsDead = true;
        invulnerableTimer = 0f;
        SetVisible(true);
        SetActionsEnabled(false);
        rb.velocity = Vector2.zero;
        if (Died != null) Died();     // a game manager fades out and calls RespawnAt(bench)
    }

    // Called by the game manager after death or when resting at a bench.
    public void RespawnAt(Vector3 position)
    {
        StopAllCoroutines();
        transform.position = position;
        lastSafe = position;
        rb.simulated = true;
        rb.velocity = Vector2.zero;
        SetActionsEnabled(true);
        respawning = false;
        IsDead = false;
        CurrentMasks = maxMasks;
        if (Healed != null) Healed(CurrentMasks);
    }

    // Movement, nail and focus all stop while dead and come back on respawn.
    void SetActionsEnabled(bool on)
    {
        controller.enabled = on;
        PlayerCombat combat = GetComponent<PlayerCombat>();
        if (combat != null) combat.enabled = on;
        PlayerSoul soul = GetComponent<PlayerSoul>();
        if (soul != null) soul.enabled = on;
    }

    void SetVisible(bool on)
    {
        if (renderersToFlash == null) return;
        foreach (SpriteRenderer r in renderersToFlash) if (r != null) r.enabled = on;
    }
}
