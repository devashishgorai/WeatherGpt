'use client';

import { PERSONA_CONFIG, LANG_OPTIONS } from '@/lib/constants';
import WeatherWidget from './WeatherWidget';

export default function Sidebar({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  searchInput,
  setSearchInput,
  onSearch,
  searchHistory,
  currentLoc,
  gpsState,
  isDetectingLoc,
  onDetectLocation,
  selectedPersona,
  setSelectedPersona,
  selectedLanguage,
  setSelectedLanguage,
  i18n,
  weather,
  forecast,
  isLoadingWeather,
  lastUpdatedTime,
  refreshCountdown,
  onRefreshWeather
}) {
  return (
    <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`} id="app-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo-row">
          <span className="brand-icon">⛈️</span>
          <span className="brand-title">WeatherGPT</span>
        </div>
        <div className="brand-tagline">{i18n.tagline}</div>
      </div>

      {/* Location Section */}
      <div className="sidebar-section">
        <div className="section-heading">{i18n.location}</div>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            id="city-search-input"
            className="location-input"
            type="text"
            placeholder={i18n.searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch(searchInput)}
          />
        </div>
        <button
          id="detect-location-btn"
          className={`detect-loc-btn ${gpsState === 'granted' ? 'gps-granted' : gpsState === 'denied' ? 'gps-denied' : ''}`}
          onClick={onDetectLocation}
          disabled={isDetectingLoc || gpsState === 'waiting'}
          title={
            gpsState === 'granted' ? 'GPS Active — click to re-detect' :
            gpsState === 'denied'  ? 'GPS denied — click to try again'  :
            gpsState === 'waiting' ? 'Detecting GPS location…' :
            'Detect my GPS location'
          }
        >
          {
            gpsState === 'waiting'  ? i18n.detecting :
            gpsState === 'granted'  ? ('✅ GPS: ' + currentLoc.city) :
            gpsState === 'denied'   ? '❌ GPS denied — retry?' :
            i18n.detectLoc
          }
        </button>
        <div className="current-location-tag">
          <span className="pulse-dot"></span>
          <div className="current-location-info">
            <div className="current-location-name">
              <span>{currentLoc.city}</span>
              {currentLoc.isGps && <span className="gps-active-badge">GPS</span>}
            </div>
            {currentLoc.lat && currentLoc.lng && (
              <div className="current-location-coords">
                <span>{currentLoc.lat.toFixed(2)}°N, {currentLoc.lng.toFixed(2)}°E</span>
                {currentLoc.detail && <span> · {currentLoc.detail}</span>}
              </div>
            )}
          </div>
        </div>
        {searchHistory.length > 0 && (
          <div className="search-history-chips">
            {searchHistory.map((city) => (
              <span
                key={city}
                className="history-chip"
                onClick={() => onSearch(city)}
                title={`Switch to ${city}`}
              >
                {city}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Persona Section */}
      <div className="sidebar-section">
        <div className="section-heading">{i18n.iAmA}</div>
        <div className="persona-grid">
          {Object.entries(PERSONA_CONFIG).map(([key, config]) => (
            <button
              key={key}
              id={`persona-${key}`}
              className={`persona-card ${selectedPersona === key ? 'active' : ''}`}
              onClick={() => setSelectedPersona(key)}
            >
              <span className="persona-card-emoji">{config.emoji}</span>
              <span>{i18n.personas[key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Section */}
      <div className="sidebar-section">
        <div className="section-heading">{i18n.language}</div>
        <select
          id="language-select"
          className="language-dropdown"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          {Object.entries(LANG_OPTIONS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Weather Widget */}
      <WeatherWidget
        weather={weather}
        forecast={forecast}
        isLoadingWeather={isLoadingWeather}
        lastUpdatedTime={lastUpdatedTime}
        refreshCountdown={refreshCountdown}
        selectedLanguage={selectedLanguage}
        i18n={i18n}
        onRefresh={onRefreshWeather}
      />
    </aside>
  );
}
