import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import { Target, Rocket, Users, TrendingUp, MessageCircle, Sparkles, Lightbulb } from "lucide-react";
import { AboutCta } from "@/components/landing/AboutCta";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Day1 is an AI-powered sales practice platform. Learn why we built it, our philosophy, mission, and vision for continuous sales improvement.",
  alternates: {
    canonical: "https://www.day1app.io/about",
  },
};

const values = [
  {
    icon: Target,
    title: "Deliberate practice",
    description: "Reps improve fastest when they can repeat difficult conversations safely and receive instant feedback.",
  },
  {
    icon: Sparkles,
    title: "AI that coaches",
    description: "Our AI models simulate real buyers, score every response, and surface coaching opportunities at scale.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description: "From first discovery calls to enterprise negotiations, teams use Day1 to prepare before the meeting.",
  },
  {
    icon: TrendingUp,
    title: "Continuous improvement",
    description: "Every conversation is another Day 1. We help reps keep the mindset of a beginner and the skills of an expert.",
  },
];

const stats = [
  { value: "1000+", label: "practice conversations" },
  { value: "24/7", label: "AI coaching availability" },
  { value: "0", label: "real deals put at risk" },
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "About", path: "/about" }]} />
      <LandingNavbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-20 lg:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-block text-[11px] font-semibold text-primary uppercase tracking-[0.15em] mb-6">
              About us
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight text-foreground mb-6">
              Every expert was once on Day 1.
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10">
              Day1 is where sales teams practice the conversations that matter—before they happen with customers.
            </p>
            <AboutCta />
          </div>
        </section>

        {/* Values */}
        <section className="py-16 lg:py-24 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-16 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-16 text-foreground">
              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Why we built Day1</h2>
                </div>
                <p className="text-lg text-muted-foreground">
                  Modern sales teams move fast. Products evolve. Markets change. Customer expectations shift every day.
                </p>
                <p>
                  Yet the way salespeople learn has not changed much. New hires wait weeks before they feel confident. Experienced reps rarely get enough opportunities to practice difficult conversations. Managers do not have enough time to coach every call.
                </p>
                <p>
                  Day1 was created to solve that. We built an AI-powered environment where sales professionals can practice realistic conversations, receive immediate feedback, and improve continuously—without risking real customer relationships.
                </p>
                <p className="font-medium">Because growth happens through repetition.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center p-6 rounded-2xl border border-border bg-card">
                    <div className="font-serif text-3xl sm:text-4xl text-primary mb-2">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Our philosophy</h2>
                </div>
                <p className="text-lg text-muted-foreground">
                  We chose the name <strong>Day1</strong> because learning never ends.
                </p>
                <p>Day1 is not about being a beginner. It is about keeping the mindset of one.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                  {["Curiosity", "Humility", "Practice", "Continuous improvement"].map((word) => (
                    <div key={word} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="font-medium">{word}</span>
                    </div>
                  ))}
                </div>
                <p>
                  The best sales professionals never believe they have finished learning. They approach every customer conversation with the mindset that there is always something new to understand, something better to say, and another opportunity to improve.
                </p>
                <p className="font-medium">Every conversation is another Day 1.</p>
              </div>

              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Target className="w-5 h-5" />
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Our mission</h2>
                </div>
                <p className="text-lg text-muted-foreground">
                  To help every salesperson become more confident before they speak with customers.
                </p>
                <p>
                  We want to make world-class sales coaching available to every individual and every team, regardless of company size. Whether you are preparing for your first discovery call or refining enterprise negotiation skills, Day1 provides a safe place to practice, learn, and grow.
                </p>
              </div>

              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h2 className="font-serif text-2xl sm:text-3xl text-foreground">Our vision</h2>
                </div>
                <p className="text-lg text-muted-foreground">
                  We believe the future of professional learning is conversational.
                </p>
                <p>AI will not replace great salespeople. It will help create more of them.</p>
                <p>
                  Our vision is to build the world&apos;s most intelligent practice platform for customer-facing professionals, enabling continuous learning through realistic conversations, personalized coaching, and actionable insights.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-background p-8 sm:p-10 text-center">
                <h2 className="font-serif text-2xl sm:text-3xl text-foreground mb-4">
                  Built for continuous improvement
                </h2>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Day1 is more than a simulation platform. It is where teams prepare before the meeting, where managers scale coaching, and where confidence is built through deliberate practice.
                </p>
                <p className="font-medium text-foreground">
                  Because every great career starts on Day 1. And the best ones never leave it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground mb-4">
              Ready to make every call your best call?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join teams using Day1 to practice, coach, and close with confidence.
            </p>
            <AboutCta />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
