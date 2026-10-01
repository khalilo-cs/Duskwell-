using UnityEngine;

// Ground enemy brain written like a PlayMaker FSM: one enum, one switch over currentState.
//
//   Idle -> Patrol (between two waypoints) -> Chase (player seen by distance + raycast)
//        -> Anticipation (readable wind-up) -> Attack (lunge with a trigger hitbox) -> Idle
//   Any state except the wind-up and the strike drops into Recoil when struck by the nail.
//
// Setup: Rigidbody2D (Dynamic, Freeze Rotation Z, Interpolate) and a body Collider2D.
// Child "attackHitbox": trigger collider, disabled. Child "ledgeCheck": a point just in front
// of the feet. Tag the player "Player"; walls and floors go in "groundMask".
[RequireComponent(typeof(Rigidbody2D))]
public class EnemyAI : MonoBehaviour, IHittable
{
    public enum State { Idle, Patrol, Chase, Anticipation, Attack, Recoil }

    [Header("Health")]
    public int maxHealth = 15;

    [Header("Idle / Patrol")]
    public Transform waypointA;
    public Transform waypointB;
    public float patrolSpeed = 1.5f;
    [Tooltip("Pause at each waypoint and after an attack.")]
    public float idleTime = 0.8f;
    public float waypointTolerance = 0.15f;

    [Header("Senses")]
    public Transform player;
    public Transform eyes;
    public float sightRange = 8f;
    [Tooltip("Only notice the player in front. Chasing ignores this so it does not lose a target that jumps over it.")]
    public bool frontVisionOnly = true;
    [Tooltip("Keep chasing this long after the player leaves sight.")]
    public float loseSightTime = 1.2f;
    [Tooltip("Layers that block sight and count as ground and walls.")]
    public LayerMask groundMask;

    [Header("Ledges and walls")]
    [Tooltip("Point just ahead of the feet; a ray from here looks for floor.")]
    public Transform ledgeCheck;
    public float ledgeRayLength = 0.6f;
    public float wallRayLength = 0.6f;
    [Tooltip("Allow walking off platforms while chasing (most enemies should not).")]
    public bool canDropOffLedges = false;

    [Header("Chase")]
    public float chaseSpeed = 4f;

    [Header("Anticipation / Attack")]
    [Tooltip("Horizontal distance that starts the wind-up.")]
    public float attackRange = 1.4f;
    public float anticipationTime = 0.45f;
    public float attackTime = 0.3f;
    public float lungeSpeed = 9f;
    public Collider2D attackHitbox;
    public int attackDamage = 1;
    [Tooltip("Armoured during wind-up and strike: hits still hurt but do not interrupt.")]
    public bool superArmorWhileAttacking = true;

    [Header("Recoil")]
    public float recoilTime = 0.2f;
    [Tooltip("0 = full knockback, 1 = immovable.")]
    [Range(0f, 1f)] public float knockbackResistance = 0f;

    [Header("Contact")]
    public int contactDamage = 1;

    [Header("Debug")]
    public State currentState = State.Idle;

    public event System.Action<State> StateChanged;
    public event System.Action<EnemyAI> Died;

