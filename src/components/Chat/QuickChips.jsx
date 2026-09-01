'use client';

import { PERSONA_CONFIG } from '@/lib/constants';

export default function QuickChips({ selectedPersona, i18n, onChipClick }) {
  const chips = PERSONA_CONFIG[selectedPersona]?.suggestedQuestions || i18n.chips?.[selectedPersona] || [];
  if (!chips || chips.length === 0) return null;

  return (
    <div className="quick-chips-wrapper">
      {chips.map((chip, idx) => (
        <button
          key={idx}
          className="quick-chip-btn"
          onClick={() => onChipClick(chip)}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
