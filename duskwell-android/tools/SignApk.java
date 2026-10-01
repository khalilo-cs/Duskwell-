import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;

import java.io.File;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

/**
 * Signs an APK with APK Signature Scheme v2 using Google's apksig library, then verifies it.
 * v1 (JAR signing) is off: every Android version this app supports (8.0+) checks v2, and the
 * v1 code in apksig 2.3.0 depends on JDK internals that newer JDKs removed.
 * Usage: java -cp apksig.jar:. SignApk keystore alias password in.apk out.apk
 */
public class SignApk {
    public static void main(String[] a) throws Exception {
        if (a.length != 5) {
            System.err.println("usage: SignApk keystore alias password in.apk out.apk");
            System.exit(2);
        }
        char[] pass = a[2].toCharArray();
        KeyStore ks = KeyStore.getInstance(new File(a[0]), pass);
        PrivateKey key = (PrivateKey) ks.getKey(a[1], pass);
        X509Certificate cert = (X509Certificate) ks.getCertificate(a[1]);
        if (key == null || cert == null) throw new IllegalArgumentException("alias not found: " + a[1]);

        ApkSigner.SignerConfig signer =
            new ApkSigner.SignerConfig.Builder("CERT", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(signer))
            .setInputApk(new File(a[3]))
            .setOutputApk(new File(a[4]))
            .setMinSdkVersion(26)
            .setV1SigningEnabled(false)
            .setV2SigningEnabled(true)
            .build()
            .sign();

        ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[4])).build().verify();
        System.out.println("verified=" + r.isVerified()
            + " v1=" + r.isVerifiedUsingV1Scheme() + " v2=" + r.isVerifiedUsingV2Scheme());
        if (!r.isVerified()) {
            for (Object e : r.getErrors()) System.err.println("error: " + e);
            System.exit(1);
        }
    }
}
