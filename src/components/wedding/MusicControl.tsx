import React, { useState, useRef, useEffect } from 'react';

interface MusicControlProps {
  isActive: boolean;
}

export const MusicControl: React.FC<MusicControlProps> = ({ isActive }) => {
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (audioRef.current) {
      if (!nextMuted) {
        audioRef.current.play().catch(() => {
          // Browser autoplay restriction handled gracefully
        });
        audioRef.current.muted = false;
      } else {
        audioRef.current.muted = true;
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  if (!isActive) return null;

  return (
    <div className="music-control-container" aria-label="Wedding Music Control">
      {/* Optional audio element if user provides track */}
      <audio
        ref={audioRef}
        src="/audio/wedding-shehnai.mp3"
        loop
        preload="none"
      />

      <div className="music-pill">
        <span className="material-symbols-outlined music-note-icon">music_note</span>
        <span className="music-song-name">Shehnai Melodies</span>

        <button
          type="button"
          onClick={toggleMute}
          className="music-toggle-btn"
          aria-label={isMuted ? 'Unmute music' : 'Mute music'}
          title={isMuted ? 'Unmute music' : 'Mute music'}
        >
          <span className="material-symbols-outlined music-state-icon">
            {isMuted ? 'volume_off' : 'volume_up'}
          </span>
          <span className="music-toggle-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
      </div>
    </div>
  );
};
