'use client';

import { formatNativeNumber, getWeatherEmoji, formatDayLabel } from '@/lib/weatherApi';

export default function SevenDayForecast({ forecast, selectedLanguage, i18n }) {
  const daily = forecast.daily || [];
  if (daily.length === 0) return null;

  return (
    <div className="forecast-slider-container" id="seven-day-container">
      {daily.map((d, idx) => {
        const p = d.precipProb || 0;
        const rainClass = p > 60 ? 'high' : p > 30 ? 'med' : 'low';
        const fillWidth = `${Math.max(p, 4)}%`;

        return (
          <div key={idx} className="daily-forecast-card">
            <div className="daily-day-label">
              {formatDayLabel(d.date, idx, selectedLanguage)}
            </div>
            <div className="daily-emoji-icon">
              {getWeatherEmoji(d.condition)}
            </div>
            <div className="daily-temp-row">
              <span>{formatNativeNumber(d.maxTemp, selectedLanguage)}°</span>
              <span className="daily-min-temp">{formatNativeNumber(d.minTemp, selectedLanguage)}°</span>
            </div>
            <div className="rain-bar-track">
              <div className={`rain-bar-fill ${rainClass}`} style={{ width: fillWidth }}></div>
            </div>
            <div className="daily-subtext">
              💧 {formatNativeNumber(d.precipProb, selectedLanguage)}% {i18n.rainChance}
            </div>
          </div>
        );
      })}
    </div>
  );
}
