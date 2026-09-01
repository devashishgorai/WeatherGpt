'use client';

import { PERSONA_CONFIG } from '@/lib/constants';

export default function WelcomeState({ currentLoc, i18n, selectedPersona, onSelectStarter }) {
  const roleConfig = PERSONA_CONFIG[selectedPersona] || PERSONA_CONFIG.citizen;
  const starterCards = roleConfig.starterCards?.length ? roleConfig.starterCards : (i18n.starters || []);

  return (
    <div className="welcome-container">
      <div className="welcome-badge">{i18n.welcomeBadge}</div>
      <h2 className="welcome-title">{i18n.welcomeTitle}</h2>
      <p className="welcome-subtitle">
        <strong>{currentLoc.city}</strong> {i18n.welcomeSubtitle}
      </p>
      <div className="welcome-cards-grid">
        {starterCards.map((card, idx) => (
          <div
            key={idx}
            id={`welcome-card-${idx}`}
            className="welcome-example-card"
            onClick={() => onSelectStarter(card.personaKey, card.q)}
          >
            <div className="welcome-card-top">
              <span className="welcome-card-icon">{card.emoji}</span>
              <span className="welcome-persona-tag">{card.title}</span>
            </div>
            <div className="welcome-q-text">{card.q}</div>
            <div className="welcome-a-text">{card.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
