// Mock Notifications Service
// Replace with expo-notifications + push service

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "reminder" | "motivation" | "community" | "task";
  read: boolean;
  createdAt: string;
}
const mockNotifications: Notification[] = [
  {
    id: "n1",
    title: "Morning Mantra Ready",
    body: "Start your day with today's empowering mantra.",
    type: "motivation",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Task Due Soon",
    body: "Team standup presentation is due in 1 hour.",
    type: "task",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "n3",
    title: "New Community Reply",
    body: "Jessica replied to your post about screen time.",
    type: "community",
    read: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

class MockNotificationService {
  async getNotifications(): Promise<Notification[]> {
    return [...mockNotifications];
  }

  async markAsRead(id: string): Promise<void> {
    const notif = mockNotifications.find((n) => n.id === id);
    if (notif) notif.read = true;
  }

  async getUnreadCount(): Promise<number> {
    return mockNotifications.filter((n) => !n.read).length;
  }

  async scheduleReminder(title: string, body: string, triggerAt: Date): Promise<string> {
    console.log(`[Mock] Scheduled reminder: "${title}" at ${triggerAt.toISOString()}`);
    return `notif_${Date.now()}`;
  }
}

export const notificationService = new MockNotificationService();
