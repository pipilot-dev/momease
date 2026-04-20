// Mock Analytics Service
// Replace with Mixpanel/Amplitude/PostHog

class MockAnalyticsService {
  async track(event: string, properties?: Record<string, unknown>): Promise<void> {
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, properties || "");
    }
  }

  async identify(userId: string, traits?: Record<string, unknown>): Promise<void> {
    if (__DEV__) {
      console.log(`[Analytics] Identify: ${userId}`, traits || "");
    }
  }

  async screen(name: string): Promise<void> {
    if (__DEV__) {
      console.log(`[Analytics] Screen: ${name}`);
    }
  }
}

export const analytics = new MockAnalyticsService();
