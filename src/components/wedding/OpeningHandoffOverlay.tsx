import React, { useEffect, useState } from 'react';
import '../../styles/handoff.css';

interface OpeningHandoffOverlayProps {
  isActive: boolean;
  onRevealContent: () => void;
  onTransitionComplete: () => void;
}

export const OpeningHandoffOverlay: React.FC<OpeningHandoffOverlayProps> = ({
  isActive,
  onRevealContent,
  onTransitionComplete,
}) => {
  const [glowActive, setGlowActive] = useState(false);
  const [veilActive, setVeilActive] = useState(false);
  const [veilFading, setVeilFading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    // Phase 1 (0 – 300ms): Champagne-gold radial warmth rises from opening center
    const tGlow = setTimeout(() => {
      setGlowActive(true);
    }, 20);

    // Phase 2 (250 – 550ms): Warm ivory luminous veil blooms
    const tVeil = setTimeout(() => {
      setVeilActive(true);
    }, 240);

    // Phase 3 (~500ms): Real Wedding UI unhides cleanly underneath the veil
    const tReveal = setTimeout(() => {
      onRevealContent();
    }, 480);

    // Phase 4 (550 – 850ms): White veil and golden glow dissolve smoothly
    const tFade = setTimeout(() => {
      setVeilFading(true);
      setGlowActive(false);
    }, 550);

    // Phase 5 (~880ms): Transition complete, petals activate, overlay retires
    const tComplete = setTimeout(() => {
      setIsDone(true);
      onTransitionComplete();
    }, 880);

    return () => {
      clearTimeout(tGlow);
      clearTimeout(tVeil);
      clearTimeout(tReveal);
      clearTimeout(tFade);
      clearTimeout(tComplete);
    };
  }, [isActive, onRevealContent, onTransitionComplete]);

  if (!isActive || isDone) return null;

  return (
    <div className="opening-handoff-overlay" aria-hidden="true">
      {/* 1. Subtle champagne-gold warmth */}
      <div className={`handoff-gold-glow ${glowActive ? 'active' : ''}`} />

      {/* 2. Soft warm-white / ivory light veil */}
      <div
        className={`handoff-white-veil ${veilActive ? 'active' : ''} ${
          veilFading ? 'fading' : ''
        }`}
      />
    </div>
  );
};
