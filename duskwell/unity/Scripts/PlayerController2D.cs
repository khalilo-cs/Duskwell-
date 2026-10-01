using UnityEngine;

// Snappy platformer movement in the style of Hollow Knight.
//
// Setup: Rigidbody2D (Dynamic), BoxCollider2D, a child Transform "groundCheck" at the feet,
// and a LayerMask containing your ground/platform layers. Input uses the classic Input Manager
// axes "Horizontal" and button "Jump" (swap ReadInput() if you use the new Input System).
//
// Unity 6 renamed Rigidbody2D.velocity to linearVelocity. On Unity 6 replace "rb.velocity" with "rb.linearVelocity".
[RequireComponent(typeof(Rigidbody2D), typeof(BoxCollider2D))]
public class PlayerController2D : MonoBehaviour
{
    [Header("Run")]
    [Tooltip("Top horizontal speed in units/second. Velocity is set directly, so there is no acceleration curve and no sliding.")]
    public float runSpeed = 8.3f;

    [Header("Jump shape")]
    [Tooltip("Height of a full (held) jump in units.")]
    public float jumpHeight = 3.6f;
    [Tooltip("Seconds to reach the top of a full jump. Smaller = snappier, heavier jump.")]
    public float timeToApex = 0.36f;
    [Tooltip("Multiplier on gravity while falling. 1 = symmetric arc; 1.5-2 removes the floaty feel.")]
    public float fallGravityMultiplier = 1.7f;
    [Tooltip("When jump is released while rising, vertical speed is multiplied by this (variable jump height). 0.4 = short hop on tap.")]
    [Range(0f, 1f)] public float jumpCutMultiplier = 0.4f;
    [Tooltip("Terminal fall speed in units/second.")]
    public float maxFallSpeed = 22f;

    [Header("Forgiveness")]
    [Tooltip("Seconds after walking off a ledge during which a jump still counts as grounded.")]
    public float coyoteTime = 0.1f;
    [Tooltip("Seconds a jump press is remembered before landing.")]
    public float jumpBufferTime = 0.12f;

    [Header("Air actions (optional abilities)")]
    public bool hasDoubleJump = false;
    [Tooltip("Double jump height as a fraction of the full jump height.")]
    public float doubleJumpHeightRatio = 0.75f;

    [Header("Ground check")]
    public Transform groundCheck;
    public Vector2 groundCheckSize = new Vector2(0.6f, 0.08f);
    public LayerMask groundMask;

    // ---- read by other scripts (combat, animation) ----
    public bool IsGrounded { get; private set; }
    public int Facing { get; private set; } = 1;
    public bool DoubleJumpAvailable { get; private set; }
    public Vector2 Velocity => rb.velocity;
    // Set by abilities that root the player in place (focus healing, benches, room changes).
    public bool MovementLocked { get; set; }
    public float MoveInput => moveInput;
    public Rigidbody2D Body => rb;
    // Raised on landing and on pogo; a dash script subscribes to refill its air charge.
    public event System.Action AirActionsReset;

