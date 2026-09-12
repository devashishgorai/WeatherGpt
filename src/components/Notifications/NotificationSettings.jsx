'use client';

import { useEffect, useRef } from 'react';

function base64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function NotificationSettings({ currentLoc, authenticatedUser, showToast }) {
  const subscribedLocation = useRef('');

  useEffect(() => {
    if (!authenticatedUser || currentLoc?.latitude == null || currentLoc?.longitude == null) return;

    const locationKey = `${currentLoc.latitude},${currentLoc.longitude}`;
    if (subscribedLocation.current === locationKey) return;

    const enableNotifications = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
      if (Notification.permission === 'denied') return;

      try {
        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
        if (permission !== 'granted') return;

        const configResponse = await fetch('/api/notifications/config');
        const { publicKey } = await configResponse.json();
        if (!publicKey) throw new Error('Push notifications are not configured on the server.');

        const registration = await navigator.serviceWorker.ready;
        const pushManager = registration.pushManager;
        const pushSubscription = await pushManager.getSubscription()
          || await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey) });
        await saveSubscription(pushSubscription);
        subscribedLocation.current = locationKey;
      } catch (error) {
        showToast?.(error.message || 'Unable to enable weather notifications.');
      }
    };

    enableNotifications();
  }, [authenticatedUser, currentLoc, showToast]);

  const saveSubscription = async (pushSubscription) => {
    if (currentLoc?.latitude == null || currentLoc?.longitude == null) throw new Error('Choose a weather location first.');
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: pushSubscription.toJSON(),
        location: {
          latitude: Number(currentLoc.latitude),
          longitude: Number(currentLoc.longitude),
          city: currentLoc.city || currentLoc.name || 'your area',
          country: currentLoc.country || '',
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        preferences: {
          dailyWeatherEnabled: true,
          heavyRainEnabled: true,
          severeWeatherEnabled: true,
        },
      }),
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Unable to save notifications.');
  };

  return null;
}