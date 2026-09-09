'use client';

import { useEffect, useState } from 'react';

function base64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function NotificationSettings({ currentLoc, authenticatedUser, showToast }) {
  const [permission, setPermission] = useState('default');
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState({ dailyWeatherEnabled: true, heavyRainEnabled: true, severeWeatherEnabled: true });
  const [busy, setBusy] = useState(false);

  if (!authenticatedUser) return null;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setPermission(Notification.permission);
  }, []);

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
        preferences,
      }),
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Unable to save notifications.');
  };

  const handleEnable = async () => {
    if (!authenticatedUser) {
      showToast?.('Please log in before enabling notifications.');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      showToast?.('Push notifications are not supported in this browser.');
      return;
    }
    setBusy(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') return;
      const configResponse = await fetch('/api/notifications/config');
      const { publicKey } = await configResponse.json();
      if (!publicKey) throw new Error('Push notifications are not configured on the server.');
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey) });
      await saveSubscription(pushSubscription);
      setEnabled(true);
      showToast?.('Notifications enabled.');
    } catch (error) {
      showToast?.(error.message || 'Unable to enable notifications.');
    } finally {
      setBusy(false);
    }
  };

  const handlePreferenceChange = async (name) => {
    const nextPreferences = { ...preferences, [name]: !preferences[name] };
    setPreferences(nextPreferences);
    if (!enabled || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setBusy(true);
        await saveSubscription(subscription);
      }
    } catch (error) {
      showToast?.(error.message || 'Unable to update notification settings.');
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/notifications/test', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to send test notification.');
      showToast?.('Test notification sent.');
    } catch (error) {
      showToast?.(error.message);
    } finally {
      setBusy(false);
    }
  };

  const blocked = permission === 'denied';
  return (
    <section className="notification-settings" aria-label="Weather notifications">
      <div className="notification-settings-heading">
        <span className="notification-settings-logo">🌦️</span>
        <div>
          <h3>Weather Notifications</h3>
          <p>{blocked ? 'Notifications blocked. Enable them in browser settings.' : enabled ? 'Notifications enabled' : 'Get a short forecast when it matters.'}</p>
        </div>
      </div>
      {!enabled && !blocked && <button className="header-btn active notification-enable-btn" onClick={handleEnable} disabled={busy}>{busy ? 'Enabling...' : 'Enable Notifications'}</button>}
      {blocked && <p className="notification-blocked">Please allow notifications in your browser settings, then reload WeatherGPT.</p>}
      {enabled && (
        <>
          <label className="notification-option"><input type="checkbox" checked={preferences.dailyWeatherEnabled} onChange={() => handlePreferenceChange('dailyWeatherEnabled')} /> Daily weather at 7:00 AM</label>
          <label className="notification-option"><input type="checkbox" checked={preferences.heavyRainEnabled} onChange={() => handlePreferenceChange('heavyRainEnabled')} /> Heavy rain alerts</label>
          <label className="notification-option"><input type="checkbox" checked={preferences.severeWeatherEnabled} onChange={() => handlePreferenceChange('severeWeatherEnabled')} /> Severe weather alerts</label>
          <button className="header-btn notification-test-btn" onClick={handleTest} disabled={busy}>Send Test Notification</button>
        </>
      )}
    </section>
  );
}