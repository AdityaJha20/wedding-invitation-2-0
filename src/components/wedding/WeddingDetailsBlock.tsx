import React from 'react';
import '../../styles/wedding-details-block.css';

interface CeremonyMoment {
  id: string;
  timeOfDay: string;
  title: string;
  sanskrit: string;
  subtitle: string;
}

interface CelebrationDay {
  date: string;
  dayOfWeek: string;
  events: CeremonyMoment[];
}

const CELEBRATION_SCHEDULE: CelebrationDay[] = [
  {
    date: '23 NOVEMBER 2026',
    dayOfWeek: 'Monday',
    events: [
      {
        id: 'shagan',
        timeOfDay: 'MORNING',
        title: 'Shagan',
        sanskrit: '॥ शुभ आरंभ ॥',
        subtitle: 'Sacred Family Blessings',
      },
      {
        id: 'mehndi',
        timeOfDay: 'EVENING',
        title: 'Mehndi',
        sanskrit: '॥ मेंहदी उत्सव ॥',
        subtitle: 'Henna, Melodies & Joy',
      },
    ],
  },
  {
    date: '24 NOVEMBER 2026',
    dayOfWeek: 'Tuesday',
    events: [
      {
        id: 'haldi',
        timeOfDay: 'MORNING',
        title: 'Haldi',
        sanskrit: '॥ हरिद्रा मंगलम् ॥',
        subtitle: 'Sunlit Turmeric Ritual',
      },
      {
        id: 'main-function',
        timeOfDay: 'EVENING',
        title: 'Main Function',
        sanskrit: '॥ विवाह संस्कार ॥',
        subtitle: 'The Sacred Seven Vows',
      },
    ],
  },
];

export const WeddingDetailsBlock: React.FC = () => {
  return (
    <section className="wedding-details-section" id="wedding-celebrations" aria-label="Wedding Celebrations Schedule">
      {/* Heirloom Stationery Programme Card */}
      <div className="wedding-details-card">
        {/* Subtle Decorative Gold Corner Flourishes */}
        <div className="details-corner corner-tl" aria-hidden="true" />
        <div className="details-corner corner-tr" aria-hidden="true" />
        <div className="details-corner corner-bl" aria-hidden="true" />
        <div className="details-corner corner-br" aria-hidden="true" />

        {/* Section Heading */}
        <header className="details-header">
          <div className="details-ornament-row" aria-hidden="true">
            <span className="details-ornament-line" />
            <span className="details-ornament-symbol">❖</span>
            <span className="details-ornament-line" />
          </div>
          <h2 className="details-main-title">The Celebrations</h2>
          <p className="details-subtitle">Four beautiful moments, one sacred celebration</p>
        </header>

        {/* Two-Day 2x2 Ceremonial Moments Layout */}
        <div className="details-days-group">
          {CELEBRATION_SCHEDULE.map((day, dayIndex) => (
            <React.Fragment key={day.date}>
              <div className="details-day-row">
                {/* Date Chapter Header */}
                <div className="details-day-header">
                  <span className="details-day-rule" aria-hidden="true" />
                  <span className="details-day-date">{day.date}</span>
                  <span className="details-day-rule reverse" aria-hidden="true" />
                </div>

                {/* 2-Column Moments Grid */}
                <div className="details-events-grid">
                  {/* Subtle Central Column Divider */}
                  <div className="details-col-divider" aria-hidden="true" />

                  {day.events.map((event) => (
                    <article key={event.id} className="details-event-item">
                      <span className="details-time-pill">{event.timeOfDay}</span>
                      <h3 className="details-event-name">{event.title}</h3>
                      <p className="details-event-sub">{event.subtitle}</p>
                    </article>
                  ))}
                </div>
              </div>

              {/* Delicate Chapter Divider between Day 1 and Day 2 */}
              {dayIndex === 0 && (
                <div className="details-chapter-divider" aria-hidden="true">
                  <span className="details-divider-line" />
                  <span className="details-divider-ornament">✦</span>
                  <span className="details-divider-line" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Footer Micro Sign-off */}
        <footer className="details-footer-accent">
          <span className="details-footer-dot" aria-hidden="true" />
          <span className="details-footer-text">CEREMONIAL ITINERARY • MANYA &amp; SARTHAK</span>
          <span className="details-footer-dot" aria-hidden="true" />
        </footer>
      </div>
    </section>
  );
};
