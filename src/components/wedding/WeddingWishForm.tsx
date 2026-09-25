import React, { useState, useCallback } from 'react';
import '../../styles/wedding-wish-form.css';

interface WeddingWishFormProps {
  // Optional callback for external integrations
  onWishSubmitted?: (wish: { name: string; wish: string; date: string }) => void;
}

export const WeddingWishForm: React.FC<WeddingWishFormProps> = ({ onWishSubmitted }) => {
  const [name, setName] = useState('');
  const [wish, setWish] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = name.trim();
      const trimmedWish = wish.trim();

      if (!trimmedName || !trimmedWish) {
        setErrorMessage('Please share both your name and your blessing.');
        return;
      }

      setErrorMessage(null);
      setStatus('submitting');

      // Create new wish record
      const newWishRecord = {
        name: trimmedName,
        wish: trimmedWish,
        date: new Date().toISOString(),
      };

      // Store in localStorage for permanence
      try {
        const stored = localStorage.getItem('wedding_wishes_collection');
        const existing = stored ? JSON.parse(stored) : [];
        existing.push(newWishRecord);
        localStorage.setItem('wedding_wishes_collection', JSON.stringify(existing));
      } catch {
        // Safe fallback if localStorage is unavailable
      }

      if (onWishSubmitted) {
        onWishSubmitted(newWishRecord);
      }

      // Celebratory petal flourish on submission
      window.dispatchEvent(new CustomEvent('wedding:petal-burst'));

      // Transition to success state
      setTimeout(() => {
        setStatus('success');
      }, 450);
    },
    [name, wish, onWishSubmitted]
  );

  const handleReset = useCallback(() => {
    setName('');
    setWish('');
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return (
    <section className="wedding-wish-section" id="wedding-wishes" aria-label="Wedding Wishes Guestbook">
      {/* Heirloom Stationery Keepsake Card */}
      <div className="wedding-wish-card">
        {/* Subtle Decorative Gold Corner Flourishes */}
        <div className="wish-corner corner-tl" aria-hidden="true" />
        <div className="wish-corner corner-tr" aria-hidden="true" />
        <div className="wish-corner corner-bl" aria-hidden="true" />
        <div className="wish-corner corner-br" aria-hidden="true" />

        {/* Card Header */}
        <header className="wish-header">
          <div className="wish-ornament-row" aria-hidden="true">
            <span className="wish-ornament-line" />
            <span className="wish-ornament-symbol">❖</span>
            <span className="wish-ornament-line" />
          </div>
          <h2 className="wish-main-title">A Little Note for Us</h2>
          <p className="wish-subtitle">Leave your love &amp; blessings for Manya &amp; Sarthak</p>
        </header>

        {status === 'success' ? (
          /* Warm Success Confirmation */
          <div className="wish-success-container" role="status" aria-live="polite">
            <div className="wish-success-sparkle" aria-hidden="true">
              <span className="material-symbols-outlined success-heart-icon">favorite</span>
            </div>
            <h3 className="wish-success-heading">Thank You with All Our Hearts</h3>
            <p className="wish-success-message">
              Your love has been added to our little collection of blessings.
            </p>
            <p className="wish-success-signoff">— Manya &amp; Sarthak</p>

            <button
              type="button"
              className="wish-reset-btn"
              onClick={handleReset}
              aria-label="Leave another blessing"
            >
              <span>Write another note</span>
            </button>
          </div>
        ) : (
          /* The Form with Exactly Two Inputs */
          <form className="wish-form" onSubmit={handleSubmit} noValidate>
            {/* Field 1: Guest Name */}
            <div className="wish-field-group">
              <label htmlFor="guest-name" className="wish-label">
                Your Name
              </label>
              <input
                type="text"
                id="guest-name"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Write your name"
                className="wish-input"
                autoComplete="name"
                required
                disabled={status === 'submitting'}
              />
            </div>

            {/* Field 2: Wishes Textarea */}
            <div className="wish-field-group">
              <label htmlFor="guest-wish" className="wish-label">
                Your Wishes
              </label>
              <textarea
                id="guest-wish"
                name="wish"
                value={wish}
                onChange={(e) => {
                  setWish(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Leave a little love or a blessing for Manya & Sarthak..."
                className="wish-textarea"
                rows={4}
                required
                disabled={status === 'submitting'}
              />
            </div>

            {/* Subtle Error Message if needed */}
            {errorMessage && (
              <div className="wish-error-text" role="alert">
                <span className="material-symbols-outlined error-icon">info</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="wish-action-wrapper">
              <button
                type="submit"
                className={`wish-submit-btn ${status === 'submitting' ? 'submitting' : ''}`}
                disabled={status === 'submitting'}
                aria-label="Send your wish to the bride and groom"
              >
                <span className="wish-btn-text">
                  {status === 'submitting' ? 'Sending Blessing...' : 'SEND YOUR WISH'}
                </span>
                <span className="material-symbols-outlined wish-btn-heart" aria-hidden="true">
                  favorite
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Micro Sign-off */}
        <footer className="wish-footer-accent" aria-hidden="true">
          <span className="wish-footer-dot" />
          <span className="wish-footer-text">WITH LOVE &amp; GRATITUDE</span>
          <span className="wish-footer-dot" />
        </footer>
      </div>
    </section>
  );
};
