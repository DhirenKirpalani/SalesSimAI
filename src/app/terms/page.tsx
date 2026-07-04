import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Day1 terms of service to understand the rules and conditions for using our AI sales training platform.",
  alternates: {
    canonical: "https://www.day1app.io/terms",
  },
};

export default function TermsPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Terms of Service", path: "/terms" }]} />
      <div className="wrap py-20 lg:py-28">
        <div className="max-w-3xl mx-auto p-8 sm:p-12">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4">
            Legal
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-8" style={{ fontFamily: "Poppins, sans-serif" }}>
            Terms of Service
          </h1>
          <div className="prose prose-sm max-w-none text-[#68646C]">
            <p className="mb-4">Last updated: June 2026</p>
            <p className="mb-6">
              By accessing or using Day1, you agree to these terms. Please read them carefully.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Use of the platform</h2>
            <p className="mb-4">
              You may use Day1 only for lawful purposes and in accordance with these terms. You are responsible for all content you upload and all activity under your account.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Subscriptions and billing</h2>
            <p className="mb-4">
              Some features require a paid subscription. Billing is based on the plan you select and the number of users. You can cancel anytime.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Intellectual property</h2>
            <p className="mb-4">
              Day1 retains all rights to the platform and its technology. You retain ownership of the content you upload.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Limitation of liability</h2>
            <p className="mb-4">
              Day1 is provided as-is. We are not liable for indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
            <h2 className="text-lg font-semibold text-[#1B1A1E] mt-8 mb-3">Contact us</h2>
            <p>
              Questions about these terms can be sent to legal@salessim.ai.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
