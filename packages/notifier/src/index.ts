import type { INotificationService, NotificationParams, NotificationPreferences } from '@visapilot/shared';

export class NotificationService implements INotificationService {
  async send(params: NotificationParams): Promise<boolean> {
    console.log(`[Notification] Sending ${params.type} to ${params.userId}: ${params.title}`);
    return true;
  }

  async sendBatch(params: NotificationParams[]): Promise<boolean[]> {
    return Promise.all(params.map((p) => this.send(p)));
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    return {
      email: true,
      push: true,
      inApp: true,
      types: {
        JOB_MATCH: true,
        APPLICATION_UPDATE: true,
        INTERVIEW_REMINDER: true,
        VISA_ALERT: true,
        RESUME_TIP: false,
      },
    };
  }

  async updateUserPreferences(
    _userId: string,
    preferences: NotificationPreferences,
  ): Promise<void> {
    console.log('[Notification] Preferences updated:', preferences);
  }
}

export const notificationService = new NotificationService();
