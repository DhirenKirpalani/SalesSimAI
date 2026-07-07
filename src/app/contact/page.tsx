import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Day1 team for sales, support, or partnership questions. Send us a message.",
  alternates: {
    canonical: "https://www.day1app.io/contact",
  },
};

export default function ContactPage() {
  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Contact", path: "/contact" }]} />
      <div className="wrap py-20 lg:py-28">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4">
            Contact
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            Talk to our team
          </h1>
          <p className="text-base sm:text-lg text-[#68646C] leading-relaxed max-w-2xl mb-12">
            Have questions about pricing, security, or how Day1 fits your team? We are here to help.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B1A1E] mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>Email</h2>
                  <a href="mailto:hello@day1.com" className="text-sm text-[#68646C] hover:text-[#FF6B45] transition-colors">
                    hello@day1.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B1A1E] mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>Phone</h2>
                  <a href="tel:+1234567890" className="text-sm text-[#68646C] hover:text-[#FF6B45] transition-colors">
                    +1 (234) 567-890
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B1A1E] mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>Office</h2>
                  <p className="text-sm text-[#68646C]">
                    100 Fintech Plaza, Suite 400<br />
                    San Francisco, CA 94105
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
                  <label htmlFor="email" className="text-sm font-medium text-[#1B1A1E]">Email</label>
                  <Input id="email" type="email" placeholder="jane@company.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-[#1B1A1E]">Company</label>
                <Input id="company" placeholder="Acme Inc." />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-[#1B1A1E]">Message</label>
                <Textarea id="message" placeholder="Tell us about your team and what you need." rows={5} />
              </div>
              <Button type="submit" className="w-full rounded-lg bg-[#FF6B45] hover:bg-[#ff7d55] text-white">
                Send message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
