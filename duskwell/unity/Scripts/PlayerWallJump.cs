using UnityEngine;

// Mantis-claw style wall cling and wall jump. PlayerController2D calls ApplySlide and
// TryWallJump inside its own FixedUpdate, so the order of physics steps is always the same.
//
// Setup: on the player next to PlayerController2D. "wallMask" is usually the Ground layer.
[RequireComponent(typeof(PlayerController2D))]
public class PlayerWallJump : MonoBehaviour
{
    [Tooltip("Off until the ability is found (AbilityPickup turns it on).")]
    public bool unlocked = false;
    public LayerMask wallMask;

    [Header("Wall sensors")]
    [Tooltip("Horizontal distance from the player's centre to each sensor; about half the body width plus a hair.")]
    public float sensorOffsetX = 0.38f;
    [Tooltip("Size of each sensor box. Tall and thin, shorter than the body so ledges do not count.")]
    public Vector2 sensorSize = new Vector2(0.08f, 0.8f);

    [Header("Cling and jump")]
    [Tooltip("Maximum fall speed while clinging, in units per second.")]
    public float slideSpeed = 2.5f;
    [Tooltip("x = push away from the wall, y = upward speed.")]
    public Vector2 wallJumpVelocity = new Vector2(8f, 15f);
    [Tooltip("Seconds the push away ignores input, so the player clears the wall before steering back.")]
    public float inputLockTime = 0.15f;
    [Tooltip("Grace period after letting go of a wall during which a jump still counts as a wall jump.")]
    public float wallCoyoteTime = 0.1f;
    [Tooltip("Only cling while holding toward the wall (Hollow Knight behaviour).")]
    public bool requireHoldTowardWall = true;

    public bool IsSliding { get; private set; }
    public int WallSide { get; private set; }          // -1 wall on the left, 1 on the right, 0 none
    public event System.Action WallJumped;

    PlayerController2D controller;
    float coyoteTimer;
    int lastWallSide;

    void Awake() { controller = GetComponent<PlayerController2D>(); }

    int DetectWall()
    {
        Vector2 p = transform.position;
        bool right = Physics2D.OverlapBox(p + new Vector2(sensorOffsetX, 0f), sensorSize, 0f, wallMask) != null;
        bool left = Physics2D.OverlapBox(p + new Vector2(-sensorOffsetX, 0f), sensorSize, 0f, wallMask) != null;
        return right ? 1 : left ? -1 : 0;
    }

    // Called every physics step by the controller, after gravity and before velocity is applied.
    public void ApplySlide(ref Vector2 v)
    {
        bool wasSliding = IsSliding;
        IsSliding = false;
        WallSide = 0;
        coyoteTimer -= Time.fixedDeltaTime;
        if (!unlocked || controller.IsGrounded) return;

        int side = DetectWall();
        WallSide = side;
        if (side == 0) return;

        bool holdingToward = Mathf.Abs(controller.MoveInput) > 0.1f && (controller.MoveInput > 0f ? 1 : -1) == side;
        if (requireHoldTowardWall && !holdingToward) return;

        coyoteTimer = wallCoyoteTime;
        lastWallSide = side;
        if (v.y > 0f) return;                   // still rising: touch the wall but do not cling yet

        IsSliding = true;
        if (v.y < -slideSpeed) v.y = -slideSpeed;
        controller.FaceDirection(-side);
        if (!wasSliding) controller.ResetAirActions();   // clinging refills dash and double jump
    }

    // Called by the controller when a buffered jump cannot be a ground jump.
    public bool TryWallJump(ref Vector2 v)
    {
        if (!unlocked || controller.IsGrounded || coyoteTimer <= 0f || lastWallSide == 0) return false;
        v = new Vector2(-lastWallSide * wallJumpVelocity.x, wallJumpVelocity.y);
        controller.ApplyRecoil(new Vector2(v.x, 0f), inputLockTime);   // y = 0 keeps the jump speed set here
        controller.FaceDirection(-lastWallSide);
        controller.ResetAirActions();
        coyoteTimer = 0f;
        IsSliding = false;
        if (WallJumped != null) WallJumped();
        return true;
    }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = IsSliding ? Color.green : Color.yellow;
        Vector3 p = transform.position;
        Gizmos.DrawWireCube(p + new Vector3(sensorOffsetX, 0f, 0f), sensorSize);
        Gizmos.DrawWireCube(p - new Vector3(sensorOffsetX, 0f, 0f), sensorSize);
    }
}
