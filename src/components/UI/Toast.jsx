'use client';

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="toast-notification">
      <span>{message}</span>
    </div>
  );
}