    Rigidbody2D rb;
    float baseGravityScale;     // gravity scale that produces the requested jump arc
    float jumpVelocity;         // initial upward speed of a full jump
    float coyoteTimer;
    float jumpBufferTimer;
    float moveInput;
    bool jumpHeld;
    bool isJumping;             // rising because of a jump (jump cut only applies then)
    float controlLockTimer;     // recoil / knockback briefly overrides input
    Vector2 lockedVelocity;
    PlayerDash dash;            // optional ability modules on the same object
    PlayerWallJump wall;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();
        dash = GetComponent<PlayerDash>();
        wall = GetComponent<PlayerWallJump>();
        rb.interpolation = RigidbodyInterpolation2D.Interpolate;   // smooth rendering between physics steps
        rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
        rb.freezeRotation = true;
        RecalculateJump();
    }

    // Kinematics: for a jump of height h reaching the apex in time t,
    //   gravity g = 2h / t^2   and   launch speed v = 2h / t   (= g * t).
    // gravityScale is g divided by the project's gravity so the Rigidbody2D applies exactly g.
    public void RecalculateJump()
    {
        float g = 2f * jumpHeight / (timeToApex * timeToApex);
        jumpVelocity = g * timeToApex;
        baseGravityScale = g / Mathf.Abs(Physics2D.gravity.y);
        rb.gravityScale = baseGravityScale;
    }

    void OnValidate()
    {
        if (rb != null && timeToApex > 0f) RecalculateJump();
    }

    void Update()
    {
        ReadInput();
        bool clinging = wall != null && wall.IsSliding;                 // a clinging player faces away from the wall
        bool dashing = dash != null && dash.IsDashing;
        if (Mathf.Abs(moveInput) > 0.01f && controlLockTimer <= 0f && !MovementLocked && !clinging && !dashing) SetFacing(moveInput > 0 ? 1 : -1);

        // timers run in Update so short taps between physics steps are never lost
        coyoteTimer -= Time.deltaTime;
        jumpBufferTimer -= Time.deltaTime;
        controlLockTimer -= Time.deltaTime;
    }

    void ReadInput()
    {
        moveInput = Input.GetAxisRaw("Horizontal");
        if (Input.GetButtonDown("Jump")) jumpBufferTimer = jumpBufferTime;
        jumpHeld = Input.GetButton("Jump");
    }

    void FixedUpdate()
    {
        CheckGround();
        if (dash != null && dash.IsDashing) return;     // the dash owns velocity and gravity for its duration
        Vector2 v = rb.velocity;

        // ---- horizontal: instantaneous, no easing ----
        if (controlLockTimer > 0f) v.x = lockedVelocity.x;
        else if (MovementLocked) v.x = 0f;
        else v.x = moveInput * runSpeed;

        // ---- jumping ----
        if (jumpBufferTimer > 0f && !MovementLocked)
        {
            if (IsGrounded || coyoteTimer > 0f)
            {
                v.y = jumpVelocity;
                ConsumeJump();
            }
            else if (wall != null && wall.TryWallJump(ref v))        // wall jump beats double jump
            {
                ConsumeJump();
            }
            else if (hasDoubleJump && DoubleJumpAvailable)
            {
                // v = sqrt(2 g h') for the shorter second jump
                float g = baseGravityScale * Mathf.Abs(Physics2D.gravity.y);
                v.y = Mathf.Sqrt(2f * g * jumpHeight * doubleJumpHeightRatio);
                DoubleJumpAvailable = false;
                ConsumeJump();
            }
        }

        // ---- variable jump height: releasing early cuts the rise ----
        if (isJumping && !jumpHeld && v.y > 0f)
        {
            v.y *= jumpCutMultiplier;
            isJumping = false;
        }
        if (v.y <= 0f) isJumping = false;

        // ---- fall gravity scaling: heavier on the way down ----
        rb.gravityScale = v.y < 0f ? baseGravityScale * fallGravityMultiplier : baseGravityScale;
        if (wall != null) wall.ApplySlide(ref v);        // clinging caps the fall to a slow slide
        if (v.y < -maxFallSpeed) v.y = -maxFallSpeed;

        rb.velocity = v;
    }

    void ConsumeJump()
    {
        jumpBufferTimer = 0f;
        coyoteTimer = 0f;
        isJumping = true;
        IsGrounded = false;
    }

    void CheckGround()
    {
        bool was = IsGrounded;
        Vector2 p = groundCheck != null ? (Vector2)groundCheck.position : (Vector2)transform.position;
        // only count ground when not moving up through a one-way platform
        IsGrounded = rb.velocity.y <= 0.01f && Physics2D.OverlapBox(p, groundCheckSize, 0f, groundMask) != null;
        if (IsGrounded)
        {
            coyoteTimer = coyoteTime;
            if (!was) ResetAirActions();    // once per landing, not every physics step
        }
        else if (was && !isJumping)
        {
            coyoteTimer = coyoteTime;   // just walked off a ledge: start the grace window
        }
    }

    public void FaceDirection(int dir) { if (dir != 0) SetFacing(dir > 0 ? 1 : -1); }

    // Walk in a direction for a moment regardless of input (entering a room through a side door).
    public void AutoWalk(int dir, float duration)
    {
        FaceDirection(dir);
        ApplyRecoil(new Vector2(dir * runSpeed, 0f), duration);
    }

    // Replace the velocity outright (entering a room from below, launch pads).
    public void Launch(Vector2 velocity)
    {
        rb.velocity = velocity;
        isJumping = false;
    }

    void SetFacing(int dir)
    {
        Facing = dir;
        Vector3 s = transform.localScale;
        s.x = Mathf.Abs(s.x) * dir;
        transform.localScale = s;
    }

    // ---------------- API used by combat and hazards ----------------

    // Restores double jump (and anything else refilled on landing). Pogo calls this.
    public void ResetAirActions()
    {
        DoubleJumpAvailable = true;
        AirActionsReset?.Invoke();
    }

    // Nail bounce: instant upward impulse that replaces current vertical speed.
    public void Bounce(float upwardSpeed)
    {
        Vector2 v = rb.velocity;
        v.y = upwardSpeed;
        rb.velocity = v;
        isJumping = false;           // a bounce cannot be cut short by releasing jump
        ResetAirActions();
    }

    // Recoil / knockback: holds a horizontal velocity for a short time, ignoring input.
    public void ApplyRecoil(Vector2 velocity, float duration)
    {
        lockedVelocity = velocity;
        controlLockTimer = duration;
        if (velocity.y != 0f)
        {
            Vector2 v = rb.velocity;
            v.y = velocity.y;
            rb.velocity = v;
            isJumping = false;
        }
    }

    void OnDrawGizmosSelected()
    {
        if (groundCheck == null) return;
        Gizmos.color = IsGrounded ? Color.green : Color.red;
        Gizmos.DrawWireCube(groundCheck.position, groundCheckSize);
    }
}
