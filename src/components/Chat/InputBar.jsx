'use client';

import { useRef } from 'react';

export default function InputBar({
  textInput,
  setTextInput,
  onSendMessage,
  isSending,
  micStatus,
  onToggleMicrophone,
  i18n
}) {
  const inputAreaRef = useRef(null);

  const handleTextareaInput = (e) => {
    const val = e.target.value;
    if (val.length <= 200) {
      setTextInput(val);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage(textInput);
      if (inputAreaRef.current) inputAreaRef.current.style.height = 'auto';
    }
  };

  const handleSendClick = () => {
    onSendMessage(textInput);
    if (inputAreaRef.current) inputAreaRef.current.style.height = 'auto';
  };

  return (
    <div className="chat-input-bar">
      <div className="input-inner-wrapper">
        <textarea
          ref={inputAreaRef}
          id="chat-textarea-input"
          className="message-textarea"
          rows={1}
          placeholder={i18n.inputPlaceholder}
          value={textInput}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
        />
        <div className={`char-limit-indicator ${textInput.length > 180 ? 'danger' : ''}`}>
          {textInput.length}/200
        </div>
      </div>
      <button
        id="mic-record-btn"
        className={`icon-round-btn mic-record-btn ${micStatus === 'recording' ? 'recording' : micStatus === 'processing' ? 'processing' : ''}`}
        onClick={onToggleMicrophone}
        title={micStatus === 'recording' ? 'Stop Recording' : 'Voice Input (Ctrl+M)'}
      >
        {micStatus === 'recording' ? '⏹️' : micStatus === 'processing' ? '⏳' : '🎤'}
      </button>
      <button
        id="send-message-btn"
        className="icon-round-btn send-msg-btn"
        onClick={handleSendClick}
        disabled={!textInput.trim() || isSending}
        title="Send Message (Enter)"
      >
        ➤
      </button>
    </div>
  );
}
