/**
 * Wedding Invitation Background Audio Manager
 * Singleton pattern ensuring a single persistent HTML5 Audio instance across all components.
 */

class WeddingAudioManager {
  private static instance: WeddingAudioManager;
  private audio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private hasStarted: boolean = false;
  private listeners: Set<(isMuted: boolean, isPlaying: boolean) => void> = new Set();

  private constructor() {}

  public static getInstance(): WeddingAudioManager {
    if (!WeddingAudioManager.instance) {
      WeddingAudioManager.instance = new WeddingAudioManager();
    }
    return WeddingAudioManager.instance;
  }

  private initAudio() {
    if (!this.audio && typeof window !== 'undefined') {
      // Use clean jasnabara.mp3 asset (looping background track, ~55s)
      this.audio = new Audio('/audio/jasnabara.mp3');
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.muted = this.isMuted;

      this.audio.addEventListener('play', () => this.notify());
      this.audio.addEventListener('pause', () => this.notify());
      this.audio.addEventListener('volumechange', () => this.notify());
    }
  }

  /**
   * Start music playback after user's opening interaction gesture.
   */
  public startMusic(): void {
    this.initAudio();
    if (!this.audio) return;
    if (this.hasStarted) return;
    this.hasStarted = true;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn('Audio playback waiting for direct user gesture:', error);
        // Fallback: If browser held back autoplay, resume on very next tap anywhere
        const resumeOnFirstTouch = () => {
          if (this.audio && this.hasStarted) {
            this.audio.play().catch(() => {});
          }
          window.removeEventListener('click', resumeOnFirstTouch);
          window.removeEventListener('touchstart', resumeOnFirstTouch);
        };
        window.addEventListener('click', resumeOnFirstTouch, { once: true });
        window.addEventListener('touchstart', resumeOnFirstTouch, { once: true });
      });
    }
    this.notify();
  }

  /**
   * Toggle mute status immediately without restarting playback position.
   */
  public toggleMute(): boolean {
    this.initAudio();
    if (!this.audio) return this.isMuted;

    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;

    // If unmuting while audio paused, resume playback
    if (!this.isMuted && this.audio.paused) {
      this.audio.play().catch(() => {});
    }

    this.notify();
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.initAudio();
    if (!this.audio) return;
    this.isMuted = muted;
    this.audio.muted = muted;
    this.notify();
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return !!(this.audio && !this.audio.paused);
  }

  public subscribe(listener: (isMuted: boolean, isPlaying: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isMuted, this.getIsPlaying());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const isPlaying = this.getIsPlaying();
    this.listeners.forEach((listener) => {
      try {
        listener(this.isMuted, isPlaying);
      } catch (err) {
        console.error('Audio listener error:', err);
      }
    });
  }
}

export const weddingAudio = WeddingAudioManager.getInstance();
