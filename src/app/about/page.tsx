import { PageLayout } from "@/components/landing/PageLayout";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { Metadata } from "next";
import { Target, Rocket, Users, TrendingUp, MessageCircle, Sparkles, Lightbulb } from "lucide-react";
import Link from "next/link";

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
    <PageLayout>
      <BreadcrumbJsonLd items={[{ label: "Home", path: "/" }, { label: "About", path: "/about" }]} />
      <main className="flex-1">
        {/* Hero */}
        <section className="about-page relative overflow-hidden py-16 sm:py-20 lg:py-28">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#FF6B45]/[0.04] rounded-full blur-[120px]" />
          </div>
          <div className="relative wrap text-center px-4 sm:px-6">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#FF6B45] mb-4 sm:mb-6">
              About us
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl leading-[1.1] font-bold text-[#1B1A1E] mb-4 sm:mb-6">
              Every expert was once on Day 1.
            </h1>
            <p className="text-base sm:text-xl text-[#68646C] leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10">
              Day1 is where sales teams practice the conversations that matter—before they happen with customers.
            </p>
            <Link className="btn btn-primary inline-flex w-full sm:w-auto justify-center" href="/book-demo">Book a demo →</Link>
          </div>
        </section>

        {/* Values */}
        <section className="py-12 sm:py-16 lg:py-24 border-y border-[#E7E4DF] bg-white">
          <div className="wrap px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {values.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#E7E4DF] bg-gradient-to-b from-white to-[#FFFBF9] p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#FFF0EA] flex items-center justify-center text-[#FF6B45] mb-4">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-[#1B1A1E] mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>{item.title}</h3>
                  <p className="text-sm text-[#68646C] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="about-page py-12 sm:py-16 lg:py-24">
          <div className="wrap px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-12 sm:space-y-16 text-[#1B1A1E]">
              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#FFF0EA] flex items-center justify-center text-[#FF6B45]">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1A1E]">Why we built Day1</h2>
                </div>
                <p className="text-lg text-[#68646C]">
                  Modern sales teams move fast. Products evolve. Markets change. Customer expectations shift every day.
                </p>
                <p className="text-[#68646C]">
                  Yet the way salespeople learn has not changed much. New hires wait weeks before they feel confident. Experienced reps rarely get enough opportunities to practice difficult conversations. Managers do not have enough time to coach every call.
                </p>
                <p className="text-[#68646C]">
                  Day1 was created to solve that. We built an AI-powered environment where sales professionals can practice realistic conversations, receive immediate feedback, and improve continuously—without risking real customer relationships.
                </p>
                <p className="font-medium text-[#1B1A1E]">Because growth happens through repetition.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center p-5 sm:p-6 rounded-2xl border border-[#E7E4DF] bg-gradient-to-b from-white to-[#FFFBF9] shadow-sm">
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#FF6B45] mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>{stat.value}</div>
                    <div className="text-sm text-[#68646C]">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#FFF0EA] flex items-center justify-center text-[#FF6B45]">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1A1E]">Our philosophy</h2>
                </div>
                <p className="text-lg text-[#68646C]">
                  We chose the name <strong className="text-[#1B1A1E]">Day1</strong> because learning never ends.
                </p>
                <p className="text-[#68646C]">Day1 is not about being a beginner. It is about keeping the mindset of one.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                  {["Curiosity", "Humility", "Practice", "Continuous improvement"].map((word) => (
                    <div key={word} className="flex items-center gap-3 rounded-xl border border-[#E7E4DF] bg-white px-4 py-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B45]" />
                      <span className="font-medium text-[#1B1A1E]">{word}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[#68646C]">
                  The best sales professionals never believe they have finished learning. They approach every customer conversation with the mindset that there is always something new to understand, something better to say, and another opportunity to improve.
                </p>
                <p className="font-medium text-[#1B1A1E]">Every conversation is another Day 1.</p>
              </div>

              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#FFF0EA] flex items-center justify-center text-[#FF6B45]">
                    <Target className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1A1E]">Our mission</h2>
                </div>
                <p className="text-lg text-[#68646C]">
                  To help every salesperson become more confident before they speak with customers.
                </p>
                <p className="text-[#68646C]">
                  We want to make world-class sales coaching available to every individual and every team, regardless of company size. Whether you are preparing for your first discovery call or refining enterprise negotiation skills, Day1 provides a safe place to practice, learn, and grow.
                </p>
              </div>

              <div className="space-y-4 leading-relaxed">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#FFF0EA] flex items-center justify-center text-[#FF6B45]">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1A1E]">Our vision</h2>
                </div>
                <p className="text-lg text-[#68646C]">
                  We believe the future of professional learning is conversational.
                </p>
                <p className="text-[#68646C]">AI will not replace great salespeople. It will help create more of them.</p>
                <p className="text-[#68646C]">
                  Our vision is to build the world&apos;s most intelligent practice platform for customer-facing professionals, enabling continuous learning through realistic conversations, personalized coaching, and actionable insights.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7E4DF] bg-gradient-to-br from-[#FFF0EA] to-white p-8 sm:p-10 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1A1E] mb-4">
                  Built for continuous improvement
                </h2>
                <p className="text-[#68646C] mb-6 max-w-xl mx-auto">
                  Day1 is more than a simulation platform. It is where teams prepare before the meeting, where managers scale coaching, and where confidence is built through deliberate practice.
                </p>
                <p className="font-medium text-[#1B1A1E]">
                  Because every great career starts on Day 1. And the best ones never leave it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16 lg:py-24 border-t border-[#E7E4DF] bg-white">
          <div className="wrap text-center px-4 sm:px-6">
            <h2 className="text-2xl sm:text-4xl font-bold text-[#1B1A1E] mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
              Ready to make every call your best call?
            </h2>
            <p className="text-base text-[#68646C] mb-6 sm:mb-8 max-w-xl mx-auto">
              Join teams using Day1 to practice, coach, and close with confidence.
            </p>
            <Link className="btn btn-primary inline-flex w-full sm:w-auto justify-center" href="/book-demo">Book a demo →</Link>
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
