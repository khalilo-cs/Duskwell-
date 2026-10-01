using System.Collections.Generic;
using UnityEngine;

// Which edge of the room this doorway sits on. It decides how the player enters through it:
// Left / Right walk in automatically, Bottom pops the player up, Top lets them fall in.
public enum DoorSide { Left, Right, Top, Bottom }

// A doorway at a room's edge. Touching it travels to "targetDoorId", in "targetScene"
// (or in this scene when targetScene is empty).
//
// Setup: a trigger collider covering the opening, a child "spawnPoint" one or two tiles
// inside the room (outside the trigger), and the BoxCollider2D that bounds this room.
[RequireComponent(typeof(Collider2D))]
public class RoomTransition : MonoBehaviour
{
    public string doorId = "town_well";
    [Tooltip("Scene to load. Leave empty when the target door is in the same scene.")]
    public string targetScene;
    public string targetDoorId;
    public DoorSide side = DoorSide.Right;
    public Transform spawnPoint;
    [Tooltip("Bounds of the room this door belongs to; the camera is clamped to it on arrival.")]
    public BoxCollider2D roomBounds;

    static readonly List<RoomTransition> active = new List<RoomTransition>();
    bool armed = true;

    public Vector3 SpawnPosition => spawnPoint != null ? spawnPoint.position : transform.position;

    public static RoomTransition Find(string id)
    {
        foreach (RoomTransition d in active) if (d.doorId == id) return d;
        return null;
    }

    void Reset() { GetComponent<Collider2D>().isTrigger = true; }
    void OnEnable() { active.Add(this); }
    void OnDisable() { active.Remove(this); }

    // After arriving here the door stays quiet until the player has stepped out of it.
    public void Disarm() { armed = false; }

    void OnTriggerEnter2D(Collider2D other)
    {
        if (!armed || !other.CompareTag("Player")) return;
        RoomManager rm = RoomManager.Instance;
        if (rm != null && !rm.IsTravelling) rm.Travel(this);
    }

    void OnTriggerExit2D(Collider2D other)
    {
        if (other.CompareTag("Player")) armed = true;
    }
}
