import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SalesSim",
  description: "How SalesSim collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingNavbar />
      <main className="flex-1 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-[11px] font-semibold text-primary uppercase tracking-[0.15em] mb-4">
            Legal
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.15] tracking-tight text-foreground mb-8">
            Privacy Policy
          </h1>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p className="mb-4">Last updated: June 2026</p>
            <p className="mb-6">
              SalesSim AI is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our platform.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8 mb-3">Information we collect</h2>
            <p className="mb-4">
              We collect information you provide directly, such as account details, uploaded content, and conversation data. We also collect usage data to improve the platform.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8 mb-3">How we use your data</h2>
            <p className="mb-4">
              We use your data to deliver and improve SalesSim, provide customer support, and ensure security. We do not sell your data to third parties.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8 mb-3">Data security</h2>
            <p className="mb-4">
              We use industry-standard encryption, access controls, and regular security audits. We are SOC 2 Type II certified and GDPR compliant.
            </p>
            <h2 className="text-lg font-semibold text-foreground mt-8 mb-3">Contact us</h2>
            <p>
              If you have questions about this policy, contact us at privacy@salessim.ai.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

