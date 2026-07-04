import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Day1 team for sales, support, or partnership questions. Book a demo or send us a message.",
  alternates: {
    canonical: "https://www.day1app.io/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Contact", path: "/contact" }]} />
      <LandingNavbar />
      <main className="flex-1 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-[11px] font-semibold text-primary uppercase tracking-[0.15em] mb-4">
            Contact
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-[1.15] tracking-tight text-foreground mb-4">
            Talk to our team
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-12">
            Have questions about pricing, security, or how Day1 fits your team? We are here to help.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-foreground shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground mb-1">Email</h2>
                  <a href="mailto:hello@salessim.ai" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    hello@salessim.ai
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-foreground shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground mb-1">Phone</h2>
                  <a href="tel:+1234567890" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    +1 (234) 567-890
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-foreground shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground mb-1">Office</h2>
                  <p className="text-sm text-muted-foreground">
                    100 Fintech Plaza, Suite 400<br />
                    San Francisco, CA 94105
                  </p>
                </div>
              </div>
            </div>

            <form className="rounded-2xl border border-border bg-card p-6 lg:p-8 shadow-sm space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">Name</label>
                  <Input id="name" placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
                  <Input id="email" type="email" placeholder="jane@company.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-foreground">Company</label>
                <Input id="company" placeholder="Acme Inc." />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-foreground">Message</label>
                <Textarea id="message" placeholder="Tell us about your team and what you need." rows={5} />
              </div>
              <Button type="submit" className="w-full rounded-lg">
                Send message
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
