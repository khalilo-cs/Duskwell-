using System.Collections;
using System.Collections.Generic;
using UnityEngine;

// ---------------- shared combat types ----------------

public enum AttackDirection { Side, Up, Down }

public struct HitInfo
{
    public int damage;
    public Vector2 knockback;          // velocity (units/s) the target should take
    public AttackDirection direction;
    public GameObject source;
}

// Anything the nail can damage (enemies, breakable walls, switches).
public interface IHittable
{
    void TakeHit(HitInfo hit);
}

// Anything enemies can damage (the player).
public interface IDamageable
{
    void TakeDamage(int amount, Vector2 sourcePosition);
}

// ---------------- nail attacks, pogo and recoil ----------------
//
// Setup: three child GameObjects under the player, each with a BoxCollider2D (Is Trigger)
// and a NailHitbox component: one in front (Side), one above (Up), one below (Down).
// Because PlayerController2D flips localScale.x, the Side box mirrors automatically.
// Put enemies and hazards on layers included in "hittableLayers"; tag spikes "Hazard".
[RequireComponent(typeof(PlayerController2D))]
public class PlayerCombat : MonoBehaviour
{
    [Header("Input")]
    [Tooltip("Input Manager button used to strike.")]
    public string attackButton = "Fire1";

    [Header("Hitboxes (child trigger colliders)")]
    public NailHitbox sideHitbox;
    public NailHitbox upHitbox;
    public NailHitbox downHitbox;
    public LayerMask hittableLayers;

    [Header("Timing")]
    [Tooltip("Seconds the hitbox stays enabled. Short = precise, readable swings.")]
    public float activeTime = 0.1f;
    [Tooltip("Seconds between swings (Hollow Knight's default nail is about 0.41).")]
    public float attackCooldown = 0.38f;
    [Tooltip("A press this early is remembered and fires as soon as the cooldown ends.")]
    public float inputBufferTime = 0.1f;

    [Header("Damage")]
    public int nailDamage = 5;
    [Tooltip("Speed given to an enemy along the swing direction.")]
    public float enemyKnockback = 9f;

    [Header("Nail bounce (pogo)")]
    [Tooltip("Upward speed after a downward strike connects in the air. Replaces vertical velocity instantly.")]
    public float pogoVelocity = 15f;

    [Header("Player recoil on side hits")]
    [Tooltip("Horizontal speed pushing the player away from what was struck.")]
    public float recoilSpeed = 6f;
    [Tooltip("Seconds the recoil overrides movement input.")]
    public float recoilTime = 0.08f;

    [Header("Hit stop")]
    [Tooltip("Real-time seconds the game freezes on a hit. 0 disables it.")]
    public float hitStopTime = 0.05f;

    // Raised for every target struck: use it to add soul, play sparks, shake the camera.
    public event System.Action<HitInfo, Collider2D> HitLanded;

    PlayerController2D controller;
    float cooldownTimer;
    float bufferTimer;
    AttackDirection currentDirection;
    NailHitbox activeBox;
    readonly HashSet<Collider2D> struckThisSwing = new HashSet<Collider2D>();
    bool bouncedThisSwing;
    bool recoiledThisSwing;
    bool inHitStop;

    public bool IsAttacking => activeBox != null;
    public AttackDirection CurrentDirection => currentDirection;

    void Awake()
    {
        controller = GetComponent<PlayerController2D>();
        foreach (NailHitbox box in new[] { sideHitbox, upHitbox, downHitbox })
            if (box != null) box.Init(this);
    }

    void Update()
    {
        cooldownTimer -= Time.deltaTime;
        bufferTimer -= Time.deltaTime;
        if (Input.GetButtonDown(attackButton)) bufferTimer = inputBufferTime;
        if (bufferTimer > 0f && cooldownTimer <= 0f) StartAttack();
    }

    void StartAttack()
    {
        bufferTimer = 0f;
        cooldownTimer = attackCooldown;

        // Up while holding up; down only in the air (like Hollow Knight); otherwise forward.
        float v = Input.GetAxisRaw("Vertical");
        if (v > 0.5f) currentDirection = AttackDirection.Up;
        else if (v < -0.5f && !controller.IsGrounded) currentDirection = AttackDirection.Down;
        else currentDirection = AttackDirection.Side;

        struckThisSwing.Clear();
        bouncedThisSwing = false;
        recoiledThisSwing = false;

        NailHitbox box = currentDirection == AttackDirection.Up ? upHitbox
                       : currentDirection == AttackDirection.Down ? downHitbox
                       : sideHitbox;
        if (box != null) StartCoroutine(Swing(box));
    }

    IEnumerator Swing(NailHitbox box)
    {
        if (activeBox != null) activeBox.SetActive(false);
        activeBox = box;
        box.SetActive(true);
        yield return new WaitForSeconds(activeTime);   // scaled time: hit stop also pauses the swing
        box.SetActive(false);
        if (activeBox == box) activeBox = null;
    }

    // Called by NailHitbox for every collider the active hitbox touches.
    public void OnNailContact(Collider2D other)
    {
        if (activeBox == null) return;
        if (((1 << other.gameObject.layer) & hittableLayers.value) == 0) return;
        if (!struckThisSwing.Add(other)) return;          // each collider once per swing

        int facing = controller.Facing;
        Vector2 dir = currentDirection == AttackDirection.Side ? new Vector2(facing, 0f)
                    : currentDirection == AttackDirection.Up ? Vector2.up
                    : Vector2.down;

        HitInfo hit = new HitInfo
        {
            damage = nailDamage,
            knockback = dir * enemyKnockback,
            direction = currentDirection,
            source = gameObject
        };

        bool connected = false;
        IHittable target = other.GetComponentInParent<IHittable>();
        if (target != null)
        {
            target.TakeHit(hit);
            connected = true;
        }
        else if (other.CompareTag("Hazard"))
        {
            connected = true;                              // spikes can be pogoed but take no damage
        }
        if (!connected) return;

        if (HitLanded != null) HitLanded(hit, other);

        // Nail bounce: a downward strike in the air launches the player and refills air actions.
        if (currentDirection == AttackDirection.Down && !controller.IsGrounded && !bouncedThisSwing)
        {
            bouncedThisSwing = true;
            controller.Bounce(pogoVelocity);
        }
        // Recoil: a sideways strike pushes the player back once per swing.
        else if (currentDirection == AttackDirection.Side && !recoiledThisSwing)
        {
            recoiledThisSwing = true;
            controller.ApplyRecoil(new Vector2(-facing * recoilSpeed, 0f), recoilTime);
        }

        if (hitStopTime > 0f && !inHitStop) StartCoroutine(HitStop());
    }

    IEnumerator HitStop()
    {
        inHitStop = true;
        float previous = Time.timeScale;
        Time.timeScale = 0f;
        yield return new WaitForSecondsRealtime(hitStopTime);
        Time.timeScale = previous > 0f ? previous : 1f;
        inHitStop = false;
    }

    void OnDisable()
    {
        if (inHitStop) { Time.timeScale = 1f; inHitStop = false; }
    }
}
