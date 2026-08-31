'use client';

import { getWeatherEmoji } from '@/lib/weatherApi';

export default function Header({
  currentLoc,
  weather,
  i18n,
  isCompareOpen,
  onOpenCompare,
  onClearChat,
  onOpenSettings
}) {
  return (
    <header className="main-header">
      <div className="header-left-info">
        <h1 className="header-city-title">
          <span>{weather ? getWeatherEmoji(weather.condition) : '📍'}</span>
          <span>{currentLoc.city}</span>
          {currentLoc.isGps && <span className="header-gps-pill">📍 Live GPS</span>}
          {weather && <span className="header-condition-pill">· {weather.condition}</span>}
        </h1>
      </div>
      <div className="header-actions-group">
        <button
          id="compare-mode-btn"
          className={`header-btn ${isCompareOpen ? 'active' : ''}`}
          onClick={onOpenCompare}
          title="Compare two Indian cities"
        >
          {i18n.compare}
        </button>
        <button
          id="settings-btn"
          className="header-btn"
          onClick={onOpenSettings}
          title="Configure API Keys (Claude / Gemini / OpenAI)"
        >
          {i18n.settings}
        </button>
        <button
          id="clear-chat-btn"
          className="header-btn"
          onClick={onClearChat}
          title="Clear Chat History"
        >
          {i18n.clear}
        </button>
      </div>
    </header>
  );
}
