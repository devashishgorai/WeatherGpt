'use client';

import { formatNativeNumber, getWeatherEmoji, formatClockTime, getElapsedTimeLabel } from '@/lib/weatherApi';

export default function WeatherWidget({
  weather,
  forecast,
  isLoadingWeather,
  lastUpdatedTime,
  refreshCountdown,
  selectedLanguage,
  i18n,
  onRefresh
}) {
  const countdownMinutes = Math.floor(refreshCountdown / 60);
  const countdownSeconds = String(refreshCountdown % 60).padStart(2, '0');

  return (
    <div className="sidebar-weather-widget" id="sidebar-weather-widget">
      {isLoadingWeather ? (
        <div>
          <div className="skeleton-block skel-temp"></div>
          <div className="skeleton-block skel-cond"></div>
          <div className="skeleton-block skel-stats"></div>
          <div className="skeleton-block skel-sun"></div>
        </div>
      ) : weather ? (
        <>
          <div className="widget-temp-row">
            <div className="widget-temp-large">{formatNativeNumber(weather.temp, selectedLanguage)}°</div>
            <div className="widget-temp-feels">{i18n.feelsLike} {formatNativeNumber(weather.feelsLike, selectedLanguage)}°</div>
          </div>
          <div className="widget-condition-text">
            <span>{getWeatherEmoji(weather.condition)}</span>
            <span>{weather.condition}</span>
          </div>
          <div className="widget-stats-grid">
            <div className="widget-stat-box">
              <div className="stat-val">💧 {formatNativeNumber(weather.humidity, selectedLanguage)}%</div>
              <div className="stat-lbl">{i18n.humidity}</div>
            </div>
            <div className="widget-stat-box">
              <div className="stat-val">💨 {formatNativeNumber(weather.windSpeed, selectedLanguage)}</div>
              <div className="stat-lbl">{i18n.wind}</div>
            </div>
            <div className="widget-stat-box">
              <div className="stat-val">☀️ {formatNativeNumber(weather.uvIndex, selectedLanguage)}</div>
              <div className="stat-lbl">{i18n.uv}</div>
            </div>
          </div>
          {forecast.daily?.length > 0 && (
            <div className="widget-sun-row">
              <span>🌅 {formatClockTime(forecast.daily[0]?.sunriseTime)} ({i18n.sunrise})</span>
              <span>🌇 {formatClockTime(forecast.daily[0]?.sunsetTime)} ({i18n.sunset})</span>
            </div>
          )}
          <div className="widget-footer-row">
            <span>{lastUpdatedTime ? getElapsedTimeLabel(lastUpdatedTime, selectedLanguage) : i18n.updated}</span>
            <button
              id="refresh-weather-btn"
              className={`widget-refresh-btn ${isLoadingWeather ? 'spinning' : ''}`}
              onClick={onRefresh}
              title="Refresh Live Weather"
            >
              <span className="spin-icon">🔄</span> {i18n.refresh}
            </button>
          </div>
          <div className="auto-refresh-countdown">
            {i18n.autoRefreshPrefix}{formatNativeNumber(countdownMinutes, selectedLanguage)}:{formatNativeNumber(countdownSeconds, selectedLanguage)}
          </div>
        </>
      ) : (
        <div className="weather-unavailable-msg">
          Weather data unavailable
        </div>
      )}
    </div>
  );
}
