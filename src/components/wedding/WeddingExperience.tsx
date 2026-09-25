import React from 'react';
import { HeroSection } from './HeroSection';
import { ScratchDateSection } from './ScratchDateSection';
import { WeddingDetailsBlock } from './WeddingDetailsBlock';
import { VenueCelebrationSection } from './VenueCelebrationSection';
import { WeddingWishForm } from './WeddingWishForm';
import '../../styles/wedding.css';

interface WeddingExperienceProps {
  isVisible: boolean;
}

export const WeddingExperience: React.FC<WeddingExperienceProps> = ({ isVisible }) => {
  return (
    <div
      className={`wedding-experience ${isVisible ? 'visible' : ''}`}
      aria-hidden={!isVisible}
    >
      <main className="wedding-content-flow">
        {/* 1. HERO SECTION */}
        <HeroSection />

        {/* 2. SIGNATURE GOLDEN HEART SCRATCH CARD SECTION */}
        <ScratchDateSection />

        {/* 3. SMALL WEDDING DETAILS / CELEBRATIONS BLOCK */}
        <WeddingDetailsBlock />

        {/* 4. VENUE + WEDDING DATES SECTION */}
        <VenueCelebrationSection />

        {/* 5. SMALL WEDDING WISH FORM */}
        <WeddingWishForm />
      </main>
    </div>
  );
};
