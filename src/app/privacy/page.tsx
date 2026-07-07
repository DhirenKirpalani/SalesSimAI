import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import { Shield, Mail, Globe, Lock, FileText, Users, Clock, Cookie, Baby, Plane, RefreshCw, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the Day1 privacy policy to learn how we collect, use, and protect your data and conversation content.",
  alternates: {
    canonical: "https://www.day1app.io/privacy",
  },
};

const SECTIONS = [
  { id: "collect", label: "Information We Collect", icon: FileText },
  { id: "use", label: "How We Use Your Information", icon: Users },
  { id: "ai", label: "AI Processing", icon: Shield },
  { id: "google", label: "Google User Data", icon: Globe },
  { id: "share", label: "Sharing Information", icon: Users },
  { id: "ownership", label: "Organization Data Ownership", icon: FileText },
  { id: "security", label: "Security", icon: Lock },
  { id: "retention", label: "Data Retention", icon: Clock },
  { id: "rights", label: "Your Rights", icon: HelpCircle },
  { id: "cookies", label: "Cookies", icon: Cookie },
  { id: "children", label: "Children's Privacy", icon: Baby },
  { id: "international", label: "International Data Transfers", icon: Plane },
  { id: "changes", label: "Changes to this Policy", icon: RefreshCw },
  { id: "contact", label: "Contact Us", icon: Mail },
];

