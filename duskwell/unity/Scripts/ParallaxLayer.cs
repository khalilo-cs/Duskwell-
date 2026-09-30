using UnityEngine;

// Attach to a background (or foreground) sprite. Its Z position is its depth:
// z > 0 is behind the play plane and moves slower than the camera, z < 0 is in front and moves faster.
// Screen speed = cameraDistance / (cameraDistance + z), the same ratio a perspective camera would give.
public class ParallaxLayer : MonoBehaviour
{
    public Transform cameraTransform;
    [Tooltip("Distance from the camera to the play plane (z = 0), in world units.")]
    public float cameraDistance = 10f;
    [Tooltip("Scales vertical parallax; 2D backgrounds usually look best below 1.")]
    public float verticalFactor = 0.5f;
    [Tooltip("Repeat the sprite horizontally so the layer never runs out.")]
    public bool infiniteX = true;

    Vector3 startPos;
    Vector3 camStart;
    float spriteWidth;

    void Start()
    {
        if (cameraTransform == null && Camera.main != null) cameraTransform = Camera.main.transform;
        startPos = transform.position;
        camStart = cameraTransform.position;
        SpriteRenderer sr = GetComponent<SpriteRenderer>();
        if (sr != null) spriteWidth = sr.bounds.size.x;
    }

    // Fraction of the camera's movement this layer copies. Far layers copy most of it and look slow.
    public float Follow
    {
        get
        {
            float z = transform.position.z;
            return z / (cameraDistance + z);
        }
    }

    void LateUpdate()
    {
        Vector3 camDelta = cameraTransform.position - camStart;
        float f = Follow;
        transform.position = new Vector3(
            startPos.x + camDelta.x * f,
            startPos.y + camDelta.y * f * verticalFactor,
            startPos.z);

        if (infiniteX && spriteWidth > 0f)
        {
            // how far the camera has moved relative to this layer
            float rel = camDelta.x * (1f - f);
            if (rel > startPos.x - camStart.x + spriteWidth) startPos.x += spriteWidth;
            else if (rel < startPos.x - camStart.x - spriteWidth) startPos.x -= spriteWidth;
        }
    }
}
