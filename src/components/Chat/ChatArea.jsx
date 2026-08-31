'use client';

import { useEffect, useRef } from 'react';
import WelcomeState from './WelcomeState';
import MessageBubble from './MessageBubble';

export default function ChatArea({
  messages,
  backgroundTint,
  isTyping,
  currentLoc,
  i18n,
  activeSpeakingId,
  translatedMap,
  onSelectStarter,
  onToggleListen,
  onCopyText,
  onShareWeather,
  onToggleTranslate
}) {
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className={`chat-scroll-area ${backgroundTint}`} id="chat-scroll-area">
      {messages.length === 0 ? (
        <WelcomeState
          currentLoc={currentLoc}
          i18n={i18n}
          onSelectStarter={onSelectStarter}
        />
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              i18n={i18n}
              isSpeaking={activeSpeakingId === msg.id}
              translatedText={translatedMap[msg.id]}
              onToggleListen={onToggleListen}
              onCopyText={onCopyText}
              onShareWeather={onShareWeather}
              onToggleTranslate={onToggleTranslate}
            />
          ))}

          {isTyping && (
            <div className="typing-indicator-row">
              <div className="typing-pill">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <span className="typing-label">{i18n.thinking}</span>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={chatBottomRef} />
    </div>
  );
}
