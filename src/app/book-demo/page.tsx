import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Mail, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Book a Demo",
  description:
    "See how Day1 helps B2B fintech sales teams turn every call into live intelligence. Book a personalized demo with our team.",
  alternates: {
    canonical: "https://www.day1app.io/book-demo",
  },
};

export default function BookDemoPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Book a demo", path: "/book-demo" }]} />
      <div className="wrap py-20 lg:py-28">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4">
            Book a demo
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            See Day1 in action
          </h1>
          <p className="text-base sm:text-lg text-[#68646C] leading-relaxed max-w-2xl mb-12">
            For B2B fintech sales teams and sales leaders. Tell us about your team and we will show you how Day1 turns every call into team-wide readiness.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B1A1E] mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>Personalized walkthrough</h2>
                  <p className="text-sm text-[#68646C]">
                    A 20-minute demo tailored to your team's call workflow and sales motion.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B1A1E] mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>Built for sales leaders</h2>
                  <p className="text-sm text-[#68646C]">
                    See how call intelligence, AI buyer roleplay, and live battle cards fit together.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B1A1E] mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>Questions first</h2>
                  <p className="text-sm text-[#68646C]">
                    Not ready for a demo? Email us at{" "}
                    <a href="mailto:hello@day1.com" className="hover:text-[#FF6B45] transition-colors">
                      hello@day1.com
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>

            <form className="rounded-2xl border border-[#E7E4DF] bg-white p-6 lg:p-8 shadow-sm space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-[#1B1A1E]">Name</label>
                  <Input id="name" placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[#1B1A1E]">Work email</label>
                  <Input id="email" type="email" placeholder="jane@company.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-[#1B1A1E]">Company</label>
                <Input id="company" placeholder="Acme Fintech" />
              </div>
              <div className="space-y-2">
                <label htmlFor="team-size" className="text-sm font-medium text-[#1B1A1E]">Team size</label>
                <Input id="team-size" placeholder="e.g. 20–50 reps" />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-[#1B1A1E]">What would you like to see?</label>
                <Textarea id="message" placeholder="Tell us about your current call workflow and main pain points." rows={4} />
              </div>
              <Button type="submit" className="w-full rounded-lg bg-[#FF6B45] hover:bg-[#ff7d55] text-white">
                Book demo
              </Button>
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
