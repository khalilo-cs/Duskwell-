using UnityEngine;

// Smooth follow for an orthographic 2D camera, kept inside the current room.
[RequireComponent(typeof(Camera))]
public class CameraFollow2D : MonoBehaviour
{
    public Transform target;
    public Vector2 offset = new Vector2(0f, 1f);
    public float lookAhead = 1.2f;              // shift toward the way the player faces
    public float smoothTimeX = 0.15f;
    public float smoothTimeY = 0.25f;
    public bool useSmoothDamp = true;           // false = Vector3.Lerp
    public float lerpSpeed = 7f;

    [Header("Room bounds (world units)")]
    public BoxCollider2D roomBounds;            // or call SetBounds from a room trigger
    Bounds bounds;
    bool hasBounds;

    Camera cam;
    Vector3 velocity;

    void Awake()
    {
        cam = GetComponent<Camera>();
        if (roomBounds != null) SetBounds(roomBounds.bounds);
    }

    public void SetBounds(Bounds b, bool snap = false)
    {
        bounds = b;
        hasBounds = true;
        if (snap && target != null)
        {
            transform.position = ClampToBounds(DesiredPosition());
            velocity = Vector3.zero;
        }
    }

    Vector3 DesiredPosition()
    {
        float face = Mathf.Sign(target.localScale.x);
        return new Vector3(target.position.x + offset.x + face * lookAhead, target.position.y + offset.y, transform.position.z);
    }

    void LateUpdate()
    {
        if (target == null) return;
        Vector3 goal = ClampToBounds(DesiredPosition());
        Vector3 next;
        if (useSmoothDamp)
        {
            next = transform.position;
            next.x = Mathf.SmoothDamp(transform.position.x, goal.x, ref velocity.x, smoothTimeX);
            next.y = Mathf.SmoothDamp(transform.position.y, goal.y, ref velocity.y, smoothTimeY);
        }
        else
        {
            next = Vector3.Lerp(transform.position, goal, 1f - Mathf.Exp(-lerpSpeed * Time.deltaTime));
        }
        transform.position = ClampToBounds(next);
    }

    // Keep the whole view inside the room; centre it when the room is smaller than the view.
    Vector3 ClampToBounds(Vector3 p)
    {
        if (!hasBounds) return p;
        float halfH = cam.orthographicSize;
        float halfW = halfH * cam.aspect;
        p.x = bounds.size.x <= halfW * 2f ? bounds.center.x : Mathf.Clamp(p.x, bounds.min.x + halfW, bounds.max.x - halfW);
        p.y = bounds.size.y <= halfH * 2f ? bounds.center.y : Mathf.Clamp(p.y, bounds.min.y + halfH, bounds.max.y - halfH);
        return p;
    }
}
