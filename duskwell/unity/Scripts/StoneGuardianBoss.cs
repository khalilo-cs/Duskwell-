using UnityEngine;

// The Stone Guardian: a heavy armoured brute with three readable attacks, written as one
// PlayMaker-style switch over currentState.
//
//   Dormant -> Intro (roar) -> Idle -> one of:
//     LeapAnticipation -> Leap (jumps at the player, lands with two shockwaves)
//     SlamAnticipation -> Slam (club strike, forward shockwave, rocks fall from the ceiling)
//     ChargeAnticipation -> Charge (runs until it hits a wall) -> Stunned (open to punishment)
//   ...back to Idle. Below phaseTwoAt health it waits less, winds up faster and drops more rocks.
//
// Setup: Rigidbody2D (Dynamic, Freeze Rotation Z, Interpolate), body collider on the Enemy layer,
// a trigger child for contact damage, a trigger child "slamHitbox" in front (disabled), a child
// "groundCheck" at the feet, Shockwave and FallingRock prefabs, and two arena edge markers.
[RequireComponent(typeof(Rigidbody2D))]
public class StoneGuardianBoss : MonoBehaviour, IHittable
{
    public enum State { Dormant, Intro, Idle, LeapAnticipation, Leap, SlamAnticipation, Slam, ChargeAnticipation, Charge, Stunned, Dying, Dead }

    [Header("Identity")]
    public string bossName = "Stone Guardian";
    public int maxHealth = 130;
    [Tooltip("Health fraction where phase two begins.")]
    [Range(0.1f, 0.9f)] public float phaseTwoAt = 0.5f;

    [Header("References")]
    public Transform player;
    public LayerMask groundMask;
    public Transform groundCheck;
    public Vector2 groundCheckSize = new Vector2(1.6f, 0.1f);
    public Collider2D slamHitbox;
    public SpriteRenderer[] renderers;
    public CameraFollow2D cameraFollow;
    [Tooltip("Arena edges, used to keep falling rocks inside the room.")]
    public Transform arenaLeft, arenaRight;
    [Tooltip("World height where rocks appear (just under the ceiling).")]
    public float rockSpawnY = 8f;

    [Header("Timing (seconds)")]
    public float introTime = 2.2f;
    [Tooltip("Pause after the intro roar before the first attack.")]
    public float idleTime = 0.75f;
    [Tooltip("Pause after every attack: the player's window to strike back.")]
    public float recoverTime = 0.55f;
    public float leapAnticipation = 0.5f;
    public float slamAnticipation = 0.75f;
    public float chargeAnticipation = 0.55f;
    public float slamActiveTime = 0.25f;
    public float stunTime = 1.1f;
    public float dyingTime = 2.2f;
    [Tooltip("Phase two multiplies idle and wind-up times by this (0.7 = 30% faster).")]
    [Range(0.3f, 1f)] public float phaseTwoSpeed = 0.7f;

    [Header("Leap")]
    public float leapHeight = 4.5f;
    public float leapTimeToApex = 0.36f;
    public float maxLeapSpeedX = 13f;

    [Header("Charge")]
    public float chargeSpeed = 12f;
    public float phaseTwoChargeSpeed = 14.5f;
    public float maxChargeTime = 1.5f;
    public float wallCheckDistance = 1.4f;

    [Header("Projectiles")]
    public Shockwave shockwavePrefab;
    public float shockwaveSpeed = 10f;
    public FallingRock rockPrefab;
    public int rocksPerSlam = 3;
    public int phaseTwoRocksPerSlam = 5;
    [Tooltip("Rocks land within this distance of the player.")]
    public float rockSpread = 6f;

    [Header("Damage")]
    public int contactDamage = 1;
    public int slamDamage = 2;

    [Header("Feedback")]
    public Color hitFlashColor = new Color(1f, 0.75f, 0.7f, 1f);
    public float hitFlashTime = 0.08f;

    [Header("Debug")]
    public State currentState = State.Dormant;

    public int Health { get; private set; }
    public bool PhaseTwo { get; private set; }
    public event System.Action Defeated;

    Rigidbody2D rb;
    Animator anim;
    Vector3 startPosition;
    float stateTimer;
    float idleDuration;
    float flashTimer;
    int facing = -1;
    State lastAttack = State.Dormant;

