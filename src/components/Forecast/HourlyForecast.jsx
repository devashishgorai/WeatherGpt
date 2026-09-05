'use client';

import { formatNativeNumber, getWeatherEmoji, formatHourLabel } from '@/lib/weatherApi';

export default function HourlyForecast({ forecast, selectedLanguage }) {
  const hourly = forecast.hourly || [];
  if (hourly.length === 0) return null;

  return (
    <div className="forecast-slider-container" id="twenty-four-hr-container">
      {hourly.map((h, idx) => (
        <div key={idx} className="hourly-forecast-card">
          <div className="hourly-time-label">
            {formatHourLabel(h.time)}
          </div>
          <div className="hourly-emoji-icon">
            {getWeatherEmoji(h.condition)}
          </div>
          <div className="hourly-temp-label">
            {formatNativeNumber(h.temp, selectedLanguage)}°
          </div>
          <div className="hourly-rain-label">
            💧 {formatNativeNumber(h.precipProb, selectedLanguage)}%
          </div>
        </div>
      ))}
    </div>
  );
}
