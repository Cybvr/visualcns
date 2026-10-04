import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Bell, FileSignature, IdCard, ShieldAlert, Users } from "lucide-react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { naira, PLANS, TRIAL_DAYS } from "@/lib/subscription"
import {
  AlertsIllustration,
  AuditReadyIllustration,
  BadgeIllustration,
  CheckInIllustration,
  ConnectStackIllustration,
  DirectorySyncIllustration,
  UnboxKioskIllustration,
} from "@/components/pass-illustrations"

const DEMO_HREF = "/visitors/demo"

type Item = { title: string; body: string; soon?: string[] }

const RISKS: Item[] = [
  {
    title: "Private details on show",
    body: "Every guest can read the names and phone numbers of the people who signed in before them.",
  },
  {
    title: "No clear view of who is on site",
    body: "A paper book can't tell you who is still in the building or who they came to see.",
  },
  {
    title: "Slow audits",
    body: "Your team spends days going through old pages to find one visit.",
  },
]

const FEATURES: (Item & { icon: typeof FileSignature; illustration: () => React.JSX.Element })[] = [
  {
    icon: FileSignature,
    illustration: CheckInIllustration,
    title: "Quick sign-in and signed agreements",
    body: "Visitors sign in on a tablet at the front desk or scan a QR code with their phone. They sign your visitor agreement on screen, and the record is saved straight away.",
  },
  {
    icon: IdCard,
    illustration: BadgeIllustration,
    title: "Visitor badges",
    body: "Print a visitor badge with the guest's name, who they are visiting and your logo.",
    soon: ["RFID or mobile wallet badges"],
  },
  {
    icon: Users,
    illustration: DirectorySyncIllustration,
    title: "Your staff list",
    body: "Add the people visitors can pick as their host. Each host gets told when their guest arrives.",
    soon: ["Okta, Azure AD and Google Workspace directory sync"],
  },
  {
    icon: Bell,
    illustration: AlertsIllustration,
    title: "Instant alerts",
    body: "Hosts get an email when their visitor arrives. You can also send alerts to Slack, Microsoft Teams or any webhook.",
    soon: ["SMS alerts", "One-click evacuation roll call"],
  },
]

const VERTICALS: Item[] = [
  {
    title: "Head offices",
    body: "Give guests a quick, friendly welcome and keep the front desk line short.",
  },
  {
    title: "Data centres and tech sites",
    body: "Know who is on site, who they came to see and when they left.",
    soon: ["ID scanning, face matching and watchlists"],
  },
  {
    title: "Factories and secure sites",
    body: "Keep a full record of every visit, ready when an auditor asks.",
    soon: ["ITAR, CMMC and SOC 2 compliance"],
  },
]

const STEPS: Item[] = [
  { title: "Add your staff", body: "Add your hosts and turn on Slack or Teams alerts if you use them." },
  {
    title: "Open it on a tablet",
    body: "Open your sign-in page on a tablet at the front desk.",
    soon: ["Pre-configured iPad kiosks shipped to you"],
  },
  { title: "Keep every record", body: "Every visit is saved, so you can find any visitor in seconds." },
]
const STEP_ILLUSTRATIONS = [ConnectStackIllustration, UnboxKioskIllustration, AuditReadyIllustration]

const DEPLOY_POINTS = [
  {
    title: "No special hardware",
    body: "It runs in the browser on a tablet you already have.",
  },
  {
    title: "Simple setup",
    body: "Add your staff, open the sign-in page and you're ready.",
  },
  {
    title: "Start small",
    body: "Try it at one front desk, then add your other offices.",
  },
]

const FAQS = [
  {
    question: "What is Pass?",
    answer: "Pass is VisualCNS Visitor Sign-in, a digital visitor book for your front desk. Visitors sign in on a tablet at reception, or on their own phone by scanning a QR code. The person they're visiting gets an email, and every visit is kept on record.",
  },
  {
    question: "How does it work?",
    answer: "A visitor signs in on the tablet at reception, or on their own phone. They pick who they're here to see, and that person gets an email straight away. You always know who's in the building, and they sign out when they leave.",
  },
  {
    question: "What else can it do?",
    answer: "Visitors can sign in and out on their own phone with a QR code. You can add your visitor terms, NDA or safety rules for visitors to agree to. Visitors can print a badge. Sign-in alerts can go to Slack, Microsoft Teams or a webhook. You can see who's in now, look back at past visits and download them as a spreadsheet. If the internet drops, the tablet saves sign-ins and sends them when it's back.",
  },
  {
    question: "How much does it cost?",
    answer: `Pass is part of every VisualCNS plan. Starter is ${naira(PLANS.starter.monthlyNaira)} a month for up to ${PLANS.starter.staff} staff, Business is ${naira(PLANS.business.monthlyNaira)} a month for up to ${PLANS.business.staff} staff, and Pro is ${naira(PLANS.pro.monthlyNaira)} a month for unlimited staff. Pay yearly and get 2 months free. Every plan also includes Pulse and Ngai.`,
  },
  {
    question: "Is there a free trial?",
    answer: `Yes. ${TRIAL_DAYS} days, no card needed.`,
  },
  {
    question: "What does \"staff\" mean?",
    answer: "Staff are the people visitors can choose to visit. They get an email when their visitor arrives.",
  },
  {
    question: "What if our sign-in link gets shared?",
    answer: "You can swap it for a new link or QR code in seconds, and the old one stops working straight away.",
  },
  {
    question: "Can I try it first?",
    answer: "Yes. The demo shows exactly what visitors see. It doesn't save anything.",
  },
]

