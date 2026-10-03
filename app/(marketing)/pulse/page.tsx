import Link from "next/link"
import { ArrowRight, Compass, ListChecks, MessageSquareText, Gauge } from "lucide-react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  ActStepIllustration,
  ActionPlanIllustration,
  CompetitorsIllustration,
  DetailsStepIllustration,
  OpportunitiesIllustration,
  PulseReportIllustration,
  RunStepIllustration,
  ScanIllustration,
} from "@/components/pulse-illustrations"

const START_HREF = "/signup"
const SALES_HREF = "/contact"

const PROBLEMS = [
  {
    title: "You can't see what customers see",
    body: "Slow pages, broken links and missing search listings quietly cost you leads every week.",
  },
  {
    title: "Competitors move without you noticing",
    body: "New pages, new prices and new campaigns go live while you're busy running the business.",
  },
  {
    title: "Opportunities slip past",
    body: "Grants, tenders, events and partners that fit you close before anyone on your team finds them.",
  },
]

const FEATURES = [
  {
    illustration: ScanIllustration,
    title: "Website & search check",
    body: "We crawl your site and check speed, broken pages, titles and how easy you are to find on search. Every problem comes with where we found it.",
  },
  {
    illustration: CompetitorsIllustration,
    title: "Competitor watch",
    body: "See how rivals position themselves, what they've changed lately, and where they rank ahead of you.",
  },
  {
    illustration: OpportunitiesIllustration,
    title: "Market opportunities",
    body: "Events, partners, tenders and grants that match your industry and location, with dates and links.",
  },
  {
    illustration: ActionPlanIllustration,
    title: "A plan, not just a report",
    body: "Every finding becomes a ranked action with the reason, the evidence and the steps. Tick them off as your team works through them.",
  },
]

const INCLUDED = [
  { icon: Gauge, title: "Health score", body: "One number from 0 to 100 you can track over time." },
  { icon: ListChecks, title: "What to fix first", body: "High, medium and low priority, so the team knows where to start." },
  { icon: Compass, title: "What changed", body: "Run it again and see what's new since the last scan." },
  { icon: MessageSquareText, title: "Ask follow-ups", body: "Ask about competitors, grants or SEO and get answers with sources." },
]

const STEPS = [
  { title: "Confirm your details", body: "Business name, website, industry and location.", illustration: DetailsStepIllustration },
  { title: "Run the scan", body: "Takes a minute or two. Six areas checked.", illustration: RunStepIllustration },
  { title: "Work the plan", body: "Fix, tick off, re-scan, watch the score move.", illustration: ActStepIllustration },
]

const TEAMS = [
  {
    title: "Owners & leadership",
    body: "A plain read on how the business shows up online, without a 40-page agency deck.",
  },
  {
    title: "Marketing teams",
    body: "A ranked to-do list for the website, search and reputation, with proof for each item.",
  },
  {
    title: "Business development",
    body: "A steady list of tenders, grants, events and partners worth chasing.",
  },
]

export default function PulsePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-foreground text-background">
          <div
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_80%_30%,rgba(16,185,129,0.25),transparent),radial-gradient(50%_60%_at_10%_90%,rgba(139,92,246,0.22),transparent)]"
            aria-hidden
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-36 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pb-24 md:pt-44">
            <div>
              <p className="mb-4 text-sm font-medium opacity-70">VisualCNS Pulse</p>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
                Know where your business stands.
              </h1>
              <p className="mt-6 max-w-md text-lg opacity-85">
                One scan of your website, search, competitors and market. A score, what to fix first, and what you&apos;re
                missing.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link
                  href={START_HREF}
                  className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-background px-6 font-medium text-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-background"
                >
                  Get your free scan <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link href="#how" className="font-medium opacity-85 underline-offset-4 hover:opacity-100 hover:underline">
                  See how it works
                </Link>
              </div>
            </div>
            <div className="mx-auto w-full max-w-sm rotate-1 drop-shadow-2xl md:max-w-none">
              <PulseReportIllustration />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Most businesses are guessing about their own health
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Audits are slow, expensive and out of date the week they land. Meanwhile the problems and the openings keep
            changing.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((problem) => (
              <div key={problem.title} className="rounded-2xl border border-border p-6">
                <h3 className="font-semibold">{problem.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{problem.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">Everything in one scan</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Pulse reads your website and public sources, then turns what it finds into a short list of things to do.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <div key={feature.title} className="rounded-2xl border border-border bg-background p-6">
                  <div className="mb-6">
                    <feature.illustration />
                  </div>
                  <span className="text-sm text-muted-foreground">0{index + 1}</span>
                  <h3 className="mt-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Included */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">What every report includes</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {INCLUDED.map((item) => (
              <div key={item.title} className="border-t border-foreground pt-4">
                <item.icon className="mb-3 size-5" aria-hidden />
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Your first report in about two minutes</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative rounded-2xl border border-border bg-background p-6">
                  <div className="mb-5">
                    <step.illustration />
                  </div>
                  <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                  {index < STEPS.length - 1 && (
                    <ArrowRight
                      className="absolute -right-3.5 top-1/2 hidden size-5 -translate-y-1/2 text-muted-foreground md:block"
                      aria-hidden
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Teams */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Built for the people who run the business</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TEAMS.map((team) => (
              <div key={team.title} className="rounded-2xl border border-border p-6">
                <h3 className="font-semibold">{team.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{team.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-16 md:px-8 md:pb-24">
          <div className="mx-auto max-w-6xl rounded-3xl bg-foreground px-6 py-14 text-center text-background md:px-12">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">See your score today</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">
              Add your website and run your first scan. Running more than one business or brand? Talk to us about a team
              plan.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={START_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition-opacity hover:opacity-90"
              >
                Get your free scan <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={SALES_HREF}
                className="inline-flex h-12 items-center justify-center rounded-full border border-background/30 px-6 font-medium transition-colors hover:bg-background/10"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
