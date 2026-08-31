'use client';

export default function MessageBubble({
  msg,
  i18n,
  isSpeaking,
  translatedText,
  onToggleListen,
  onCopyText,
  onShareWeather,
  onToggleTranslate
}) {
  const isAi = msg.role === 'assistant';

  return (
    <div className={`message-row ${isAi ? 'ai' : 'user'}`}>
      <div className="message-content-wrapper">
        <div className="message-bubble">
          {msg.content}
        </div>

        {isAi && (
          <div className="assistant-extras-wrap">
            {translatedText && (
              <div className="translation-box">
                <div className="translation-header">🇬🇧 English Translation</div>
                <div className="translation-text">{translatedText}</div>
              </div>
            )}

            <div className="message-actions-row">
              <button
                className="msg-action-chip"
                onClick={() => onToggleListen(msg)}
                title="Listen to message in voice"
              >
                {isSpeaking ? i18n.stop : i18n.listen}
              </button>
              <button
                className="msg-action-chip"
                onClick={() => onToggleTranslate(msg)}
                title="Translate to English"
              >
                {i18n.translate}
              </button>
              <button
                className="msg-action-chip"
                onClick={() => onCopyText(msg)}
                title="Copy text"
              >
                {i18n.copy}
              </button>
              <button
                className="msg-action-chip"
                onClick={() => onShareWeather(msg)}
                title="Share weather report"
              >
                {i18n.share}
              </button>
            </div>
          </div>
        )}

        <div className="message-meta-row">
          <span>{msg.time}</span>
          {isAi && msg.source && (
            <span className="message-source-badge">
              {msg.source === 'open-meteo' ? '📡 Open-Meteo' : '🌐 Google Weather'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
