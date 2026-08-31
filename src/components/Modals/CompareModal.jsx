'use client';

import { useState } from 'react';
import { geocodeAddress } from '@/lib/geocoding';
import { fetchGoogleCurrentWeather, fetchOpenMeteoData, normalizeGoogleWeather, normalizeOpenMeteoWeather, getWeatherEmoji } from '@/lib/weatherApi';

export default function CompareModal({
  isOpen,
  onClose,
  currentLoc,
  weather,
  i18n,
  showToast
}) {
  const [compareCityQuery, setCompareCityQuery] = useState('');
  const [compareWeatherData, setCompareWeatherData] = useState(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);

  if (!isOpen) return null;

  const handleFetchCompareCity = async (targetCity) => {
    const query = (targetCity !== undefined ? targetCity : compareCityQuery).trim();
    if (!query) {
      if (showToast) showToast('Please enter a city name to compare.');
      return;
    }

    setIsCompareLoading(true);
    const geo = await geocodeAddress(query);

    if (geo) {
      let compW = null;
      try {
        const curRes = await fetchGoogleCurrentWeather(geo.lat, geo.lng);
        compW = normalizeGoogleWeather(curRes, geo.city, []);
      } catch (gErr) {
        console.warn('Google Weather compare request failed, using Open-Meteo:', gErr);
        try {
          const meteo = await fetchOpenMeteoData(geo.lat, geo.lng);
          compW = normalizeOpenMeteoWeather(meteo, geo.city);
        } catch (mErr) {
          console.error('All compare weather providers failed:', mErr);
        }
      }

      if (compW) {
        setCompareWeatherData(compW);
        if (showToast) showToast(`✅ Comparison loaded for ${compW.city}`);
      } else {
        setCompareWeatherData(null);
        if (showToast) showToast(`Failed to fetch weather for "${geo.city}".`);
      }
    } else {
      if (showToast) showToast(`Could not find "${query}". Try cities like Mumbai, Chennai, Kolkata.`);
    }
    setIsCompareLoading(false);
  };

  const quickCities = ['Mumbai', 'Chennai', 'Kolkata', 'Bengaluru', 'Jaipur', 'Hyderabad'];

  return (
    <div className="compare-backdrop" onClick={onClose}>
      <div className="compare-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="compare-modal-header">
          <h2 className="compare-modal-title">
            <span>⚖️</span> {i18n.compareTitle}
          </h2>
          <button className="compare-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="compare-cities-grid">
          {/* Current City Column */}
          <div className="compare-card">
            <div className="compare-card-title">
              <span>📍</span> {i18n.compareCityCurrent}: <strong>{currentLoc.city}</strong>
            </div>
            {weather ? (
              <div>
                <div className="compare-metric-row">
                  <span className="metric-label">Condition</span>
                  <span className="metric-value">{getWeatherEmoji(weather.condition)} {weather.condition}</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">Temperature</span>
                  <span className="metric-value">{weather.temp}°C (Feels {weather.feelsLike}°C)</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">{i18n.humidity}</span>
                  <span className="metric-value">💧 {weather.humidity}%</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">{i18n.wind}</span>
                  <span className="metric-value">💨 {weather.windSpeed} km/h ({weather.windDirection})</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">{i18n.uv}</span>
                  <span className="metric-value">☀️ {weather.uvIndex}</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">Visibility</span>
                  <span className="metric-value">👁️ {weather.visibility} km</span>
                </div>
              </div>
            ) : (
              <div className="compare-loading-text">Loading current city weather...</div>
            )}
          </div>

          {/* Comparison City Column */}
          <div className="compare-card">
            <div className="compare-card-title">
              <span>🏙️</span> {i18n.compareCitySecond}
            </div>
            <div className="compare-search-row">
              <input
                type="text"
                className="compare-search-input"
                placeholder={i18n.compareInputPlaceholder}
                value={compareCityQuery}
                onChange={(e) => setCompareCityQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchCompareCity()}
              />
              <button
                className="compare-submit-btn"
                onClick={() => handleFetchCompareCity()}
                disabled={isCompareLoading}
              >
                {isCompareLoading ? '...' : i18n.compareBtn}
              </button>
            </div>
            <div className="compare-quick-chips">
              {quickCities.map((c) => (
                <span
                  key={c}
                  className="compare-quick-chip"
                  onClick={() => {
                    setCompareCityQuery(c);
                    handleFetchCompareCity(c);
                  }}
                >
                  {c}
                </span>
              ))}
            </div>

            {isCompareLoading ? (
              <div className="compare-loading-text">Fetching weather data...</div>
            ) : compareWeatherData ? (
              <div>
                <div className="compare-metric-row">
                  <span className="metric-label">City</span>
                  <span className="metric-value">📍 {compareWeatherData.city}</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">Condition</span>
                  <span className="metric-value">{getWeatherEmoji(compareWeatherData.condition)} {compareWeatherData.condition}</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">Temperature</span>
                  <span className="metric-value">{compareWeatherData.temp}°C (Feels {compareWeatherData.feelsLike}°C)</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">{i18n.humidity}</span>
                  <span className="metric-value">💧 {compareWeatherData.humidity}%</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">{i18n.wind}</span>
                  <span className="metric-value">💨 {compareWeatherData.windSpeed} km/h ({compareWeatherData.windDirection})</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">{i18n.uv}</span>
                  <span className="metric-value">☀️ {compareWeatherData.uvIndex}</span>
                </div>
                <div className="compare-metric-row">
                  <span className="metric-label">Visibility</span>
                  <span className="metric-value">👁️ {compareWeatherData.visibility} km</span>
                </div>
              </div>
            ) : (
              <div className="compare-hint-text">
                Enter any Indian city above to see instant side-by-side weather comparisons.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
