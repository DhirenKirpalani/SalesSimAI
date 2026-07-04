import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the Day1 privacy policy to learn how we collect, use, and protect your data and conversation content.",
  alternates: {
    canonical: "https://www.day1app.io/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Privacy Policy", path: "/privacy" }]} />
      <div className="wrap py-20 lg:py-28">
        <div className="max-w-3xl mx-auto p-8 sm:p-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4">
            Legal
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-8" style={{ fontFamily: "Poppins, sans-serif" }}>
            Privacy Policy
          </h1>
          <div className="prose prose-sm max-w-none text-[#68646C]">
            <p className="mb-4">Last updated: June 2026</p>
            <p className="mb-6">
              Day1 is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our platform.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Information we collect</h2>
            <p className="mb-4">
              We collect information you provide directly, such as account details, uploaded content, and conversation data. We also collect usage data to improve the platform.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">How we use your data</h2>
            <p className="mb-4">
              We use your data to deliver and improve Day1, provide customer support, and ensure security. We do not sell your data to third parties.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Data security</h2>
            <p className="mb-4">
              We use industry-standard encryption, access controls, and regular security audits. We are SOC 2 Type II certified and GDPR compliant.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Contact us</h2>
            <p>
              If you have questions about this policy, contact us at privacy@salessim.ai.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

