import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import { Shield, Lock, Users, FileCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Learn how Day1 protects your sales conversations, training data, and customer content with enterprise-grade security.",
  alternates: {
    canonical: "https://www.day1app.io/security",
  },
};

const securityItems = [
  {
    icon: Shield,
    title: "SOC 2 Type II certified",
    description: "Our security controls are independently audited and verified on an ongoing basis.",
  },
  {
    icon: Lock,
    title: "Encryption at rest and in transit",
    description: "All data is encrypted using industry-standard protocols, both in transit and when stored.",
  },
  {
    icon: Users,
    title: "Role-based access control",
    description: "Admins define who can access what. Permissions are enforced across simulations, content, and analytics.",
  },
  {
    icon: FileCheck,
    title: "Full audit trails",
    description: "Enterprise plans include detailed logs of access, changes, and exports for compliance and review.",
  },
];

export default function SecurityPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Security", path: "/security" }]} />
      <div className="wrap py-20 lg:py-28">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4">
            Trust
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            Security at Day1
          </h1>
          <p className="text-base sm:text-lg text-[#68646C] leading-relaxed max-w-2xl mb-12">
            Your conversations and content are the foundation of your business. We protect them with enterprise-grade security, strict access controls, and continuous monitoring.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {securityItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#E7E4DF] bg-white p-6 shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-[#F5F4F1] flex items-center justify-center text-[#1B1A1E] mb-5">
                  <item.icon className="w-5 h-5" />
                </div>
                <h2 className="font-semibold text-[#1B1A1E] text-lg mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
                  {item.title}
                </h2>
                <p className="text-sm text-[#68646C] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
