import { browserNotificationApi } from '@/api/client.browser';
import { NOTIFICATION_PANEL_SIZE } from '@/constants/checkout.constant';
import type { NotificationPage } from '@/interfaces/notification.interface';

const auth = (accessToken: string): { authorization: string } => ({
  authorization: `Bearer ${accessToken}`,
});

/** Latest notifications and the unread count; null when the service cannot be reached. */
export const latestNotifications = async (
  accessToken: string,
): Promise<NotificationPage | null> => {
  try {
    const { data } = await browserNotificationApi.GET('/api/v1/notifications', {
      params: { query: { pageSize: NOTIFICATION_PANEL_SIZE } },
      headers: auth(accessToken),
    });
    return data ?? null;
  } catch {
    return null;
  }
};

export const markAllNotificationsRead = async (accessToken: string): Promise<void> => {
  try {
    await browserNotificationApi.POST('/api/v1/notifications/read-all', {
      headers: auth(accessToken),
    });
  } catch {
    // The badge simply stays until the next refresh.
  }
};
