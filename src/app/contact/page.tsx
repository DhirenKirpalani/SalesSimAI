"use client";

import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail } from "lucide-react";
import { useState, FormEvent, useRef } from "react";

export default function ContactPage() {
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
      message: String(formData.get("message") ?? "").trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus("error");
      setErrorMsg("Please fill in name, email, and message.");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message");
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      console.error("[contact] submit error:", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

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
            <div className="space-y-6">
              <a href="mailto:support@day1app.io" className="flex items-center gap-3 text-[#1B1A1E] font-medium hover:text-[#FF6B45] transition-colors">
                <div className="w-10 h-10 rounded-lg border border-[#E7E4DF] bg-white flex items-center justify-center text-[#FF6B45] shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                support@day1app.io
              </a>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="rounded-2xl border border-[#E7E4DF] bg-white p-6 lg:p-8 shadow-sm space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-[#1B1A1E]">Name</label>
                  <Input id="name" name="name" placeholder="Jane Doe" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[#1B1A1E]">Email</label>
                  <Input id="email" name="email" type="email" placeholder="jane@company.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="company" className="text-sm font-medium text-[#1B1A1E]">Company</label>
                <Input id="company" name="company" placeholder="Acme Inc." />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-[#1B1A1E]">Message</label>
                <Textarea id="message" name="message" placeholder="Tell us about your team and what you need." rows={5} required />
              </div>
              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-lg bg-[#FF6B45] hover:bg-[#ff7d55] text-white disabled:opacity-60"
              >
                {status === "loading" ? "Sending..." : "Send message"}
              </Button>
              {status === "success" && (
                <p className="text-sm text-green-600">Thanks — your message has been sent to our team.</p>
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
