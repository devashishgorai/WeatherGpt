'use client';

import { PERSONA_CONFIG, LANG_OPTIONS } from '@/lib/constants';
import WeatherWidget from './WeatherWidget';

export default function Sidebar({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  searchInput,
  setSearchInput,
  onSearch,
  onLocationInputChange,
  onLocationKeyDown,
  locationSuggestions,
  isSearchingLocation,
  locationSearchError,
  showNoLocationResults,
  activeLocationIndex,
  onSuggestionSelect,
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
            role="combobox"
            aria-expanded={locationSuggestions.length > 0 || isSearchingLocation}
            aria-controls="location-search-suggestions"
            aria-autocomplete="list"
            aria-activedescendant={activeLocationIndex >= 0 ? `location-suggestion-${activeLocationIndex}` : undefined}
            onChange={(e) => onLocationInputChange(e.target.value)}
            onKeyDown={onLocationKeyDown}
          />
          {isSearchingLocation && <span className="search-loading-indicator">Searching…</span>}
          {locationSuggestions.length > 0 && (
            <div className="location-suggestions" id="location-search-suggestions" role="listbox">
              {locationSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.placeId || suggestion.formattedAddress || suggestion.name}-${index}`}
                  id={`location-suggestion-${index}`}
                  type="button"
                  className={`location-suggestion-item ${index === activeLocationIndex ? 'active' : ''}`}
                  role="option"
                  aria-selected={index === activeLocationIndex}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSuggestionSelect(suggestion);
                  }}
                >
                  <span className="location-suggestion-pin">📍</span>
                  <span className="location-suggestion-text">
                    <span className="location-suggestion-name">{suggestion.name}</span>
                    <span className="location-suggestion-meta">
                      {[
                        suggestion.city || suggestion.district,
                        suggestion.state,
                        suggestion.country
                      ].filter(Boolean).join(' · ') || suggestion.formattedAddress}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {!isSearchingLocation && !locationSearchError && searchInput.trim().length >= 2 && showNoLocationResults && (
            <div className="location-search-status">No locations found</div>
          )}
          {locationSearchError && (
            <div className="location-search-status error">{locationSearchError}</div>
          )}
        </div>
        <div className="current-location-tag">
          <span className="pulse-dot"></span>
          <div className="current-location-info">
            <div className="current-location-name">
              <span>{currentLoc.displayPrimary || currentLoc.city}</span>
              {currentLoc.isGps && <span className="gps-active-badge">GPS</span>}
            </div>
            {currentLoc.latitude != null && currentLoc.longitude != null && (
              <div className="current-location-coords">
                <span>{currentLoc.latitude.toFixed(2)}°N, {currentLoc.longitude.toFixed(2)}°E</span>
                {(currentLoc.displaySecondary || currentLoc.detail) && <span> · {currentLoc.displaySecondary || currentLoc.detail}</span>}
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
