'use client';

export default function GpsOverlay({ gpsState, onAllowGps, onSkipGps }) {
  if (gpsState === 'prompt') {
    return (
      <div className="gps-overlay" id="gps-permission-overlay">
        <div className="gps-card">
          <div className="gps-icon-ring">📍</div>
          <h2 className="gps-title">Enable GPS Location</h2>
          <p className="gps-subtitle">
            WeatherGPT can automatically detect your exact location to show
            <strong> hyper-local, real-time weather</strong> for where you actually are — no typing needed.
          </p>
          <button
            id="gps-allow-btn"
            className="gps-allow-btn"
            onClick={onAllowGps}
          >
            🎯 Use My GPS Location
          </button>
          <button
            id="gps-skip-btn"
            className="gps-deny-btn"
            onClick={onSkipGps}
          >
            Not now — use New Delhi
          </button>
          <p className="gps-privacy-note">
            🔒 Your location is used only for weather data and is never stored or shared.
          </p>
        </div>
      </div>
    );
  }

  if (gpsState === 'waiting') {
    return (
      <div className="gps-overlay" id="gps-waiting-overlay">
        <div className="gps-card">
          <div className="gps-icon-ring">🛰️</div>
          <h2 className="gps-title">Acquiring GPS Signal…</h2>
          <p className="gps-subtitle">
            Please allow location access in your browser's permission popup.
            This usually takes just a few seconds.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <div className="gps-detecting-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
