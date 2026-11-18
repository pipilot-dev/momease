// The app is branded Mease on iPhone (the App Store owner's choice) and MomEase everywhere else.
export function brandFor(os: string): string {
  return os === "ios" ? "Mease" : "MomEase";
}
