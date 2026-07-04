import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { Metadata } from "next";
import { Shield, Lock, Users, FileCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Security | Day1",
  description: "How Day1 keeps your conversations and content secure.",
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
    <div className="flex flex-col min-h-screen bg-background">
      <LandingNavbar />
      <main className="flex-1 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-[11px] font-semibold text-primary uppercase tracking-[0.15em] mb-4">
            Trust
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.15] tracking-tight text-foreground mb-4">
            Security at Day1
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-12">
            Your conversations and content are the foundation of your business. We protect them with enterprise-grade security, strict access controls, and continuous monitoring.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {securityItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-foreground mb-5">
                  <item.icon className="w-5 h-5" />
                </div>
                <h2 className="font-semibold text-foreground text-lg mb-2">
                  {item.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
