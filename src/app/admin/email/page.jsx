'use client';

import { useState } from 'react';

export default function AdminEmailPage() {
  const [apiKey, setApiKey] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSending(true);
    setStatus('');

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ to, subject, text: message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to send email.');
      setStatus(result.message);
      setSubject('');
      setMessage('');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="admin-email-page">
      <form className="admin-email-form" onSubmit={handleSubmit}>
        <h1>Send WeatherGPT email</h1>
        <p>Use the server admin key to send a message through the configured Gmail or SMTP account.</p>
        <label htmlFor="admin-key">Admin API key</label>
        <input id="admin-key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required />
        <label htmlFor="email-to">Recipient</label>
        <input id="email-to" type="email" value={to} onChange={(event) => setTo(event.target.value)} required />
        <label htmlFor="email-subject">Subject</label>
        <input id="email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} required />
        <label htmlFor="email-message">Message</label>
        <textarea id="email-message" rows="8" value={message} onChange={(event) => setMessage(event.target.value)} required />
        <button type="submit" disabled={isSending}>{isSending ? 'Sending...' : 'Send email'}</button>
        {status && <p role="status">{status}</p>}
      </form>
    </main>
  );
}