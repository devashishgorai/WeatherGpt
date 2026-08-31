'use client';

import { getWeatherEmoji, formatHourLabel } from '@/lib/weatherApi';

export default function HourlyForecast({ forecast }) {
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
            {h.temp}°
          </div>
          <div className="hourly-rain-label">
            💧 {h.precipProb}%
          </div>
        </div>
      ))}
    </div>
  );
}