    Rigidbody2D rb;
    Animator anim;
    Transform targetWaypoint;
    float stateTimer;
    float lastSeenTime = -999f;
    int facing = 1;
    int health;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        rb.interpolation = RigidbodyInterpolation2D.Interpolate;
        rb.freezeRotation = true;
        anim = GetComponent<Animator>();
        health = maxHealth;
        targetWaypoint = waypointB != null ? waypointB : waypointA;
        if (attackHitbox != null) { attackHitbox.isTrigger = true; attackHitbox.enabled = false; }
        if (player == null)
        {
            GameObject p = GameObject.FindGameObjectWithTag("Player");
            if (p != null) player = p.transform;
        }
    }

    // ---------------- decisions (FSM transitions) ----------------
    void Update()
    {
        stateTimer += Time.deltaTime;
        bool sees = CanSeePlayer();
        if (sees) lastSeenTime = Time.time;

        switch (currentState)
        {
            case State.Idle:
                if (sees) ChangeState(State.Chase);
                else if (stateTimer >= idleTime) ChangeState(State.Patrol);
                break;

            case State.Patrol:
                if (sees) { ChangeState(State.Chase); break; }
                if (targetWaypoint == null || ReachedWaypoint() || IsBlockedAhead())
                {
                    targetWaypoint = targetWaypoint == waypointA ? waypointB : waypointA;
                    ChangeState(State.Idle);
                }
                break;

            case State.Chase:
                if (Time.time - lastSeenTime > loseSightTime) { ChangeState(State.Patrol); break; }
                if (player != null && Mathf.Abs(player.position.x - transform.position.x) <= attackRange
                    && Mathf.Abs(player.position.y - transform.position.y) < 1.5f)
                    ChangeState(State.Anticipation);
                break;

            case State.Anticipation:
                if (stateTimer >= anticipationTime) ChangeState(State.Attack);
                break;

            case State.Attack:
                if (stateTimer >= attackTime) ChangeState(State.Idle);   // the idle pause is the recovery window
                break;

            case State.Recoil:
                if (stateTimer >= recoilTime) ChangeState(sees || Time.time - lastSeenTime < loseSightTime ? State.Chase : State.Patrol);
                break;
        }
    }

    // ---------------- movement (physics per state) ----------------
    void FixedUpdate()
    {
        Vector2 v = rb.velocity;
        switch (currentState)
        {
            case State.Idle:
            case State.Anticipation:
                v.x = 0f;
                break;

            case State.Patrol:
                if (targetWaypoint != null) Face(targetWaypoint.position.x - transform.position.x);
                v.x = IsBlockedAhead() ? 0f : facing * patrolSpeed;
                break;

            case State.Chase:
                if (player != null) Face(player.position.x - transform.position.x);
                v.x = IsBlockedAhead() ? 0f : facing * chaseSpeed;
                break;

            case State.Attack:
                v.x = IsBlockedAhead() ? 0f : facing * lungeSpeed;
                break;

            case State.Recoil:
                // knockback was set in TakeHit; bleed it off quickly so control returns crisply
                v.x = Mathf.MoveTowards(v.x, 0f, 30f * Time.fixedDeltaTime);
                break;
        }
        rb.velocity = v;
    }

    void ChangeState(State next)
    {
        if (currentState == State.Attack && attackHitbox != null) attackHitbox.enabled = false;
        currentState = next;
        stateTimer = 0f;
        if (next == State.Anticipation && player != null) Face(player.position.x - transform.position.x);
        if (next == State.Attack && attackHitbox != null) attackHitbox.enabled = true;
        if (anim != null) anim.SetInteger("State", (int)next);
        if (StateChanged != null) StateChanged(next);
    }

    // ---------------- senses ----------------

    // Distance first (cheap), then a raycast so walls block the view.
    bool CanSeePlayer()
    {
        if (player == null) return false;
        Vector2 origin = eyes != null ? (Vector2)eyes.position : (Vector2)transform.position;
        Vector2 toPlayer = (Vector2)player.position - origin;
        float dist = toPlayer.magnitude;
        if (dist > sightRange || dist < 0.001f) return false;
        if (frontVisionOnly && currentState != State.Chase && Mathf.Sign(toPlayer.x) != facing) return false;
        return Physics2D.Raycast(origin, toPlayer / dist, dist, groundMask).collider == null;
    }

    // True when there is no floor just ahead or a wall right in front.
    bool IsBlockedAhead()
    {
        Vector2 feetAhead = ledgeCheck != null ? (Vector2)ledgeCheck.position : (Vector2)transform.position + new Vector2(facing * 0.5f, -0.4f);
        bool floorAhead = Physics2D.Raycast(feetAhead, Vector2.down, ledgeRayLength, groundMask).collider != null;
        bool wallAhead = Physics2D.Raycast(transform.position, new Vector2(facing, 0f), wallRayLength, groundMask).collider != null;
        if (wallAhead) return true;
        if (!floorAhead && !(canDropOffLedges && currentState == State.Chase)) return true;
        return false;
    }

    bool ReachedWaypoint()
    {
        return Mathf.Abs(targetWaypoint.position.x - transform.position.x) <= waypointTolerance;
    }

    void Face(float dx)
    {
        if (Mathf.Abs(dx) < 0.01f) return;
        facing = dx > 0f ? 1 : -1;
        Vector3 s = transform.localScale;
        s.x = Mathf.Abs(s.x) * facing;
        transform.localScale = s;
    }

    // ---------------- taking hits ----------------
    public void TakeHit(HitInfo hit)
    {
        health -= hit.damage;
        if (health <= 0) { Die(); return; }

        bool armored = superArmorWhileAttacking && (currentState == State.Anticipation || currentState == State.Attack);
        if (armored) return;

        rb.velocity = hit.knockback * (1f - knockbackResistance);
        if (hit.source != null) Face(hit.source.transform.position.x - transform.position.x);   // turn toward the attacker
        lastSeenTime = Time.time;
        ChangeState(State.Recoil);
    }

    void Die()
    {
        if (Died != null) Died(this);
        if (attackHitbox != null) attackHitbox.enabled = false;
        enabled = false;
        Destroy(gameObject, 0.05f);
    }

    // ---------------- dealing damage ----------------
    // Trigger callbacks from child colliders also reach this Rigidbody2D's GameObject.
    void OnTriggerStay2D(Collider2D other)
    {
        if (!other.CompareTag("Player")) return;
        IDamageable target = other.GetComponentInParent<IDamageable>();
        if (target == null) return;
        bool strike = currentState == State.Attack && attackHitbox != null && attackHitbox.enabled && attackHitbox.IsTouching(other);
        int dmg = strike ? attackDamage : contactDamage;
        if (dmg > 0) target.TakeDamage(dmg, transform.position);   // the player's invulnerability window prevents repeats
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, sightRange);
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, attackRange);
        if (waypointA != null && waypointB != null)
        {
            Gizmos.color = Color.cyan;
            Gizmos.DrawLine(waypointA.position, waypointB.position);
        }
        if (ledgeCheck != null)
        {
            Gizmos.color = Color.green;
            Gizmos.DrawLine(ledgeCheck.position, ledgeCheck.position + Vector3.down * ledgeRayLength);
        }
    }
}
