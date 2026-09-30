using UnityEngine;

// Ground enemy brain organised like a PlayMaker FSM: one switch over currentState.
// Patrol between two waypoints -> Chase when the player is seen -> Attack when close.
[RequireComponent(typeof(Rigidbody2D))]
public class EnemyAI : MonoBehaviour
{
    public enum State { Patrol, Chase, Attack }

    [Header("Patrol")]
    public Transform waypointA;
    public Transform waypointB;
    public float patrolSpeed = 1.5f;
    public float waypointTolerance = 0.15f;

    [Header("Chase")]
    public Transform player;
    public float chaseSpeed = 4f;
    public float sightRange = 8f;
    public float loseSightTime = 1.2f;          // keep chasing this long after losing sight
    public LayerMask obstacleMask;              // walls and ground that block the view
    public Transform eyes;                      // ray origin; falls back to transform

    [Header("Attack")]
    public float attackRange = 1.4f;
    public float windupTime = 0.45f;
    public float lungeSpeed = 9f;
    public float lungeTime = 0.3f;
    public float recoverTime = 0.5f;
    public int damage = 1;
    public Collider2D attackHitbox;             // enabled only during the lunge

    [Header("Debug")]
    public State currentState = State.Patrol;

    Rigidbody2D rb;
    Animator anim;
    Transform targetWaypoint;
    float stateTimer;
    float lastSeenTime = -999f;
    int facing = 1;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        anim = GetComponent<Animator>();
        targetWaypoint = waypointB != null ? waypointB : waypointA;
        if (attackHitbox != null) attackHitbox.enabled = false;
        if (player == null)
        {
            GameObject p = GameObject.FindGameObjectWithTag("Player");
            if (p != null) player = p.transform;
        }
    }

    void Update()
    {
        stateTimer += Time.deltaTime;
        bool sees = CanSeePlayer();
        if (sees) lastSeenTime = Time.time;

        switch (currentState)
        {
            case State.Patrol:
                if (sees) { ChangeState(State.Chase); break; }
                break;

            case State.Chase:
                if (player == null) { ChangeState(State.Patrol); break; }
                if (Mathf.Abs(player.position.x - transform.position.x) <= attackRange && Mathf.Abs(player.position.y - transform.position.y) < 1.5f)
                {
                    ChangeState(State.Attack);
                    break;
                }
                if (Time.time - lastSeenTime > loseSightTime) ChangeState(State.Patrol);
                break;

            case State.Attack:
                float lungeEnd = windupTime + lungeTime;
                if (stateTimer >= windupTime && stateTimer < lungeEnd)
                {
                    if (attackHitbox != null && !attackHitbox.enabled) attackHitbox.enabled = true;
                }
                else if (attackHitbox != null && attackHitbox.enabled)
                {
                    attackHitbox.enabled = false;
                }
                if (stateTimer >= lungeEnd + recoverTime) ChangeState(sees ? State.Chase : State.Patrol);
                break;
        }
    }

    void FixedUpdate()
    {
        Vector2 v = rb.velocity;
        switch (currentState)
        {
            case State.Patrol:
                if (targetWaypoint == null) { v.x = 0f; break; }
                float dx = targetWaypoint.position.x - transform.position.x;
                if (Mathf.Abs(dx) <= waypointTolerance)
                {
                    targetWaypoint = targetWaypoint == waypointA ? waypointB : waypointA;
                    dx = targetWaypoint != null ? targetWaypoint.position.x - transform.position.x : 0f;
                }
                Face(dx);
                v.x = facing * patrolSpeed;
                break;

            case State.Chase:
                Face(player.position.x - transform.position.x);
                v.x = facing * chaseSpeed;
                break;

            case State.Attack:
                if (stateTimer < windupTime) v.x = 0f;                                   // telegraph
                else if (stateTimer < windupTime + lungeTime) v.x = facing * lungeSpeed;  // strike
                else v.x = Mathf.MoveTowards(v.x, 0f, 40f * Time.fixedDeltaTime);         // recover
                break;
        }
        rb.velocity = v;
    }

    void ChangeState(State next)
    {
        currentState = next;
        stateTimer = 0f;
        if (next == State.Attack && player != null) Face(player.position.x - transform.position.x);
        if (anim != null) anim.SetInteger("State", (int)next);
    }

    // Distance check first, then a raycast so walls block the view.
    bool CanSeePlayer()
    {
        if (player == null) return false;
        Vector2 origin = eyes != null ? (Vector2)eyes.position : (Vector2)transform.position;
        Vector2 toPlayer = (Vector2)player.position - origin;
        float dist = toPlayer.magnitude;
        if (dist > sightRange) return false;
        RaycastHit2D hit = Physics2D.Raycast(origin, toPlayer / dist, dist, obstacleMask);
        return hit.collider == null;
    }

    void Face(float dx)
    {
        if (Mathf.Abs(dx) < 0.01f) return;
        facing = dx > 0 ? 1 : -1;
        Vector3 s = transform.localScale;
        s.x = Mathf.Abs(s.x) * facing;
        transform.localScale = s;
    }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (attackHitbox == null || !attackHitbox.enabled || !other.CompareTag("Player")) return;
        other.SendMessage("TakeDamage", damage, SendMessageOptions.DontRequireReceiver);
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
    }
}
