using System.Collections.Generic;
using UnityEngine;

// Everything written when the player rests at a bench.
[System.Serializable]
public class SaveData
{
    public string benchId;
    public float benchX, benchY;
    public int maxMasks = 5;
    public bool hasDoubleJump;
    public int deaths;
    public float playTime;
    public List<string> flags = new List<string>();    // defeated bosses, collected items, opened gates
}

// JSON in PlayerPrefs: works on every platform without file permissions.
public static class SaveSystem
{
    const string Key = "duskwell_save_v1";

    public static bool HasSave => PlayerPrefs.HasKey(Key);

    public static void Save(SaveData data)
    {
        PlayerPrefs.SetString(Key, JsonUtility.ToJson(data));
        PlayerPrefs.Save();
    }

    public static SaveData Load()
    {
        if (!HasSave) return null;
        SaveData data = JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(Key));
        if (data != null && data.flags == null) data.flags = new List<string>();
        return data;
    }

    public static void Delete()
    {
        PlayerPrefs.DeleteKey(Key);
        PlayerPrefs.Save();
    }
}
