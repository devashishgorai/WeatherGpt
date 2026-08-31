'use client';

import { useState } from 'react';
import { CONFIG } from '@/lib/config';

export default function SettingsModal({ isOpen, onClose, showToast }) {
  const [claudeKeyInput, setClaudeKeyInput] = useState(CONFIG.CLAUDE_API_KEY);
  const [geminiKeyInput, setGeminiKeyInput] = useState(CONFIG.GEMINI_API_KEY);
  const [openaiKeyInput, setOpenaiKeyInput] = useState(CONFIG.OPENAI_API_KEY);

  if (!isOpen) return null;

  const handleSave = () => {
    CONFIG.saveKey('claude', claudeKeyInput);
    CONFIG.saveKey('gemini', geminiKeyInput);
    CONFIG.saveKey('openai', openaiKeyInput);

    onClose();
    if (claudeKeyInput || geminiKeyInput || openaiKeyInput) {
      if (showToast) showToast('✅ Live AI Model activated!');
    } else {
      if (showToast) showToast('ℹ️ Local intelligent engine active.');
    }
  };

  return (
    <div className="compare-backdrop" onClick={onClose}>
      <div className="settings-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="compare-modal-header">
          <h2 className="compare-modal-title">⚙️ AI Model Settings</h2>
          <button className="compare-modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="settings-desc">
          Add your API key for Claude, Gemini, or OpenAI to unlock deep reasoning in native Indian languages. If left blank, the app uses its smart built-in localized persona engine.
        </p>

        <label className="settings-label">Anthropic Claude API Key (sk-ant-...)</label>
        <input
          type="password"
          className="settings-input"
          placeholder="sk-ant-api03-..."
          value={claudeKeyInput}
          onChange={(e) => setClaudeKeyInput(e.target.value)}
        />

        <label className="settings-label">Google Gemini API Key (AIzaSy...)</label>
        <input
          type="password"
          className="settings-input"
          placeholder="AIzaSy..."
          value={geminiKeyInput}
          onChange={(e) => setGeminiKeyInput(e.target.value)}
        />

        <label className="settings-label">OpenAI API Key (sk-proj-...)</label>
        <input
          type="password"
          className="settings-input"
          placeholder="sk-proj-..."
          value={openaiKeyInput}
          onChange={(e) => setOpenaiKeyInput(e.target.value)}
        />

        <div className="settings-actions">
          <button className="header-btn" onClick={onClose}>Cancel</button>
          <button className="header-btn active" onClick={handleSave}>Save & Activate</button>
        </div>
      </div>
    </div>
  );
}
