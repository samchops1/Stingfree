import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

const NOTIFICATION_PERMISSION_KEY = 'sting-free-notification-permission-requested';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  // Check if push notifications are supported
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  // Check if user is already subscribed
  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, []);

  // Convert base64 VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');

      if (result === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive important alerts about regulatory incidents.',
        });
        return true;
      } else if (result === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings to receive alerts.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Permission Error',
        description: 'Failed to request notification permission.',
        variant: 'destructive',
      });
      return false;
    }
    return false;
  }, [isSupported, toast]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    try {
      // Request permission first if not granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return false;
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push manager
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: pushSubscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push subscription');
      }

      setSubscription(pushSubscription);
      setIsSubscribed(true);

      toast({
        title: 'Notifications Active',
        description: 'You\'re now subscribed to real-time compliance alerts.',
      });

      return true;
    } catch (error: any) {
      console.error('Error subscribing to push:', error);

      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to subscribe to notifications.',
        variant: 'destructive',
      });

      return false;
    }
  }, [permission, requestPermission, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      setSubscription(null);
      setIsSubscribed(false);

      toast({
        title: 'Notifications Disabled',
        description: 'You\'ve unsubscribed from push notifications.',
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);

      toast({
        title: 'Unsubscribe Failed',
        description: 'Failed to unsubscribe from notifications.',
        variant: 'destructive',
      });

      return false;
    }
  }, [subscription, toast]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      toast({
        title: 'Test Sent',
        description: 'Check your notifications for the test message.',
      });

      return true;
    } catch (error) {
      console.error('Error sending test notification:', error);

      toast({
        title: 'Test Failed',
        description: 'Failed to send test notification.',
        variant: 'destructive',
      });

      return false;
    }
  }, [toast]);

  // Check if we should prompt for permission (only once)
  const shouldPrompt = useCallback(() => {
    return (
      isSupported &&
      permission === 'default' &&
      !localStorage.getItem(NOTIFICATION_PERMISSION_KEY)
    );
  }, [isSupported, permission]);

  return {
    isSupported,
    isSubscribed,
    subscription,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    shouldPrompt,
  };
}
