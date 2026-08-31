'use client';

export default function AlertBanner({ activeAlert, isDismissed, onDismiss }) {
  if (!activeAlert || isDismissed) return null;

  return (
    <div className={`alert-banner ${activeAlert.level}`} id="alert-banner">
      <div className="alert-text-group">
        <span>{activeAlert.text}</span>
      </div>
      <button
        className="alert-close-btn"
        onClick={onDismiss}
        title="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
}
