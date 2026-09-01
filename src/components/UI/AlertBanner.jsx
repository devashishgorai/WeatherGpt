'use client';

export default function AlertBanner({ activeAlert, currentLoc, isDismissed, onDismiss }) {
  if (!activeAlert || isDismissed) return null;

  const origin = currentLoc && currentLoc.latitude != null && currentLoc.longitude != null
    ? `${currentLoc.latitude},${currentLoc.longitude}`
    : '';

  const destinationQuery = currentLoc?.city
    ? `nearest safe shelter in ${currentLoc.city}`
    : 'nearest safe shelter';

  const mapsHref = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destinationQuery)}`
    : `https://www.google.com/maps/search/${encodeURIComponent(destinationQuery)}`;

  return (
    <div className={`alert-banner ${activeAlert.level}`} id="alert-banner">
      <div className="alert-content">
        <div className="alert-main-row">
          <div className="alert-text-group">
            <span>{activeAlert.text}</span>
          </div>

          <div className="alert-actions">
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="alert-map-link"
              title="Open directions in Google Maps"
              aria-label="Open directions in Google Maps"
            >
              <img src="/google-maps.png" alt="Google Maps" className="maps-badge-icon" />
            </a>
            <button
              className="alert-close-btn"
              onClick={onDismiss}
              title="Dismiss alert"
            >
              ✕
            </button>
          </div>
        </div>

        {activeAlert.safeZone && (
          <div className="alert-safe-zone">
            <strong>Safe Zone:</strong> {activeAlert.safeZone}
          </div>
        )}
      </div>
    </div>
  );
}
