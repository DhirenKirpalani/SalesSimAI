import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import {
  FileText,
  CheckCircle,
  User,
  Users,
  FolderOpen,
  Bot,
  ShieldAlert,
  Plug,
  Lightbulb,
  CreditCard,
  Activity,
  Lock,
  Power,
  AlertTriangle,
  Scale,
  Shield,
  FileEdit,
  Globe,
  Mail,
  Gavel,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Day1 terms of service to understand the rules and conditions for using our AI workspace platform.",
  alternates: {
    canonical: "https://www.day1app.io/terms",
  },
};

export default function TermsPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Terms of Service", path: "/terms" }]} />
      <div className="wrap py-20 lg:py-28">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4">
              <Gavel className="w-4 h-4" />
              Legal
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-6" style={{ fontFamily: "Poppins, sans-serif" }}>
              Terms of Service
            </h1>
            <p className="text-[#68646C] text-lg">
              Effective Date: <strong>July 2026</strong> · Last updated: <strong>July 2026</strong>
            </p>
          </div>

          <div className="space-y-8">
            {/* Intro */}
            <section className="rounded-2xl border border-[#E7E4DF] bg-white p-6 sm:p-8 shadow-sm">
              <p className="text-[#68646C] leading-relaxed mb-4">
                Welcome to <strong className="text-[#1B1A1E]">Day1</strong> (&quot;Day1&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Day1 platform, website, applications, APIs, and related services (collectively, the &quot;Services&quot;).
              </p>
              <p className="text-[#68646C] leading-relaxed">
                By creating an account, accessing, or using Day1, you agree to be bound by these Terms. If you do not agree with these Terms, you may not use the Services.
              </p>
            </section>

            <PolicyCard number="1" title="About Day1" icon={FileText}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                Day1 is an AI-powered workspace platform designed for organizations to manage knowledge, train teams, conduct AI-powered simulations, collaborate, and automate workflows.
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">Features may include:</p>
              <BulletList items={[
                "AI-powered knowledge bases", "Sales simulations", "AI coaching", "Team workspaces",
                "Organization branding", "Document management", "AI search and retrieval", "Integrations with third-party services"
              ]} />
              <p className="text-[#68646C] leading-relaxed">Our Services may evolve over time, and we reserve the right to add, modify, or remove features.</p>
            </PolicyCard>

            <PolicyCard number="2" title="Eligibility" icon={CheckCircle}>
              <p className="text-[#68646C] leading-relaxed mb-4">To use Day1, you must:</p>
              <BulletList items={[
                "Be at least the age of majority in your jurisdiction.",
                "Have the legal authority to enter into these Terms.",
                "Use the Services in compliance with applicable laws and regulations."
              ]} />
              <p className="text-[#68646C] leading-relaxed">If you are using Day1 on behalf of an organization, you represent that you have authority to bind that organization to these Terms.</p>
            </PolicyCard>

            <PolicyCard number="3" title="Accounts" icon={User}>
              <p className="text-[#68646C] leading-relaxed mb-4">You are responsible for maintaining the confidentiality of your account credentials.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">You agree to:</p>
              <BulletList items={[
                "Provide accurate and complete information.",
                "Keep your account information up to date.",
                "Notify us immediately of any unauthorized use of your account.",
                "Accept responsibility for all activities conducted under your account."
              ]} />
              <p className="text-[#68646C] leading-relaxed">We reserve the right to suspend or terminate accounts that violate these Terms.</p>
            </PolicyCard>

            <PolicyCard number="4" title="Organization Workspaces" icon={Users}>
              <p className="text-[#68646C] leading-relaxed mb-4">Day1 is a multi-tenant platform where organizations can create workspaces for their teams.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">Workspace administrators may:</p>
              <BulletList items={[
                "Invite and remove members.",
                "Assign permissions and roles.",
                "Configure organization branding.",
                "Manage uploaded content.",
                "Control access to organization resources."
              ]} />
              <p className="text-[#68646C] leading-relaxed">Organization administrators are responsible for managing user access within their workspace.</p>
            </PolicyCard>

            <PolicyCard number="5" title="Customer Content" icon={FolderOpen}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                &quot;Customer Content&quot; includes any information, documents, files, prompts, knowledge bases, conversations, or other materials uploaded or created by users within Day1.
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">You retain ownership of your Customer Content.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">
                By using the Services, you grant Day1 a limited, non-exclusive license to host, process, store, transmit, and display your Customer Content solely for the purpose of operating and improving the Services.
              </p>
              <p className="text-[#68646C] leading-relaxed">Day1 does not claim ownership of your Customer Content.</p>
            </PolicyCard>

            <PolicyCard number="6" title="AI Features" icon={Bot}>
              <p className="text-[#68646C] leading-relaxed mb-4">Day1 provides AI-powered functionality, including content generation, simulations, coaching, search, and knowledge retrieval.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">AI-generated outputs:</p>
              <BulletList items={[
                "May be incomplete.",
                "May contain inaccuracies.",
                "Should not be considered professional, legal, financial, medical, or regulatory advice.",
                "Should be reviewed by users before making business decisions."
              ]} />
              <p className="text-[#68646C] leading-relaxed">You remain responsible for how you use AI-generated outputs.</p>
            </PolicyCard>

            <PolicyCard number="7" title="Acceptable Use" icon={ShieldAlert}>
              <p className="text-[#68646C] leading-relaxed mb-4">You agree not to use Day1 to:</p>
              <BulletList items={[
                "Violate any applicable laws.",
                "Upload malicious software or harmful code.",
                "Attempt unauthorized access to systems or data.",
                "Interfere with the operation of the Services.",
                "Infringe intellectual property rights.",
                "Distribute spam or unsolicited communications.",
                "Upload content that is unlawful, defamatory, abusive, or fraudulent.",
                "Attempt to reverse engineer or exploit the platform."
              ]} />
              <p className="text-[#68646C] leading-relaxed">We reserve the right to suspend or terminate accounts engaging in prohibited activities.</p>
            </PolicyCard>

            <PolicyCard number="8" title="Third-Party Services" icon={Plug}>
              <p className="text-[#68646C] leading-relaxed mb-4">Day1 may integrate with third-party providers, including but not limited to:</p>
              <BulletList items={[
                "Google", "Microsoft", "Slack", "CRM platforms", "AI providers", "Cloud storage services"
              ]} />
              <p className="text-[#68646C] leading-relaxed mb-4">Your use of these integrations is subject to the respective third party&apos;s terms and privacy policies.</p>
              <p className="text-[#68646C] leading-relaxed">Day1 is not responsible for the availability or functionality of third-party services.</p>
            </PolicyCard>

            <PolicyCard number="9" title="Intellectual Property" icon={Lightbulb}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                The Day1 platform, including its software, user interface, branding, logos, documentation, and underlying technology, is owned by Day1 or its licensors and is protected by applicable intellectual property laws.
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">Except as expressly permitted, you may not:</p>
              <BulletList items={[
                "Copy", "Modify", "Distribute", "Reverse engineer", "Sell", "License", "Create derivative works"
              ]} />
              <p className="text-[#68646C] leading-relaxed">from the Services without prior written permission.</p>
            </PolicyCard>

            <PolicyCard number="10" title="Subscription and Billing" icon={CreditCard}>
              <p className="text-[#68646C] leading-relaxed mb-4">Certain features may require a paid subscription.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">Where applicable:</p>
              <BulletList items={[
                "Fees will be disclosed before purchase.",
                "Subscriptions may renew automatically unless cancelled.",
                "Prices may change with reasonable notice.",
                "Taxes may apply depending on your jurisdiction."
              ]} />
              <p className="text-[#68646C] leading-relaxed">Failure to pay applicable fees may result in suspension of paid features.</p>
            </PolicyCard>

            <PolicyCard number="11" title="Availability" icon={Activity}>
              <p className="text-[#68646C] leading-relaxed mb-4">We strive to provide reliable Services but do not guarantee uninterrupted or error-free operation.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">The Services may occasionally be unavailable due to:</p>
              <BulletList items={[
                "Maintenance", "System upgrades", "Security updates", "Network issues", "Third-party service interruptions"
              ]} />
              <p className="text-[#68646C] leading-relaxed">We may modify or discontinue features at any time.</p>
            </PolicyCard>

            <PolicyCard number="12" title="Privacy" icon={Lock}>
              <p className="text-[#68646C] leading-relaxed mb-4">Your use of Day1 is also governed by our Privacy Policy.</p>
              <p className="text-[#68646C] leading-relaxed">By using the Services, you acknowledge that your information will be collected and processed as described in the Privacy Policy.</p>
            </PolicyCard>

            <PolicyCard number="13" title="Termination" icon={Power}>
              <p className="text-[#68646C] leading-relaxed mb-4">You may stop using Day1 at any time.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">We may suspend or terminate access if:</p>
              <BulletList items={[
                "You violate these Terms.",
                "Your use poses a security risk.",
                "Required by law.",
                "Necessary to protect the Services or other users."
              ]} />
              <p className="text-[#68646C] leading-relaxed">Termination does not relieve you of obligations incurred prior to termination.</p>
            </PolicyCard>

            <PolicyCard number="14" title="Disclaimer of Warranties" icon={AlertTriangle}>
              <p className="text-[#68646C] leading-relaxed mb-4">The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">
                To the fullest extent permitted by law, Day1 disclaims all warranties, whether express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted availability.
              </p>
              <p className="text-[#68646C] leading-relaxed">We do not guarantee that the Services will always be error-free or meet every user&apos;s expectations.</p>
            </PolicyCard>

            <PolicyCard number="15" title="Limitation of Liability" icon={Scale}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                To the maximum extent permitted by applicable law, Day1 and its affiliates, officers, employees, and partners shall not be liable for any indirect, incidental, consequential, special, exemplary, or punitive damages arising out of or related to your use of the Services.
              </p>
              <p className="text-[#68646C] leading-relaxed">
                Our total liability for any claim relating to the Services shall not exceed the amount you paid to Day1 during the twelve (12) months preceding the event giving rise to the claim, or USD $100 if no fees were paid.
              </p>
            </PolicyCard>

            <PolicyCard number="16" title="Indemnification" icon={Shield}>
              <p className="text-[#68646C] leading-relaxed mb-4">You agree to indemnify and hold harmless Day1, its affiliates, employees, officers, and partners from any claims, liabilities, damages, losses, or expenses arising from:</p>
              <BulletList items={[
                "Your use of the Services.",
                "Your Customer Content.",
                "Your violation of these Terms.",
                "Your violation of applicable laws or third-party rights."
              ]} />
            </PolicyCard>

            <PolicyCard number="17" title="Changes to These Terms" icon={FileEdit}>
              <p className="text-[#68646C] leading-relaxed mb-4">We may update these Terms from time to time.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">Material changes will be communicated through the platform or by other reasonable means.</p>
              <p className="text-[#68646C] leading-relaxed">Continued use of the Services after updated Terms become effective constitutes acceptance of the revised Terms.</p>
            </PolicyCard>

            <PolicyCard number="18" title="Governing Law" icon={Globe}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Day1 is established, without regard to conflict of law principles.
              </p>
              <p className="text-[#68646C] leading-relaxed">
                Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in that jurisdiction.
              </p>
            </PolicyCard>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function PolicyCard({
  number,
  title,
  icon: Icon,
  highlighted,
  children,
}: {
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(
      "rounded-2xl border p-6 sm:p-8 shadow-sm",
      highlighted ? "border-[#FF6B45]/30 bg-[#FFF8F3]" : "border-[#E7E4DF] bg-white"
    )}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-[#F6EFE1] text-[#FF6B45] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[#FF6B45] uppercase tracking-wider">Section {number}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1B1A1E]" style={{ fontFamily: "Poppins, sans-serif" }}>
          {title}
        </h2>
      </div>
      <div className="text-[#68646C]">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 mb-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-[#68646C]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B45] mt-2 shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
