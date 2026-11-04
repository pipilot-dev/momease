import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { offersAppleSignIn } from "../lib/apple-auth-core";

type AppleModule = typeof import("expo-apple-authentication");

/**
 * Apple's own "Continue with Apple" button (required look, per Apple's guidelines). It renders only on an
 * iPhone/iPad where Sign in with Apple is available; on the web and Android it renders nothing.
 */
export function AppleSignInButton({ onPress, dark = false }: { onPress: () => void; dark?: boolean }) {
  const [apple, setApple] = useState<AppleModule | null>(null);

  useEffect(() => {
    if (!offersAppleSignIn(Platform.OS)) return;
    let cancelled = false;
    import("expo-apple-authentication")
      .then(async (m) => {
        if ((await m.isAvailableAsync()) && !cancelled) setApple(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!apple) return null;
  return (
    <View style={{ marginTop: 12 }}>
      <apple.AppleAuthenticationButton
        buttonType={apple.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={dark ? apple.AppleAuthenticationButtonStyle.WHITE : apple.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={16}
        style={{ width: "100%", height: 52 }}
        onPress={onPress}
      />
    </View>
  );
}
