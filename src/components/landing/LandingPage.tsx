import { LandingNavbar } from "./LandingNavbar";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { ShowcaseSection } from "./ShowcaseSection";
import { IndustriesSection } from "./IndustriesSection";
import { WhySection } from "./WhySection";
import { PricingSection } from "./PricingSection";
import { FAQSection } from "./FAQSection";
import { Footer } from "./Footer";

function Divider() {
  return <div className="h-px bg-[var(--border)] mx-6 lg:mx-16" />;
}

export function LandingPage() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] font-sans leading-relaxed">
      <LandingNavbar />
      <HeroSection />
      <Divider />
      <FeaturesSection />
      <Divider />
      <ShowcaseSection />
      <Divider />
      <IndustriesSection />
      <WhySection />
      <Divider />
      <PricingSection />
      <Divider />
      <FAQSection />
      <Footer />
    </div>
  );
}
