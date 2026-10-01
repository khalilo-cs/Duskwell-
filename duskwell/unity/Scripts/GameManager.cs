using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

// Owns the run: death sequence, respawn at the last bench (in whatever scene it is),
// saving and loading, abilities and world flags.
//
// Setup: on the persistent root (see PersistentRoot) next to RoomManager. Drag in the
// player's components, the ScreenFader, the CameraFollow2D and the bench where a new game starts.
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Player")]
    public PlayerHealth playerHealth;
    public PlayerController2D playerController;
    public PlayerSoul playerSoul;
    public PlayerDash playerDash;
    public PlayerWallJump playerWallJump;

    [Header("World")]
    public CameraFollow2D cameraFollow;
    public ScreenFader fader;
    [Tooltip("Bench in the first scene where a new game begins.")]
    public Bench startBench;

    [Header("Death sequence")]
    [Tooltip("Real seconds of slow motion right after the killing blow.")]
    public float deathSlowMotionTime = 0.8f;
    [Range(0.05f, 1f)] public float deathTimeScale = 0.3f;
    [Tooltip("Real seconds the screen stays black before respawning.")]
    public float blackHoldTime = 0.5f;

    public int Deaths { get; private set; }
    public float PlayTime { get; private set; }
    public string CurrentBenchId => benchId;

    readonly HashSet<string> flags = new HashSet<string>();
    string benchScene, benchId;
    Vector3 benchPosition;
    bool busy;

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(this); return; }
        Instance = this;
    }

    void OnEnable() { if (playerHealth != null) playerHealth.Died += OnPlayerDied; }
    void OnDisable() { if (playerHealth != null) playerHealth.Died -= OnPlayerDied; }

    void Start()
    {
        SaveData data = SaveSystem.Load();
        if (data != null) Apply(data);
        else RecordBench(startBench);
        StartCoroutine(PlaceAtBench());
    }

    void Update() { PlayTime += Time.unscaledDeltaTime; }

    // ---------------- flags ----------------
    public bool HasFlag(string id) => flags.Contains(id);
    public void SetFlag(string id) { flags.Add(id); }

    // ---------------- benches ----------------
    void RecordBench(Bench bench)
    {
        if (bench == null) return;
        benchScene = bench.gameObject.scene.name;
        benchId = bench.benchId;
        benchPosition = bench.SitPosition;
    }

    public void RestAt(Bench bench)
    {
        RecordBench(bench);
        playerHealth.Heal(playerHealth.maxMasks);
        if (playerSoul != null) playerSoul.AddSoul(playerSoul.maxSoul);
        SaveSystem.Save(Capture());
    }

    // Loads the bench's scene if needed, then puts the player on it with full health.
    IEnumerator PlaceAtBench()
    {
        if (RoomManager.Instance != null) yield return RoomManager.Instance.LoadSceneIfNeeded(benchScene);
        else if (!string.IsNullOrEmpty(benchScene) && benchScene != SceneManager.GetActiveScene().name)
        {
            AsyncOperation op = SceneManager.LoadSceneAsync(benchScene);
            while (!op.isDone) yield return null;
        }
        Bench bench = Bench.Find(benchId);
        playerHealth.RespawnAt(bench != null ? bench.SitPosition : benchPosition);
        if (cameraFollow != null && bench != null && bench.roomBounds != null) cameraFollow.SetBounds(bench.roomBounds.bounds, true);
    }

    // ---------------- save data ----------------
    SaveData Capture()
    {
        return new SaveData
        {
            benchScene = benchScene,
            benchId = benchId,
            benchX = benchPosition.x,
            benchY = benchPosition.y,
            maxMasks = playerHealth.maxMasks,
            hasDoubleJump = playerController.hasDoubleJump,
            hasDash = playerDash != null && playerDash.unlocked,
            hasWallJump = playerWallJump != null && playerWallJump.unlocked,
            deaths = Deaths,
            playTime = PlayTime,
            flags = new List<string>(flags)
        };
    }

    void Apply(SaveData d)
    {
        benchScene = d.benchScene;
        benchId = d.benchId;
        benchPosition = new Vector3(d.benchX, d.benchY, 0f);
        playerHealth.maxMasks = d.maxMasks;
        playerController.hasDoubleJump = d.hasDoubleJump;
        if (playerDash != null) playerDash.unlocked = d.hasDash;
        if (playerWallJump != null) playerWallJump.unlocked = d.hasWallJump;
        Deaths = d.deaths;
        PlayTime = d.playTime;
        flags.Clear();
        foreach (string f in d.flags) flags.Add(f);
    }

    // ---------------- death ----------------
    void OnPlayerDied()
    {
        if (!busy) StartCoroutine(DeathSequence());
    }

    IEnumerator DeathSequence()
    {
        busy = true;
        Deaths++;
        HitStop.Cancel();
        Time.timeScale = deathTimeScale;                       // the killing blow lingers
        yield return new WaitForSecondsRealtime(deathSlowMotionTime);
        if (fader != null) yield return fader.FadeOut();
        Time.timeScale = 1f;
        yield return PlaceAtBench();
        yield return new WaitForSecondsRealtime(blackHoldTime);
        if (fader != null) yield return fader.FadeIn();
        busy = false;
    }

    public void NewGame()
    {
        SaveSystem.Delete();
        flags.Clear();
        Deaths = 0;
        PlayTime = 0f;
        if (playerDash != null) playerDash.unlocked = false;
        if (playerWallJump != null) playerWallJump.unlocked = false;
        playerController.hasDoubleJump = false;
        RecordBench(startBench);
        StartCoroutine(PlaceAtBench());
    }
}
