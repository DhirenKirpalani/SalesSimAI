import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { CallPreviewSection } from "@/components/landing/CallPreviewSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-col relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle className="rounded-full shadow-lg bg-card border" />
      </div>
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <CallPreviewSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
