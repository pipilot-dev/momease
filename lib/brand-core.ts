// The app is branded MumEase on iPhone (the App Store owner's choice) and MomEase everywhere else.
export function brandFor(os: string): string {
  return os === "ios" ? "MumEase" : "MomEase";
}