    float Speed => PhaseTwo ? phaseTwoSpeed : 1f;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        rb.freezeRotation = true;
        anim = GetComponent<Animator>();
        startPosition = transform.position;
        Health = maxHealth;
        if (slamHitbox != null) { slamHitbox.isTrigger = true; slamHitbox.enabled = false; }
        // Leap kinematics: g = 2h / t^2, launch speed = g * t. The boss always falls with this gravity.
        float g = 2f * leapHeight / (leapTimeToApex * leapTimeToApex);
        rb.gravityScale = g / Mathf.Abs(Physics2D.gravity.y);
    }

    // ---------------- control from the arena ----------------
    public void Activate(Transform target)
    {
        if (target != null) player = target;
        if (currentState != State.Dormant) return;
        ChangeState(State.Intro);
        Shake(0.35f, 0.9f);
        BossEvents.RaiseStarted(bossName, Health, maxHealth);
    }

    // Puts the boss back to its first moment (the player died mid-fight).
    public void ResetBoss()
    {
        transform.position = startPosition;
        rb.velocity = Vector2.zero;
        Health = maxHealth;
        PhaseTwo = false;
        if (slamHitbox != null) slamHitbox.enabled = false;
        flashTimer = 0f;
        SetTint(Color.white);
        ChangeState(State.Dormant);
        BossEvents.RaiseEnded();
    }

    // ---------------- decisions ----------------
    void Update()
    {
        stateTimer += Time.deltaTime;
        if (flashTimer > 0f) { flashTimer -= Time.deltaTime; if (flashTimer <= 0f) SetTint(Color.white); }

        switch (currentState)
        {
            case State.Dormant:
            case State.Dead:
                break;

            case State.Intro:
                if (stateTimer >= introTime) { idleDuration = idleTime; ChangeState(State.Idle); }
                break;

            case State.Idle:
                FacePlayer();
                if (stateTimer >= idleDuration * Speed) ChangeState(PickAttack());
                break;

            case State.LeapAnticipation:
                if (stateTimer >= leapAnticipation * Speed) BeginLeap();
                break;

            case State.Leap:
                if (stateTimer > 0.15f && IsGrounded()) Land();
                break;

            case State.SlamAnticipation:
                if (stateTimer >= slamAnticipation * Speed) BeginSlam();
                break;

            case State.Slam:
                if (stateTimer >= slamActiveTime)
                {
                    if (slamHitbox != null) slamHitbox.enabled = false;
                    Recover();
                }
                break;

            case State.ChargeAnticipation:
                if (stateTimer >= chargeAnticipation * Speed) ChangeState(State.Charge);
                break;

            case State.Charge:
                if (WallAhead() || stateTimer >= maxChargeTime) HitWall();
                break;

            case State.Stunned:
                if (stateTimer >= stunTime) Recover();
                break;

            case State.Dying:
                if (stateTimer >= dyingTime)
                {
                    ChangeState(State.Dead);
                    BossEvents.RaiseEnded();
                    if (Defeated != null) Defeated();
                }
                break;
        }
    }

    // ---------------- movement ----------------
    void FixedUpdate()
    {
        Vector2 v = rb.velocity;
        switch (currentState)
        {
            case State.Leap:
                break;                                              // ballistic: gravity does the work
            case State.Charge:
                v.x = facing * (PhaseTwo ? phaseTwoChargeSpeed : chargeSpeed);
                break;
            default:
                v.x = 0f;
                break;
        }
        rb.velocity = v;
    }

    State PickAttack()
    {
        // pick one of the two attacks that were not used last time
        State[] options = { State.LeapAnticipation, State.SlamAnticipation, State.ChargeAnticipation };
        State pick;
        do { pick = options[Random.Range(0, options.Length)]; } while (pick == lastAttack);
        lastAttack = pick;
        return pick;
    }

    void ChangeState(State next)
    {
        currentState = next;
        stateTimer = 0f;
        if (anim != null) anim.SetInteger("State", (int)next);
    }

    // After an attack the boss pauses for recoverTime: the player's window to strike.
    void Recover()
    {
        idleDuration = recoverTime;
        ChangeState(State.Idle);
    }

    // ---------------- attacks ----------------
    void BeginLeap()
    {
        FacePlayer();
        float g = Mathf.Abs(Physics2D.gravity.y) * rb.gravityScale;
        float vy = g * leapTimeToApex;                              // reaches leapHeight at the apex
        float airTime = 2f * leapTimeToApex;
        float vx = player != null ? Mathf.Clamp((player.position.x - transform.position.x) / airTime, -maxLeapSpeedX, maxLeapSpeedX) : 0f;
        rb.velocity = new Vector2(vx, vy);
        ChangeState(State.Leap);
    }

    void Land()
    {
        rb.velocity = Vector2.zero;
        SpawnShockwave(-1);
        SpawnShockwave(1);
        if (PhaseTwo) DropRocks(2);
        Shake(0.3f, 0.3f);
        Recover();
    }

    void BeginSlam()
    {
        if (slamHitbox != null) slamHitbox.enabled = true;
        SpawnShockwave(facing);
        DropRocks(PhaseTwo ? phaseTwoRocksPerSlam : rocksPerSlam);
        Shake(0.3f, 0.3f);
        ChangeState(State.Slam);
    }

    void HitWall()
    {
        rb.velocity = new Vector2(0f, rb.velocity.y);
        DropRocks(2);
        Shake(0.45f, 0.4f);
        ChangeState(State.Stunned);
    }

    void SpawnShockwave(int dir)
    {
        if (shockwavePrefab == null) return;
        Vector3 at = (groundCheck != null ? groundCheck.position : transform.position) + new Vector3(dir * 1.2f, 0f, 0f);
        Shockwave wave = Instantiate(shockwavePrefab, at, Quaternion.identity);
        wave.Launch(dir, shockwaveSpeed);
    }

    void DropRocks(int count)
    {
        if (rockPrefab == null || player == null) return;
        float minX = arenaLeft != null ? arenaLeft.position.x + 1f : player.position.x - rockSpread;
        float maxX = arenaRight != null ? arenaRight.position.x - 1f : player.position.x + rockSpread;
        for (int i = 0; i < count; i++)
        {
            float x = Mathf.Clamp(player.position.x + Random.Range(-rockSpread, rockSpread), minX, maxX);
            FallingRock rock = Instantiate(rockPrefab, new Vector3(x, rockSpawnY, 0f), Quaternion.identity);
            rock.Init(i * 0.12f);                                   // a staggered rain, not one wall
        }
    }

    // ---------------- senses ----------------
    bool IsGrounded()
    {
        Vector2 p = groundCheck != null ? (Vector2)groundCheck.position : (Vector2)transform.position;
        return rb.velocity.y <= 0.01f && Physics2D.OverlapBox(p, groundCheckSize, 0f, groundMask) != null;
    }

    bool WallAhead()
    {
        return Physics2D.Raycast(transform.position, new Vector2(facing, 0f), wallCheckDistance, groundMask).collider != null;
    }

    void FacePlayer()
    {
        if (player == null) return;
        float dx = player.position.x - transform.position.x;
        if (Mathf.Abs(dx) < 0.05f) return;
        facing = dx > 0f ? 1 : -1;
        Vector3 s = transform.localScale;
        s.x = Mathf.Abs(s.x) * facing;
        transform.localScale = s;
    }

    // ---------------- taking hits ----------------
    public void TakeHit(HitInfo hit)
    {
        if (currentState == State.Dormant || currentState == State.Intro || currentState == State.Dying || currentState == State.Dead) return;
        Health = Mathf.Max(0, Health - hit.damage);
        flashTimer = hitFlashTime;
        SetTint(hitFlashColor);
        BossEvents.RaiseHealth(Health, maxHealth);

        if (!PhaseTwo && Health <= maxHealth * phaseTwoAt)
        {
            PhaseTwo = true;
            Shake(0.4f, 0.6f);
        }
        if (Health == 0) Die();
    }

    void Die()
    {
        if (slamHitbox != null) slamHitbox.enabled = false;
        rb.velocity = Vector2.zero;
        Shake(0.6f, 1.5f);
        ChangeState(State.Dying);
    }

    // ---------------- dealing damage ----------------
    void OnTriggerStay2D(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        if (currentState == State.Dormant || currentState == State.Dying || currentState == State.Dead) return;
        IDamageable target = other.GetComponentInParent<IDamageable>();
        if (target == null) return;
        bool slam = currentState == State.Slam && slamHitbox != null && slamHitbox.enabled && slamHitbox.IsTouching(other);
        target.TakeDamage(slam ? slamDamage : contactDamage, transform.position);
    }

    void Shake(float amplitude, float duration)
    {
        if (cameraFollow != null) cameraFollow.Shake(amplitude, duration);
    }

    void SetTint(Color c)
    {
        if (renderers == null) return;
        foreach (SpriteRenderer r in renderers) if (r != null) r.color = c;
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        if (groundCheck != null) Gizmos.DrawWireCube(groundCheck.position, groundCheckSize);
        Gizmos.color = Color.red;
        Gizmos.DrawLine(transform.position, transform.position + new Vector3(facing * wallCheckDistance, 0f, 0f));
    }
}
