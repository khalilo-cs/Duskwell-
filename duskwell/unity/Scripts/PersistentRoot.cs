using UnityEngine;

// Keeps the player, camera, UI and managers alive across scene loads.
// Put this on ONE root object that contains them all. A second copy (from loading the
// first scene again) destroys itself, so there is always exactly one.
public class PersistentRoot : MonoBehaviour
{
    static PersistentRoot instance;

    void Awake()
    {
        if (instance != null && instance != this) { Destroy(gameObject); return; }
        instance = this;
        DontDestroyOnLoad(gameObject);
    }
}
