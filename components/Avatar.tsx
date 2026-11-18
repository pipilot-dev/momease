import { View, Text, Image } from "react-native";
import { initialsOf, avatarColor } from "../lib/avatar-core";

/** A person's picture, or (when they have none) their initials on a colour. Nothing is downloaded for the default. */
export function Avatar({ uri, name, size }: { uri?: string | null; name?: string | null; size: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View
      accessibilityLabel={name ? `${name}'s profile picture` : "Profile picture"}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name), alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: Math.round(size * 0.4), color: "rgba(0,0,0,0.55)" }}>{initialsOf(name)}</Text>
    </View>
  );
}
