import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Bell, FileSignature, KeyRound, ShieldAlert, Users } from "lucide-react"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  AccessIllustration,
  AlertsIllustration,
  AuditReadyIllustration,
  CheckInIllustration,
  ConnectStackIllustration,
  DirectorySyncIllustration,
  UnboxKioskIllustration,
} from "@/components/pass-illustrations"

const PILOT_HREF = "/contact"
const OVERVIEW_HREF = "#overview"

const RISKS = [
  {
    title: "Compliance violations",
    body: "Exposed guest names and phone numbers violate GDPR, CCPA, and enterprise privacy mandates.",
  },
  {
    title: "Security blind spots",
    body: "No automated cross-referencing with internal watchlists or pre-approved guest lists.",
  },
  {
    title: "Audit prep friction",
    body: "Security teams spend weeks manually piecing together physical visitor records for annual SOC 2 or ITAR audits.",
  },
]

const FEATURES = [
  {
    icon: FileSignature,
    illustration: CheckInIllustration,
    title: "Instant digital check-in & automated NDAs",
    body: "Guests check in via touchscreen or touchless QR code on their mobile device. Custom NDAs, safety waivers, and health questionnaires are signed digitally before entry and stored instantly in your secure cloud vault.",
  },
  {
    icon: KeyRound,
    illustration: AccessIllustration,
    title: "Native access control & badge provisioning",
    body: "Automatically issue temporary RFID badges or mobile wallet passes. VisualCNS Pass syncs natively with enterprise physical access systems, including Brivo, Lenel S2, Genea, and Kisi, restricting visitor access exclusively to authorized zones.",
  },
  {
    icon: Users,
    illustration: DirectorySyncIllustration,
    title: "Single sign-on & directory sync",
    body: "Manage employee hosts effortlessly. Sync directly with Okta, Microsoft Azure AD, and Google Workspace to instantly route visitor notifications, auto-fill host directories, and revoke access permissions in real time.",
  },
  {
    icon: Bell,
    illustration: AlertsIllustration,
    title: "Real-time emergency roll calls & instant alerts",
    body: "When a visitor checks in, host employees receive automated notifications on Slack, Microsoft Teams, or SMS. In an emergency, safety marshals trigger a 1-click live evacuation roll call across all locations directly from any mobile device.",
  },
]

const VERTICALS = [
  {
    title: "Corporate HQs",
    body: "Deliver a VIP guest experience while keeping front-desk queues moving seamlessly.",
  },
  {
    title: "Data centers & tech infrastructure",
    body: "Enforce strict ID scanning, facial matching, watchlist screening, and automated escort mandates.",
  },
  {
    title: "Manufacturing & defense",
    body: "Stay fully compliant with ITAR, EAR, and CMMC physical security controls with automated audit logs.",
  },
]

const STEPS = [
  { title: "Connect stack", body: "Sync Okta & Slack in 3 clicks.", illustration: ConnectStackIllustration },
  { title: "Unbox kiosk", body: "Plug in the pre-configured VisualCNS iPad enclosure.", illustration: UnboxKioskIllustration },
  { title: "Go audit-ready", body: "Automate compliance from day one.", illustration: AuditReadyIllustration },
]

const DEPLOY_POINTS = [
  {
    title: "Zero IT overhead",
    body: "We ship pre-configured, tamper-proof hardware enclosures directly to your facility.",
  },
  {
    title: "Turnkey setup",
    body: "Plug in power, connect to Wi-Fi, and your security policies deploy automatically.",
  },
  {
    title: "Land and expand",
    body: "Test at one high-traffic entrance before expanding across your entire global footprint.",
  },
]

