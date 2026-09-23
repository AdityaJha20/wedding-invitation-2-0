import React, { useRef, useEffect, useState, useCallback } from 'react';

export const ScratchDateSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const isDrawingRef = useRef(false);
  const scratchedCountRef = useRef(0);
  const revealedRef = useRef(false);

  const drawGoldFoil = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // Champagne Gold Foil Gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#C5A059');
    grad.addColorStop(0.25, '#F5E3A9');
    grad.addColorStop(0.5, '#AA7C11');
    grad.addColorStop(0.75, '#F9E9BA');
    grad.addColorStop(1, '#B38B38');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gold Shimmer Flecks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 75; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Elegant Text Stamp on Foil (responsively scaled for phone widths)
    const titleSize = Math.max(11, Math.min(13, Math.round(canvas.width * 0.042)));
    const subSize = Math.max(10, Math.min(12, Math.round(canvas.width * 0.037)));

    ctx.fillStyle = '#4E3700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${titleSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText('SCRATCH OUR SECRET', canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = `italic ${subSize}px "Playfair Display", Georgia, serif`;
    ctx.fillText('✨ to unveil auspicious date ✨', canvas.width / 2, canvas.height / 2 + 12);
  }, []);

  const triggerReveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setIsRevealed(true);
    setShowCelebration(true);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.opacity = '0';
      setTimeout(() => {
        canvas.style.display = 'none';
      }, 700);
    }

    // Additive festive petal flourish
    window.dispatchEvent(new CustomEvent('wedding:petal-burst'));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setupCanvas = () => {
      if (revealedRef.current) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      canvas.width = rect.width;
      canvas.height = rect.height;
      drawGoldFoil(canvas, ctx);
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    const scratch = (clientX: number, clientY: number) => {
      if (!isDrawingRef.current || revealedRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      // Responsive scratch radius
      const radius = Math.max(22, Math.min(28, canvas.width * 0.08));
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      scratchedCountRef.current++;
      // Threshold increased by ~40% (target ~50% interaction / 50 strokes)
      if (scratchedCountRef.current >= 50 && !revealedRef.current) {
        triggerReveal();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDrawingRef.current = true;
      scratch(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      scratch(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      isDrawingRef.current = true;
      if (e.touches.length > 0) {
        scratch(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        scratch(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      isDrawingRef.current = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('resize', setupCanvas);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [drawGoldFoil, triggerReveal]);

  return (
    <section className="scratch-section" id="scratch-card" aria-label="Wedding Date Scratch Card">
      {/* Hidden SVG defining responsive normalized heart clip-path */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <clipPath id="wedding-heart-clip" clipPathUnits="objectBoundingBox">
            <path d="M 0.5,0.9655 C 0.5,0.9655 0.0625,0.6379 0.0625,0.3621 C 0.0625,0.1379 0.2188,0.0517 0.3688,0.0517 C 0.4531,0.0517 0.4938,0.1207 0.5,0.1552 C 0.5063,0.1207 0.5469,0.0517 0.6313,0.0517 C 0.7813,0.0517 0.9375,0.1379 0.9375,0.3621 C 0.9375,0.6379 0.5,0.9655 0.5,0.9655 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="scratch-inner-container">
        {/* Header badge */}
        <div className="scratch-header-badge">
          <span className="material-symbols-outlined badge-heart-icon">favorite</span>
          <span className="badge-text">Our Auspicious Muhurat</span>
        </div>

        <h2 className="scratch-heading">Scratch Our Little Secret</h2>
        <p className="scratch-subheading">
          Rub with your finger or cursor over the golden heart to reveal the sacred wedding date!
        </p>

        {/* Golden Heart Mount Container */}
        <div className="scratch-mount-card" ref={containerRef}>
          {/* Heart Shape Interactive Wrapper */}
          <div className="heart-interactive-frame">
            {/* UNDERNEATH REVEALED CONTENT */}
            <div className="heart-revealed-content">
              <div className="calendar-icon-disc">
                <span className="material-symbols-outlined calendar-glyph">calendar_month</span>
              </div>
              <span className="revealed-save-date">Save The Date</span>
              <h3 className="revealed-wedding-date">24 NOVEMBER 2026</h3>
              <p className="revealed-couple-names">Manya &amp; Sarthak</p>
            </div>

            {/* INTERACTIVE CANVAS OVERLAY FOR SCRATCHING */}
            <canvas
              ref={canvasRef}
              className={`heart-scratch-canvas ${isRevealed ? 'revealed' : ''}`}
              aria-label="Golden heart scratch foil surface"
            />
          </div>

          {/* Bottom Action Prompt & Quick Reveal Button */}
          <div className="scratch-action-bar">
            <div className="scratch-hint">
              <span className="material-symbols-outlined hint-icon">gesture</span>
              <span>Gently rub heart surface</span>
            </div>

            {!isRevealed && (
              <button
                type="button"
                className="quick-reveal-btn"
                onClick={triggerReveal}
                aria-label="Tap to reveal wedding date"
              >
                <span className="material-symbols-outlined reveal-btn-icon">magic_button</span>
                <span>Tap to Reveal Date</span>
              </button>
            )}
          </div>

          {/* Joyful Celebration Banner upon Reveal */}
          {showCelebration && (
            <div className="scratch-celebration-banner" role="status" aria-live="polite">
              🌸 Mubarak &amp; Badhaai Ho! Mark your calendars for 24 November 2026! We cannot wait to celebrate together! 🌸
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
