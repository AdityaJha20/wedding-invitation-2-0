import React, { useState, useCallback, useEffect } from 'react';
import { OpeningSplitScene } from './components/opening/OpeningSplitScene';
import { OpeningHandoffOverlay } from './components/wedding/OpeningHandoffOverlay';
import { GlobalPetalLayer } from './components/wedding/GlobalPetalLayer';
import { MusicControl } from './components/wedding/MusicControl';
import { WeddingExperience } from './components/wedding/WeddingExperience';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { weddingAudio } from './utils/audioManager';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [isOpeningFinished, setIsOpeningFinished] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [isFullyActive, setIsFullyActive] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  // 1. Approved Opening Animation completes (LOCKED - untouched)
  const handleOpenComplete = useCallback(() => {
    setIsOpeningFinished(true);
    weddingAudio.startMusic();
  }, []);

  // 2. Handoff veil reaches peak - reveal Real Wedding UI underneath
  const handleRevealContent = useCallback(() => {
    setIsContentVisible(true);
  }, []);

  // 3. Veil dissolves - activate global petals and music control
  const handleTransitionComplete = useCallback(() => {
    setIsFullyActive(true);
  }, []);

  // Isolated Admin Routes
  if (currentPath === '/admin/login') {
    return (
      <AdminLogin
        onLoginSuccess={() => navigateTo('/admin')}
        onNavigateHome={() => navigateTo('/')}
      />
    );
  }

  if (currentPath === '/admin') {
    return (
      <AdminDashboard
        onLogout={() => navigateTo('/admin/login')}
        onRequireLogin={() => navigateTo('/admin/login')}
        onNavigateHome={() => navigateTo('/')}
      />
    );
  }

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
