import React, { useState, useCallback } from 'react';
import { OpeningSplitScene } from './components/opening/OpeningSplitScene';
import { OpeningHandoffOverlay } from './components/wedding/OpeningHandoffOverlay';
import { GlobalPetalLayer } from './components/wedding/GlobalPetalLayer';
import { MusicControl } from './components/wedding/MusicControl';
import { WeddingExperience } from './components/wedding/WeddingExperience';

export const App: React.FC = () => {
  const [isOpeningFinished, setIsOpeningFinished] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isFullyActive, setIsFullyActive] = useState(false);

  // 1. Approved Opening Animation completes (LOCKED - untouched)
  const handleOpenComplete = useCallback(() => {
    setIsOpeningFinished(true);
  }, []);

  // 2. Handoff veil reaches peak - reveal Real Wedding UI underneath
  const handleRevealContent = useCallback(() => {
    setIsContentVisible(true);
  }, []);

  // 3. Veil dissolves - activate global petals and music control
  const handleTransitionComplete = useCallback(() => {
    setIsFullyActive(true);
  }, []);

  return (
    <div className="app-container">
      {/* 1. Locked Approved Two-Panel Opening Scene (100% UNTOUCHED) */}
      <OpeningSplitScene onOpenComplete={handleOpenComplete} />

      {/* 2. Ceremonial Champagne-Gold Glow + Soft Ivory Light Veil Handoff */}
      <OpeningHandoffOverlay
        isActive={isOpeningFinished}
        onRevealContent={handleRevealContent}
        onTransitionComplete={handleTransitionComplete}
      />

      {/* 3. Global Persistent Petal Layer (Active only after handoff veil dissolves) */}
      <GlobalPetalLayer isActive={isFullyActive} />

      {/* 4. Minimal Music Control (Active only after handoff veil dissolves) */}
      <MusicControl isActive={isFullyActive} />

      {/* 5. Real Wedding UI (Hero + Signature Golden Heart Scratch Date Section) */}
      <WeddingExperience isVisible={isContentVisible} />
    </div>
  );
};

export default App;
