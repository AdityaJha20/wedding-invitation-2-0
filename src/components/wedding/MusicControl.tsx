import React, { useState, useEffect } from 'react';
import { weddingAudio } from '../../utils/audioManager';

interface MusicControlProps {
  isActive: boolean;
}

export const MusicControl: React.FC<MusicControlProps> = ({ isActive }) => {
  const [isMuted, setIsMuted] = useState(() => weddingAudio.getIsMuted());

  useEffect(() => {
    const unsubscribe = weddingAudio.subscribe((muted) => {
      setIsMuted(muted);
    });
    return unsubscribe;
  }, []);

  const handleToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    weddingAudio.toggleMute();
  };

  if (!isActive) return null;

  return (
    <div className="music-control-container" aria-label="Wedding Music Control">
      <div className="music-pill">
        <span className="material-symbols-outlined music-note-icon" aria-hidden="true">
          music_note
        </span>
        <span className="music-song-name">Jasnabara</span>

        <button
          type="button"
          onClick={handleToggle}
          className="music-toggle-btn"
          aria-label={isMuted ? 'Unmute Jasnabara background music' : 'Mute Jasnabara background music'}
          title={isMuted ? 'Unmute Jasnabara' : 'Mute Jasnabara'}
        >
          <span className="material-symbols-outlined music-state-icon" aria-hidden="true">
            {isMuted ? 'volume_off' : 'volume_up'}
          </span>
          <span className="music-toggle-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
      </div>
    </div>
  );
};