export default function PassPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <main>
        {/* Hero banner: image first, title on top of it */}
        <section className="relative isolate overflow-hidden bg-foreground">
          <Image
            src="/images/visualcns-visitor-reception-nigeria.png"
            alt="A visitor checking in at a VisualCNS Pass kiosk"
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/20" aria-hidden />
          <div className="mx-auto flex min-h-[36rem] max-w-6xl flex-col justify-end px-4 pb-16 pt-36 text-white md:min-h-[42rem] md:px-8 md:pb-24 md:pt-44">
            <p className="mb-4 text-sm font-medium text-white/80">
              Enterprise Visitor Management &amp; Physical Access Security
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
              Turn your front desk into an audit-ready, automated security checkpoint.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/85">
              VisualCNS Pass replaces insecure paper logbooks with instant digital check-ins, automated badge
              provisioning, and zero-trust visitor compliance across all your global offices.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={PILOT_HREF}
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-6 font-medium text-black outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white"
              >
                Request a 30-day hardware pilot <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href={OVERVIEW_HREF}
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-white/40 px-6 font-medium text-white transition-colors hover:bg-white/10"
              >
                Watch the 1-minute overview
              </Link>
            </div>
          </div>
        </section>

        {/* Overview film */}
        <section id="overview" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-10 px-4 py-16 md:grid-cols-[1fr_auto] md:px-8 md:py-24">
          <div>
            <p className="mb-4 text-sm font-medium text-muted-foreground">See it in under a minute</p>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
              From paper visitor book to audit-ready in 48 seconds
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              How visitors sign in, how hosts get told, who gets through which doors, and how every visit is kept on
              record.
            </p>
          </div>
          <video
            className="mx-auto aspect-[9/16] w-full max-w-[20rem] rounded-2xl border border-border bg-foreground"
            src="/marketing/visualcns-pass-9x16.mp4"
            poster="/marketing/visualcns-pass-9x16-poster.jpg"
            controls
            playsInline
            preload="metadata"
            aria-label="VisualCNS Pass overview video"
          />
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Paper visitor logs are your biggest audit risk
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Paper guest books leave personal data visible to every visitor, fail compliance audits, and slow down your
            front desk. Legacy software creates isolated data silos that your IT and security teams can&apos;t control.
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
              Modern physical security built for the enterprise stack
            </h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              VisualCNS Pass connects physical visitor check-ins directly to your existing identity, access control,
              and communication software.
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
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Verticals */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Tailored for high-compliance verticals</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {VERTICALS.map((vertical) => (
              <div key={vertical.title} className="border-t border-foreground pt-4">
                <h3 className="font-semibold">{vertical.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{vertical.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Deploy */}
        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Deploy to your first site in under 15 minutes</h2>
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

        {/* Proof */}
        <section className="mx-auto max-w-4xl px-4 py-16 md:px-8 md:py-24">
          <p className="mb-6 text-sm font-medium text-muted-foreground">Proven results</p>
          <blockquote>
            <p className="text-2xl font-medium leading-snug tracking-tight md:text-3xl">
              &ldquo;VisualCNS Pass cut our security audit preparation time from two weeks to under ten minutes, while
              completely eliminating front-desk check-in bottlenecks across our four regional offices.&rdquo;
            </p>
            <footer className="mt-6 text-sm text-muted-foreground">
              Director of Global Workplace Security, Enterprise SaaS Client
            </footer>
          </blockquote>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-16 md:px-8 md:pb-24">
          <div className="mx-auto max-w-6xl rounded-3xl bg-foreground px-6 py-14 text-center text-background md:px-12">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Ready to secure your front desk?</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">
              Eliminate compliance risks and automate your physical access workflow today. Get a pre-configured kiosk
              shipped to your office for a 30-day risk-free trial.
            </p>
            <Link
              href={PILOT_HREF}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-background px-6 font-medium text-foreground transition-opacity hover:opacity-90"
            >
              Start your enterprise pilot <ArrowRight className="size-4" aria-hidden />
            </Link>
            <p className="mt-4 text-sm opacity-70">No credit card required. Includes dedicated implementation support.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
