using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

// Moves the player between rooms: fade out, load the target scene if needed, place the
// player at the matching door, clamp the camera to the new room, give the entry motion, fade in.
public class RoomManager : MonoBehaviour
{
    public static RoomManager Instance { get; private set; }

    public PlayerController2D player;
    public CameraFollow2D cameraFollow;
    public ScreenFader fader;

    [Tooltip("Seconds for each half of the fade.")]
    public float fadeTime = 0.25f;
    [Tooltip("Seconds the player walks in on their own after a side door.")]
    public float autoWalkTime = 0.3f;
    [Tooltip("Upward speed when arriving through a floor opening, enough to clear the ledge.")]
    public float upwardEntrySpeed = 16f;

    public bool IsTravelling { get; private set; }
    public event System.Action<string> RoomEntered;    // door id

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    public void Travel(RoomTransition from)
    {
        if (IsTravelling) return;
        StartCoroutine(TravelRoutine(from.targetScene, from.targetDoorId));
    }

    IEnumerator TravelRoutine(string scene, string doorId)
    {
        IsTravelling = true;
        player.MovementLocked = true;
        if (fader != null) yield return fader.FadeOut(fadeTime);

        yield return LoadSceneIfNeeded(scene);

        RoomTransition door = RoomTransition.Find(doorId);
        if (door == null) Debug.LogWarning("RoomManager: no door with id '" + doorId + "' in scene '" + scene + "'.");
        else Arrive(door);

        player.MovementLocked = false;
        if (fader != null) yield return fader.FadeIn(fadeTime);
        IsTravelling = false;
    }

    // Loads a scene unless it is already the active one. Also used by GameManager for bench respawns.
    public IEnumerator LoadSceneIfNeeded(string scene)
    {
        if (string.IsNullOrEmpty(scene) || scene == SceneManager.GetActiveScene().name) yield break;
        AsyncOperation op = SceneManager.LoadSceneAsync(scene);
        while (!op.isDone) yield return null;
    }

    void Arrive(RoomTransition door)
    {
        door.Disarm();
        player.Body.velocity = Vector2.zero;
        player.transform.position = door.SpawnPosition;
        if (cameraFollow != null && door.roomBounds != null) cameraFollow.SetBounds(door.roomBounds.bounds, true);

        switch (door.side)
        {
            case DoorSide.Left: player.AutoWalk(1, autoWalkTime); break;       // door on the left edge: walk right, into the room
            case DoorSide.Right: player.AutoWalk(-1, autoWalkTime); break;
            case DoorSide.Bottom: player.Launch(new Vector2(0f, upwardEntrySpeed)); break;
            case DoorSide.Top: break;                                          // falls in under gravity
        }
        if (RoomEntered != null) RoomEntered(door.doorId);
    }
}
