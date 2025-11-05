import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// VAPID keys for Web Push (these should be stored in environment variables in production)
// Generate new keys with: node -e "console.log(require('web-push').generateVAPIDKeys())"
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNxJ8f8KqZ4Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'VAPID_PRIVATE_KEY_PLACEHOLDER';
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:support@stingfree.app';

// Configure web-push
webpush.setVAPIDDetails(
  VAPID_MAILTO,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  vibrate?: number[];
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribeToPush(
  userId: string,
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  userAgent?: string
) {
  try {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userAgent,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .returning();
      return updated;
    } else {
      // Create new subscription
      const [created] = await db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userAgent,
          isActive: true,
        })
        .returning();
      return created;
    }
  } catch (error) {
    console.error('Error subscribing to push:', error);
    throw error;
  }
}

/**
 * Unsubscribe a user from push notifications
 */
export async function unsubscribeFromPush(endpoint: string) {
  try {
    const [updated] = await db
      .update(pushSubscriptions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    throw error;
  }
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId: string, payload: PushNotificationPayload) {
  try {
    // Get all active subscriptions for the user
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.isActive, true)
      ));

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload),
            {
              TTL: 60 * 60 * 24, // 24 hours
            }
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          // If subscription is invalid/expired, mark as inactive
          if (error.statusCode === 410 || error.statusCode === 404) {
            await db
              .update(pushSubscriptions)
              .set({ isActive: false, updatedAt: new Date() })
              .where(eq(pushSubscriptions.endpoint, sub.endpoint));
          }
          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { total: subscriptions.length, successful, failed, results };
  } catch (error) {
    console.error('Error sending push to user:', error);
    throw error;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(userIds: string[], payload: PushNotificationPayload) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushToUser(userId, payload))
  );

  const totalSent = results
    .filter(r => r.status === 'fulfilled')
    .reduce((acc: number, r: any) => acc + r.value.successful, 0);

  return {
    totalUsers: userIds.length,
    totalNotificationsSent: totalSent,
    results,
  };
}

/**
 * Send push notification to all managers within a geofence
 */
export async function sendGeofencedAlert(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  payload: PushNotificationPayload
) {
  try {
    const { storage } = await import('./storage');

    console.log(`Sending geofenced alert to managers within ${radiusMiles} miles of (${latitude}, ${longitude})`);

    // Get all managers within the geofence
    const managersInRange = await storage.getManagersWithinGeofence(latitude, longitude, radiusMiles);

    if (managersInRange.length === 0) {
      console.log('No managers found within geofence');
      return { success: true, managerCount: 0, notificationsSent: 0 };
    }

    const managerIds = managersInRange.map(m => m.id);
    console.log(`Found ${managerIds.length} managers within geofence`);

    // Send notifications to all managers
    const result = await sendPushToUsers(managerIds, payload);

    return {
      success: true,
      managerCount: managersInRange.length,
      notificationsSent: result.totalNotificationsSent,
      details: result,
    };
  } catch (error) {
    console.error('Error sending geofenced alert:', error);
    throw error;
  }
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVAPIDPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Test function to verify push notifications are working
 */
export async function sendTestNotification(userId: string) {
  const payload: PushNotificationPayload = {
    title: 'Sting Free Test',
    body: 'Push notifications are working! You\'re all set.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'test-notification',
    data: {
      url: '/dashboard',
      type: 'test',
    },
  };

  return sendPushToUser(userId, payload);
}