function ComingSoon({ items, className = "" }: { items?: string[]; className?: string }) {
  if (!items?.length) return null
  return (
    <ul className={`mt-3 flex flex-col gap-2 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{item}</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">
            Coming soon
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function PassPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <main>
        {/* Hero banner: image first, title on top of it */}
        <section className="relative isolate overflow-hidden bg-foreground">
          <Image
            src="/images/visualcns-visitor-reception-nigeria.png"
            alt="A visitor signing in at a VisualCNS Pass tablet"
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/30 to-transparent" aria-hidden />
          <div className="mx-auto flex min-h-[36rem] max-w-6xl flex-col justify-end px-4 pb-16 pt-36 text-white md:min-h-[42rem] md:px-8 md:pb-24 md:pt-44">
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              Know who&apos;s in your building.
            </h1>
            <p className="mt-6 max-w-md text-lg text-white/85">
              Pass is VisualCNS Visitor Sign-in: digital sign-in, visitor badges and a record of every visit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href={DEMO_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-6 font-medium text-black outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white"
              >
                Try the demo <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            A paper visitor book causes more problems than it solves
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            It shows personal details to every guest, slows down your front desk and is hard to check when you need it.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {RISKS.map((risk) => (
              <div key={risk.title} className="rounded-2xl border border-border p-6">
                <ShieldAlert className="mb-4 size-5 text-muted-foreground" aria-hidden />
                <h3 className="font-semibold">{risk.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{risk.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
              Everything your front desk needs
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Pass handles sign-in, tells hosts their guest is here and keeps a record of every visit.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <div key={feature.title} className="rounded-2xl border border-border bg-background p-6">
                  <div className="mb-6">
                    <feature.illustration />
                  </div>
                  <div className="mb-4 flex items-center gap-3">
                    <feature.icon className="size-5" aria-hidden />
                    <span className="text-sm text-muted-foreground">0{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
                  <ComingSoon items={feature.soon} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verticals */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Made for busy and secure sites</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {VERTICALS.map((vertical) => (
              <div key={vertical.title} className="border-t border-foreground pt-4">
                <h3 className="font-semibold">{vertical.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{vertical.body}</p>
                <ComingSoon items={vertical.soon} />
              </div>
            ))}
          </div>
        </section>

        {/* Setup */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Getting started is simple</h2>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => {
                const Illustration = STEP_ILLUSTRATIONS[index]
                return (
                  <li key={step.title} className="relative rounded-2xl border border-border bg-background p-6">
                    <div className="mb-5">
                      <Illustration />
                    </div>
                    <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                      {index + 1}
                    </span>
                    <h3 className="mt-4 font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                    <ComingSoon items={step.soon} />
                    {index < STEPS.length - 1 && (
                      <ArrowRight
                        className="absolute -right-3.5 top-1/2 hidden size-5 -translate-y-1/2 text-muted-foreground md:block"
                        aria-hidden
                      />
                    )}
                  </li>
                )
              })}
            </ol>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {DEPLOY_POINTS.map((point) => (
                <div key={point.title}>
                  <h3 className="font-semibold">{point.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Questions</h2>
          <Accordion type="multiple" className="mt-8 max-w-4xl">
            {FAQS.map((faq, index) => (
              <AccordionItem key={faq.question} value={`pass-faq-${index}`}>
                <AccordionTrigger className="gap-6 py-5 text-left text-lg hover:no-underline">{faq.question}</AccordionTrigger>
                <AccordionContent className="max-w-3xl pb-6 text-base leading-7 text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-6xl rounded-3xl bg-foreground px-6 py-14 text-center text-background md:px-12">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Ready to replace your paper visitor book?</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">
              Try the demo to see how your visitors will sign in.
            </p>
            <Link
              href={DEMO_HREF}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition-opacity hover:opacity-90"
            >
              Try the demo <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
