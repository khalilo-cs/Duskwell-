using UnityEngine;

// Mothwing-style dash: a fixed-speed horizontal burst with gravity switched off.
// One dash in the air, refilled by landing, clinging to a wall or a nail bounce.
//
// Setup: on the player next to PlayerController2D. Map a "Dash" button (or keep Fire3).
[RequireComponent(typeof(PlayerController2D), typeof(Rigidbody2D))]
public class PlayerDash : MonoBehaviour
{
    [Tooltip("Off until the ability is found (AbilityPickup turns it on).")]
    public bool unlocked = false;
    public string dashButton = "Fire3";

    [Tooltip("Units per second during the dash. Distance = speed x time (20 x 0.2 = 4 units).")]
    public float dashSpeed = 20f;
    public float dashTime = 0.2f;
    [Tooltip("Seconds from the start of one dash to the next (Hollow Knight is about 0.6).")]
    public float cooldown = 0.55f;
    [Tooltip("Dashes allowed before touching ground or a wall again.")]
    public int airDashes = 1;
    [Tooltip("Speed kept right after the dash ends; 0 stops dead, runSpeed feels natural.")]
    public bool keepRunSpeedAfter = true;

    public bool IsDashing { get; private set; }
    public event System.Action DashStarted;     // spawn the shadow trail / sound here
    public event System.Action DashEnded;

    PlayerController2D controller;
    Rigidbody2D rb;
    float timer;
    float cooldownTimer;
    int airDashesLeft;
    int dir = 1;
    float savedGravity;

    void Awake()
    {
        controller = GetComponent<PlayerController2D>();
        rb = GetComponent<Rigidbody2D>();
        airDashesLeft = airDashes;
    }

    void OnEnable() { if (controller != null) controller.AirActionsReset += Refill; }
    void OnDisable()
    {
        if (controller != null) controller.AirActionsReset -= Refill;
        if (IsDashing) EndDash();
    }

    void Refill() { airDashesLeft = airDashes; }

    void Update()
    {
        cooldownTimer -= Time.deltaTime;
        if (!unlocked || IsDashing || controller.MovementLocked || cooldownTimer > 0f) return;
        if (!Input.GetButtonDown(dashButton)) return;
        if (!controller.IsGrounded && airDashesLeft <= 0) return;
        StartDash();
    }

    void StartDash()
    {
        IsDashing = true;
        timer = dashTime;
        cooldownTimer = cooldown;
        if (!controller.IsGrounded) airDashesLeft--;

        // dash toward the held direction, otherwise the way the player faces
        float h = controller.MoveInput;
        dir = Mathf.Abs(h) > 0.1f ? (h > 0f ? 1 : -1) : controller.Facing;
        controller.FaceDirection(dir);

        savedGravity = rb.gravityScale;
        rb.gravityScale = 0f;
        rb.velocity = new Vector2(dir * dashSpeed, 0f);
        if (DashStarted != null) DashStarted();
    }

    void FixedUpdate()
    {
        if (!IsDashing) return;
        rb.velocity = new Vector2(dir * dashSpeed, 0f);    // hold the line: no gravity, no input
        timer -= Time.fixedDeltaTime;
        if (timer <= 0f) EndDash();
    }

    void EndDash()
    {
        IsDashing = false;
        rb.gravityScale = savedGravity;
        rb.velocity = new Vector2(keepRunSpeedAfter ? dir * controller.runSpeed : 0f, 0f);
        if (DashEnded != null) DashEnded();
    }
}
