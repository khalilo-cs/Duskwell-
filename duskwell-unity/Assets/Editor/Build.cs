// Builds the Android app from the command line (GitHub Actions): makes the one empty scene the game starts from and builds it.
using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public static class Build {
  public static void Android() {
    string outPath = "build/Android/duskwell-unity.apk"; var args = Environment.GetCommandLineArgs();
    for (int i = 0; i < args.Length - 1; i++) if (args[i] == "-customBuildPath") outPath = args[i + 1];
    Directory.CreateDirectory("Assets/Scenes"); Directory.CreateDirectory(Path.GetDirectoryName(outPath));
    var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
    EditorSceneManager.SaveScene(scene, "Assets/Scenes/Main.unity");
    PlayerSettings.companyName = "Duskwell"; PlayerSettings.productName = "Duskwell Unity";
    PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, "com.duskwell.unity");
    PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
    PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.Mono2x);
    PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7;
    PlayerSettings.stripEngineCode = false;
    var report = BuildPipeline.BuildPlayer(new[] { "Assets/Scenes/Main.unity" }, outPath, BuildTarget.Android, BuildOptions.None);
    Debug.Log("Build: " + report.summary.result + " " + outPath);
    EditorApplication.Exit(report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded ? 0 : 1);
  }
}
// The pictures are used as they are painted: full size, no mip levels, not squeezed.
public class TexImport : AssetPostprocessor {
  void OnPreprocessTexture() {
    var t = (TextureImporter)assetImporter;
    t.textureType = TextureImporterType.Default; t.mipmapEnabled = false; t.npotScale = TextureImporterNPOTScale.None;
    t.maxTextureSize = 4096; t.textureCompression = TextureImporterCompression.CompressedHQ; t.alphaIsTransparency = true; t.wrapMode = TextureWrapMode.Clamp;
  }
  // music and the air of an area are played from the file as they go; the short sounds are kept ready
  void OnPreprocessAudio() {
    var a = (AudioImporter)assetImporter; var st = a.defaultSampleSettings; bool long_ = assetPath.Contains("/music/") || assetPath.Contains("/amb/");
    st.loadType = long_ ? AudioClipLoadType.Streaming : AudioClipLoadType.DecompressOnLoad; st.compressionFormat = AudioCompressionFormat.Vorbis; st.quality = 0.6f;
    a.defaultSampleSettings = st;
  }
}
