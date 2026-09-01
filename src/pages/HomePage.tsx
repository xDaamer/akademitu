import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HeroSection } from '../components/HeroSection';
import { TrustBar } from '../components/TrustBar';
import { PackagesSection } from '../components/PackagesSection';
import { WhyUsSection } from '../components/WhyUsSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { FAQSection } from '../components/FAQSection';

interface HomePageProps {
  onOpenTrialForm: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenTrialForm }) => {
  const location = useLocation();

  // Scroll to a section if navigated here from another page via the header/footer links.
  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (scrollTo) {
      const element = document.getElementById(scrollTo);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.state]);

  return (
    <main className="flex-grow">
      <HeroSection onOpenTrialForm={onOpenTrialForm} />
      <TrustBar />
      <PackagesSection onOpenTrialForm={onOpenTrialForm} />
      <WhyUsSection onOpenTrialForm={onOpenTrialForm} />
      <TestimonialsSection />
      <FAQSection />
    </main>
  );
};