export default function PrivacyPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Privacy Policy", path: "/privacy" }]} />
      <div className="wrap py-20 lg:py-28">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4">
              <Shield className="w-4 h-4" />
              Legal
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-6" style={{ fontFamily: "Poppins, sans-serif" }}>
              Privacy Policy
            </h1>
            <p className="text-[#68646C] text-lg">
              Effective Date: <strong>July 2026</strong> · Last updated: <strong>July 2026</strong>
            </p>
          </div>

          <div className="space-y-8">
              {/* Intro card */}
              <section className="rounded-2xl border border-[#E7E4DF] bg-white p-6 sm:p-8 shadow-sm">
                <p className="text-[#68646C] leading-relaxed mb-4">
                  Welcome to <strong className="text-[#1B1A1E]">Day1</strong> (&quot;Day1&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                </p>
                <p className="text-[#68646C] leading-relaxed mb-4">
                  Day1 is an AI-powered workspace platform that enables organizations to build knowledge bases, conduct AI-powered simulations, manage organizational knowledge, and collaborate across teams. We are committed to protecting your privacy and handling your personal information responsibly.
                </p>
                <p className="text-[#68646C] leading-relaxed mb-4">
                  This Privacy Policy explains what information we collect, how we use it, when we share it, and the choices available to you when using the Day1 platform, website, and related services (collectively, the &quot;Services&quot;).
                </p>
                <p className="text-[#68646C] leading-relaxed">
                  By accessing or using Day1, you acknowledge that you have read and understood this Privacy Policy.
                </p>
              </section>

              <PolicyCard id="collect" number="1" title="Information We Collect" icon={FileText}>
                <h3 className="text-base font-semibold text-[#1B1A1E] mt-6 mb-2">1.1 Information You Provide</h3>
                <p className="text-[#68646C] leading-relaxed mb-4">When you create an account or use our Services, we may collect information including:</p>
                <BulletList items={[
                  "Full name", "Email address", "Profile photo", "Password (if applicable)", "Organization or company name",
                  "Job title", "Workspace information", "Organization branding (logos, colors, themes)", "Uploaded documents",
                  "Knowledge base content", "Simulation scenarios", "AI prompts and instructions", "Feedback and support requests"
                ]} />

                <h3 className="text-base font-semibold text-[#1B1A1E] mt-6 mb-2">1.2 Google Account Information</h3>
                <p className="text-[#68646C] leading-relaxed mb-4">If you choose to sign in using Google, we may receive:</p>
                <BulletList items={["Name", "Email address", "Profile picture", "Google Account ID"]} />
                <p className="text-[#68646C] leading-relaxed mb-4">We only request the permissions necessary to provide requested functionality.</p>
                <p className="text-[#68646C] leading-relaxed">If additional Google services are connected, such as Google Drive, Gmail, or Google Calendar, we will access only the data explicitly authorized by you.</p>

                <h3 className="text-base font-semibold text-[#1B1A1E] mt-6 mb-2">1.3 Workspace Data</h3>
                <p className="text-[#68646C] leading-relaxed mb-4">Organizations using Day1 may upload:</p>
                <BulletList items={[
                  "Documents", "PDFs", "Presentations", "Knowledge bases", "Policies", "Sales playbooks",
                  "Training materials", "Internal documentation", "Organization settings", "Brand assets", "Team information"
                ]} />
                <p className="text-[#68646C] leading-relaxed">This content remains owned by the organization.</p>

                <h3 className="text-base font-semibold text-[#1B1A1E] mt-6 mb-2">1.4 AI Interaction Data</h3>
                <p className="text-[#68646C] leading-relaxed mb-4">When using AI-powered features, we may process:</p>
                <BulletList items={[
                  "Prompts", "AI conversations", "Chat history", "Generated outputs", "Simulation responses",
                  "Coaching feedback", "Knowledge retrieval requests"
                ]} />
                <p className="text-[#68646C] leading-relaxed mb-4">This processing is necessary to provide AI functionality.</p>

                <h3 className="text-base font-semibold text-[#1B1A1E] mt-6 mb-2">1.5 Usage Information</h3>
                <p className="text-[#68646C] leading-relaxed mb-4">We automatically collect technical information including:</p>
                <BulletList items={[
                  "Browser type", "Device information", "IP address", "Operating system", "Time zone",
                  "Session duration", "Pages visited", "Error logs", "Performance metrics"
                ]} />
              </PolicyCard>

              <PolicyCard id="use" number="2" title="How We Use Your Information" icon={Users}>
                <p className="text-[#68646C] leading-relaxed mb-4">We use your information to:</p>
                <BulletList items={[
                  "Create and manage your account", "Authenticate users", "Provide AI-powered features", "Generate simulations",
                  "Deliver knowledge retrieval", "Personalize your workspace", "Manage organization branding", "Improve platform performance",
                  "Detect fraud or abuse", "Provide customer support", "Communicate product updates", "Maintain platform security",
                  "Comply with legal obligations"
                ]} />
              </PolicyCard>

              <PolicyCard id="ai" number="3" title="AI Processing" icon={Shield}>
                <p className="text-[#68646C] leading-relaxed mb-4">Day1 uses artificial intelligence to deliver various platform features.</p>
                <p className="text-[#68646C] leading-relaxed mb-4">These may include:</p>
                <BulletList items={[
                  "Knowledge retrieval", "AI-generated responses", "Sales simulations", "Conversation analysis",
                  "Coaching recommendations", "Summaries", "Search", "Document understanding"
                ]} />
                <p className="text-[#68646C] leading-relaxed mb-4">Uploaded information may be processed by AI models solely for providing the requested functionality.</p>
                <p className="text-[#68646C] leading-relaxed mb-4">We do not sell your prompts, documents, or AI conversations.</p>
                <p className="text-[#68646C] leading-relaxed">Organizations retain ownership of their uploaded content.</p>
              </PolicyCard>

              <PolicyCard id="google" number="4" title="Google User Data" icon={Globe}>
                <p className="text-[#68646C] leading-relaxed mb-4">If you connect Google services to Day1, we access only the information necessary to provide the requested feature.</p>
                <p className="text-[#68646C] leading-relaxed mb-4">Depending on the permissions granted, this may include:</p>
                <BulletList items={[
                  "Google profile information", "Google Drive files selected by you", "Gmail data explicitly authorized",
                  "Google Calendar events explicitly authorized"
                ]} />
                <p className="text-[#68646C] leading-relaxed mb-4">Google user data is never sold or shared for advertising purposes.</p>
                <p className="text-[#68646C] leading-relaxed">We use Google data solely to provide functionality requested by you.</p>
              </PolicyCard>

              <PolicyCard id="share" number="5" title="Sharing Information" icon={Users}>
                <p className="text-[#68646C] leading-relaxed mb-4">We do not sell your personal information.</p>
                <p className="text-[#68646C] leading-relaxed mb-4">We may share information only with:</p>
                <BulletList items={[
                  "Cloud hosting providers", "Authentication providers", "AI service providers", "Payment providers",
                  "Analytics providers", "Professional advisers", "Government authorities where required by law"
                ]} />
                <p className="text-[#68646C] leading-relaxed">Each provider is required to protect your information appropriately.</p>
              </PolicyCard>

              <PolicyCard id="ownership" number="6" title="Organization Data Ownership" icon={FileText}>
                <p className="text-[#68646C] leading-relaxed mb-4">For organization workspaces:</p>
                <BulletList items={[
                  "Organizations own the documents they upload.", "Organizations own their knowledge bases.",
                  "Organizations own generated workspace content.", "Organization administrators manage member access.",
                  "Members may lose access when removed from an organization."
                ]} />
                <p className="text-[#68646C] leading-relaxed">Day1 does not claim ownership over customer content.</p>
              </PolicyCard>

              <PolicyCard id="security" number="7" title="Security" icon={Lock}>
                <p className="text-[#68646C] leading-relaxed mb-4">We take reasonable administrative, technical, and organizational measures to protect customer information.</p>
                <p className="text-[#68646C] leading-relaxed mb-4">These measures may include:</p>
                <BulletList items={[
                  "HTTPS/TLS encryption", "Secure authentication", "Access controls", "Cloud infrastructure security",
                  "Monitoring and logging", "Backup procedures"
                ]} />
                <p className="text-[#68646C] leading-relaxed">No system is completely secure, and we cannot guarantee absolute security.</p>
              </PolicyCard>

              <PolicyCard id="retention" number="8" title="Data Retention" icon={Clock}>
                <p className="text-[#68646C] leading-relaxed mb-4">We retain information only as long as necessary to:</p>
                <BulletList items={[
                  "Provide our Services", "Meet legal obligations", "Resolve disputes", "Enforce agreements"
                ]} />
                <p className="text-[#68646C] leading-relaxed">Users may request deletion of their accounts, subject to applicable legal requirements.</p>
              </PolicyCard>

              <PolicyCard id="rights" number="9" title="Your Rights" icon={HelpCircle}>
                <p className="text-[#68646C] leading-relaxed mb-4">Depending on your jurisdiction, you may have the right to:</p>
                <BulletList items={[
                  "Access your information", "Correct inaccurate information", "Delete your information", "Export your data",
                  "Object to certain processing", "Withdraw consent where applicable"
                ]} />
                <p className="text-[#68646C] leading-relaxed">Requests may be submitted using the contact information below.</p>
              </PolicyCard>

              <PolicyCard id="cookies" number="10" title="Cookies" icon={Cookie}>
                <p className="text-[#68646C] leading-relaxed mb-4">Day1 uses cookies and similar technologies to:</p>
                <BulletList items={[
                  "Authenticate users", "Remember preferences", "Improve performance", "Analyze usage", "Maintain security"
                ]} />
                <p className="text-[#68646C] leading-relaxed">You may manage cookies through your browser settings.</p>
              </PolicyCard>

              <PolicyCard id="children" number="11" title="Children's Privacy" icon={Baby}>
                <p className="text-[#68646C] leading-relaxed mb-4">Day1 is not intended for children under the age required by applicable law.</p>
                <p className="text-[#68646C] leading-relaxed">We do not knowingly collect information from children.</p>
              </PolicyCard>

              <PolicyCard id="international" number="12" title="International Data Transfers" icon={Plane}>
                <p className="text-[#68646C] leading-relaxed mb-4">Your information may be processed and stored in countries outside your jurisdiction.</p>
                <p className="text-[#68646C] leading-relaxed">Where applicable, we implement appropriate safeguards for international transfers.</p>
              </PolicyCard>

              <PolicyCard id="changes" number="13" title="Changes to this Privacy Policy" icon={RefreshCw}>
                <p className="text-[#68646C] leading-relaxed mb-4">We may update this Privacy Policy from time to time.</p>
                <p className="text-[#68646C] leading-relaxed mb-4">Material changes will be communicated through the platform or by other appropriate means.</p>
                <p className="text-[#68646C] leading-relaxed">Your continued use of Day1 after changes become effective constitutes acceptance of the revised Privacy Policy.</p>
              </PolicyCard>

            </div>
          </div>
      </div>
    </PageLayout>
  );
}

function PolicyCard({
  id,
  number,
  title,
  icon: Icon,
  highlighted,
  children,
}: {
  id: string;
  number: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn(
      "rounded-2xl border p-6 sm:p-8 shadow-sm scroll-mt-28",
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
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
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

