'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'weathergpt-pwa-install-dismissed';
const DISMISSAL_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY));
    return dismissedAt > Date.now() - DISMISSAL_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return undefined;

    if (isIos()) {
      setShowPrompt(true);
      setShowIosInstructions(true);
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage can be unavailable in private browsing.
    }
    setShowPrompt(false);
    setInstallPrompt(null);
  };

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setShowPrompt(false);
    setInstallPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <aside className="pwa-install-prompt" role="dialog" aria-label="Install WeatherGPT">
      <div className="pwa-install-copy">
        <strong>Install WeatherGPT</strong>
        <span>{showIosInstructions ? 'Tap Share, then Add to Home Screen.' : 'Get a faster, app-like experience on your device.'}</span>
      </div>
      <div className="pwa-install-actions">
        {showIosInstructions ? (
          <button type="button" className="pwa-install-button" onClick={dismiss}>Got it</button>
        ) : (
          <button type="button" className="pwa-install-button" onClick={install}>Install</button>
        )}
        <button type="button" className="pwa-dismiss-button" onClick={dismiss}>Not now</button>
      </div>
    </aside>
  );
}
