#!/usr/bin/env bash
# Builds duskwell.apk without Android Studio or the Android SDK manager.
# Needs only a JDK (17+), python3, curl and unzip. Tools are fetched once into .tools/ from
# Maven Central and GitHub: aapt2 (bundled in apktool), android.jar API 34, dx, apksig.
#
#   ./build-apk.sh                 -> duskwell.apk signed with the public sideload key
#   KEYSTORE=my.jks ALIAS=me PASS=secret ./build-apk.sh   -> signed with your own key
set -euo pipefail
cd "$(dirname "$0")"

VERSION_CODE="${VERSION_CODE:-21}"
VERSION_NAME="${VERSION_NAME:-3.0}"
PACKAGE="com.duskwell.game"
KEYSTORE="${KEYSTORE:-sideload.keystore}"
ALIAS="${ALIAS:-duskwell}"
PASS="${PASS:-duskwell}"
T="${TOOLS_DIR:-$PWD/.tools}"
B="$PWD/build"
mkdir -p "$T"

fetch() { [ -s "$T/$1" ] || { echo ">> downloading $1"; curl -fsSL -o "$T/$1" "$2"; }; }
fetch apktool-lib.jar https://repo.maven.apache.org/maven2/org/apktool/apktool-lib/3.0.3/apktool-lib-3.0.3.jar
fetch android.jar     https://raw.githubusercontent.com/Sable/android-platforms/master/android-34/android.jar
fetch dx.jar          https://repo.maven.apache.org/maven2/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar
fetch apksig.jar      https://repo.maven.apache.org/maven2/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar
[ -x "$T/aapt2" ] || { unzip -o -q -j "$T/apktool-lib.jar" prebuilt/linux/aapt2 -d "$T" && chmod +x "$T/aapt2"; }

rm -rf "$B" && mkdir -p "$B/assets/www" "$B/gen" "$B/classes" "$B/dex" "$B/signer"

echo ">> copying the game"
cp ../duskwell/index.html "$B/assets/www/"
cp -r ../duskwell/js "$B/assets/www/js"
# painted backgrounds and the recorded score (the composing and painting tools stay out of the app)
cp -r ../duskwell/art "$B/assets/www/art"
rm -rf "$B/assets/www/art/source"          # the artist's source sheets and cut pieces stay in the repo, not in the app
cp -r ../duskwell/audio "$B/assets/www/audio"
cp -r fonts "$B/assets/www/fonts"
# web fonts come from the APK instead of Google, so the app works offline
python3 - "$B/assets/www/index.html" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
s = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', s)
s, n = re.subn(r'<link href="https://fonts\.googleapis\.com[^>]*>', '<link href="fonts/fonts.css" rel="stylesheet">', s)
assert n == 1, 'font link not found'
open(p, 'w', encoding='utf-8').write(s)
PY

echo ">> compiling resources"
"$T/aapt2" compile --dir app/src/main/res -o "$B/res.zip"
sed "s#<manifest #<manifest package=\"$PACKAGE\" #" app/src/main/AndroidManifest.xml > "$B/AndroidManifest.xml"
"$T/aapt2" link -o "$B/base.apk" -I "$T/android.jar" --manifest "$B/AndroidManifest.xml" \
  --min-sdk-version 26 --target-sdk-version 34 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -A "$B/assets" --java "$B/gen" "$B/res.zip"

echo ">> compiling Java"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$T/android.jar" -d "$B/classes" \
  $(find app/src/main/java "$B/gen" -name '*.java')
java -cp "$T/dx.jar" com.android.dx.command.Main --dex --min-sdk-version=26 --output="$B/dex/classes.dex" "$B/classes"

echo ">> packaging, aligning and signing"
cp "$B/base.apk" "$B/unaligned.apk"
(cd "$B/dex" && zip -q "$B/unaligned.apk" classes.dex)
python3 tools/zipalign.py "$B/unaligned.apk" "$B/aligned.apk"
javac -nowarn -cp "$T/apksig.jar" -d "$B/signer" tools/SignApk.java
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
  --add-exports java.base/sun.security.util=ALL-UNNAMED -cp "$T/apksig.jar:$B/signer" SignApk "$KEYSTORE" "$ALIAS" "$PASS" "$B/aligned.apk" duskwell.apk
echo ">> done: $(pwd)/duskwell.apk ($(du -h duskwell.apk | cut -f1))"
