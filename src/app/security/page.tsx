import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { PolicyCard, BulletList } from "@/components/landing/PolicyCard";
import { Metadata } from "next";
import {
  Shield,
  Lock,
  Key,
  Building,
  Server,
  Bot,
  Eye,
  UserCog,
  Activity,
  Database,
  Bug,
  Plug,
  Map,
  Users,
  Mail,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Learn how Day1 protects your workspace data, documents, and AI workflows with industry-standard security practices.",
  alternates: {
    canonical: "https://www.day1app.io/security",
  },
};

export default function SecurityPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Security", path: "/security" }]} />
      <div className="wrap py-12 sm:py-20 lg:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 sm:mb-16">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-3 sm:mb-4">
              <Shield className="w-4 h-4" />
              Trust
            </span>
            <h1 className="text-xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-3 sm:mb-6" style={{ fontFamily: "Poppins, sans-serif" }}>
              Security
            </h1>
            <p className="text-[#68646C] text-sm sm:text-base">
              Last updated: <strong>July 2026</strong>
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {/* Intro */}
            <section className="rounded-2xl border border-[#E7E4DF] bg-gradient-to-b from-white to-[#FFFBF9] p-5 sm:p-6 lg:p-8 shadow-sm text-sm sm:text-base">
              <p className="text-[#68646C] leading-relaxed mb-4">
                At <strong className="text-[#1B1A1E]">Day1</strong>, protecting customer data is one of our highest priorities. We understand that organizations trust us with their business information, documents, and AI-powered workflows.
              </p>
              <p className="text-[#68646C] leading-relaxed">
                We are committed to implementing practical and industry-standard security measures designed to safeguard your data and maintain the reliability of our platform. While no online service can guarantee absolute security, we continuously work to improve our systems and follow security best practices throughout our platform.
              </p>
            </section>

            <PolicyCard number="1" title="Our Security Principles" icon={Shield}>
              <p className="text-[#68646C] leading-relaxed mb-4">Our approach to security is guided by four core principles:</p>
              <BulletList items={[
                "Protect customer data.",
                "Minimize access to sensitive information.",
                "Build secure systems by design.",
                "Continuously improve our security posture."
              ]} />
            </PolicyCard>

            <PolicyCard number="2" title="Data Encryption" icon={Lock}>
              <p className="text-[#68646C] leading-relaxed mb-4">We use encryption to help protect customer information.</p>
              <h3 className="text-base font-semibold text-[#1B1A1E] mt-6 mb-2">Data in Transit</h3>
              <p className="text-[#68646C] leading-relaxed mb-4">
                All communication between your browser, applications, and Day1 is encrypted using HTTPS with Transport Layer Security (TLS). This helps protect information from interception while it is transmitted across the internet.
              </p>
              <h3 className="text-base font-semibold text-[#1B1A1E] mt-6 mb-2">Data at Rest</h3>
              <p className="text-[#68646C] leading-relaxed">
                Customer data stored within our infrastructure is protected using encryption mechanisms provided by our cloud infrastructure providers where applicable.
              </p>
            </PolicyCard>

            <PolicyCard number="3" title="Authentication & Access Control" icon={Key}>
              <p className="text-[#68646C] leading-relaxed mb-4">Day1 provides secure authentication mechanisms designed to protect user accounts.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">Supported authentication methods may include:</p>
              <BulletList items={[
                "Email and password",
                "Google Sign-In (OAuth)",
                "Organization-based authentication",
                "Future enterprise SSO support"
              ]} />
              <p className="text-[#68646C] leading-relaxed">Access to workspaces is permission-based and managed by organization administrators.</p>
            </PolicyCard>

            <PolicyCard number="4" title="Workspace Isolation" icon={Building}>
              <p className="text-[#68646C] leading-relaxed mb-4">Day1 is a multi-tenant platform.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">
                Each organization&apos;s workspace is logically separated from other organizations to help ensure customer data remains isolated.
              </p>
              <p className="text-[#68646C] leading-relaxed">Workspace members can only access information they have been granted permission to view.</p>
            </PolicyCard>

            <PolicyCard number="5" title="Infrastructure Security" icon={Server}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                Our platform is hosted using reputable cloud infrastructure providers designed to deliver secure, scalable, and reliable services.
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">Infrastructure security includes measures such as:</p>
              <BulletList items={[
                "Network protection",
                "Secure cloud environments",
                "Firewall configurations",
                "Availability monitoring",
                "Automated infrastructure management"
              ]} />
            </PolicyCard>

            <PolicyCard number="6" title="AI Security" icon={Bot}>
              <p className="text-[#68646C] leading-relaxed mb-4">AI features are a core part of Day1.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">
                Customer content submitted to AI-powered features is processed solely to provide the requested functionality, such as:
              </p>
              <BulletList items={[
                "Knowledge retrieval",
                "Sales simulations",
                "AI coaching",
                "Content generation",
                "Search",
                "Summarization"
              ]} />
              <p className="text-[#68646C] leading-relaxed mb-4">We do not sell customer prompts, uploaded documents, or AI conversations.</p>
              <p className="text-[#68646C] leading-relaxed">Organizations retain ownership of their content.</p>
            </PolicyCard>

            <PolicyCard number="7" title="Data Privacy" icon={Eye}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                Day1 is designed to collect only the information necessary to provide our Services.
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">
                We do not sell customer data to advertisers or third parties.
              </p>
              <p className="text-[#68646C] leading-relaxed">
                Our collection, processing, and storage of personal information is described in our Privacy Policy.
              </p>
            </PolicyCard>

            <PolicyCard number="8" title="Access Management" icon={UserCog}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                Access to customer information is limited to authorized personnel when necessary for:
              </p>
              <BulletList items={[
                "Platform operations",
                "Technical support",
                "Troubleshooting",
                "Security investigations"
              ]} />
              <p className="text-[#68646C] leading-relaxed">Access is provided only when required and follows internal operational procedures.</p>
            </PolicyCard>

            <PolicyCard number="9" title="Monitoring & Reliability" icon={Activity}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                We monitor the health and performance of our systems to maintain service reliability and identify potential operational issues.
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">Monitoring may include:</p>
              <BulletList items={[
                "Application health",
                "Error tracking",
                "Performance metrics",
                "Availability monitoring",
                "Operational logging"
              ]} />
            </PolicyCard>

            <PolicyCard number="10" title="Backups & Recovery" icon={Database}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                We implement backup and recovery processes designed to help protect customer data against accidental loss or service disruption.
              </p>
              <p className="text-[#68646C] leading-relaxed">
                Recovery procedures are regularly reviewed and improved as our platform evolves.
              </p>
            </PolicyCard>

            <PolicyCard number="11" title="Responsible Disclosure" icon={Bug}>
              <p className="text-[#68646C] leading-relaxed mb-4">We appreciate responsible security research.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">
                If you believe you have discovered a security vulnerability affecting Day1, please report it to us privately.
              </p>
              <div className="rounded-xl bg-[#F6EFE1] border border-[#E7E4DF] p-5 sm:p-6 mb-4">
                <p className="text-[#1B1A1E] font-semibold mb-2">Security Contact</p>
                <p className="text-[#68646C] mb-1">
                  Email: <a href="mailto:security@day1.ai" className="text-[#FF6B45] hover:underline">security@day1.ai</a>
                </p>
              </div>
              <p className="text-[#68646C] leading-relaxed mb-4">Please include:</p>
              <BulletList items={[
                "Description of the issue",
                "Steps to reproduce",
                "Potential impact",
                "Supporting screenshots or evidence if available"
              ]} />
              <p className="text-[#68646C] leading-relaxed">
                We ask that researchers avoid accessing customer data, disrupting services, or publicly disclosing vulnerabilities before they have been addressed.
              </p>
            </PolicyCard>

            <PolicyCard number="12" title="Third-Party Services" icon={Plug}>
              <p className="text-[#68646C] leading-relaxed">
                Day1 integrates with trusted third-party providers to deliver certain platform functionality, including authentication, cloud hosting, AI services, and communications. These providers maintain their own security and privacy practices.
              </p>
            </PolicyCard>

            <PolicyCard number="13" title="Security Roadmap" icon={Map}>
              <p className="text-[#68646C] leading-relaxed mb-4">
                As Day1 continues to grow, we are committed to strengthening our security program.
              </p>
              <p className="text-[#68646C] leading-relaxed mb-4">Areas under continuous improvement include:</p>
              <BulletList items={[
                "Enhanced monitoring and alerting",
                "Expanded access controls",
                "Enterprise authentication options",
                "Security reviews and testing",
                "Infrastructure hardening",
                "Additional compliance and governance initiatives"
              ]} />
            </PolicyCard>

            <PolicyCard number="14" title="Shared Responsibility" icon={Users}>
              <p className="text-[#68646C] leading-relaxed mb-4">Security is a shared responsibility.</p>
              <p className="text-[#68646C] leading-relaxed mb-4">We encourage customers to:</p>
              <BulletList items={[
                "Use strong passwords.",
                "Enable secure authentication methods where available.",
                "Manage workspace permissions carefully.",
                "Review member access regularly.",
                "Protect devices used to access Day1."
              ]} />
            </PolicyCard>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}
