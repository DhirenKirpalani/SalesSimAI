"use client";

import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Mail, Users, User, Building2, UsersRound, MessageSquare } from "lucide-react";
import { useState, FormEvent, useRef } from "react";

export default function BookDemoPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const form = formRef.current;
    if (!form) {
      setStatus("error");
      setErrorMsg("Form not found.");
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      company: String(formData.get("company") ?? "").trim(),
      teamSize: String(formData.get("team-size") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    if (!payload.name || !payload.email || !payload.company) {
      setStatus("error");
      setErrorMsg("Please fill in name, email, and company.");
      return;
    }

    try {
      const res = await fetch("/api/book-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send demo request");
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      console.error("[book-demo] submit error:", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "Book a demo", path: "/book-demo" }]} />
      <div className="wrap py-12 sm:py-20 lg:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-3 sm:mb-4">
            Book a demo
          </span>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[#1B1A1E] mb-3 sm:mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            See Day1 in action
          </h1>
          <p className="text-base sm:text-lg text-[#68646C] leading-relaxed max-w-2xl mb-8 sm:mb-12">
            For B2B fintech sales teams and sales leaders. Tell us about your team and we will show you how Day1 turns every call into team-wide readiness.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl sm:rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0 shadow-sm">
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
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl sm:rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0 shadow-sm">
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
                <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl sm:rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0 shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-[#1B1A1E] mb-1" style={{ fontFamily: "Poppins, sans-serif" }}>Questions first</h2>
                  <p className="text-sm text-[#68646C]">
                    Not ready for a demo? Email us at{" "}
                    <a href="mailto:demo@day1app.io" className="hover:text-[#FF6B45] transition-colors">
                      demo@day1app.io
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="rounded-2xl border border-[#E7E4DF] bg-gradient-to-b from-white to-[#FFFBF9] p-5 sm:p-6 lg:p-8 shadow-lg shadow-[#FF6B45]/10 space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-[#1B1A1E]">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A96A0] pointer-events-none" />
                    <Input id="name" name="name" placeholder="Jane Doe" className="h-12 pl-10 rounded-xl" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[#1B1A1E]">Work email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A96A0] pointer-events-none" />
                    <Input id="email" name="email" type="email" placeholder="jane@company.com" className="h-12 pl-10 rounded-xl" required />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-[#1B1A1E]">Company</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A96A0] pointer-events-none" />
                  <Input id="company" name="company" placeholder="Acme Fintech" className="h-12 pl-10 rounded-xl" required />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="team-size" className="text-sm font-medium text-[#1B1A1E]">Team size</label>
                <div className="relative">
                  <UsersRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A96A0] pointer-events-none" />
                  <Input id="team-size" name="team-size" placeholder="e.g. 20–50 reps" className="h-12 pl-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-[#1B1A1E]">What would you like to see?</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-[#9A96A0] pointer-events-none" />
                  <Textarea id="message" name="message" placeholder="Tell us about your current call workflow and main pain points." rows={4} className="pl-10 rounded-xl" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-12 rounded-xl bg-[#FF6B45] hover:bg-[#ff7d55] text-white text-base font-semibold disabled:opacity-60"
              >
                {status === "loading" ? "Sending..." : "Book demo"}
              </Button>
              {status === "success" && (
                <p className="text-sm text-green-600">Thanks — we'll be in touch to schedule your demo.</p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-600">{errorMsg || "Something went wrong. Please try again."}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
