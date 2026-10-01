import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Building2, Check, ClipboardList, DoorOpen } from "lucide-react"

import { BrandLockup } from "@/components/brand-lockup"
import { VisitorSignupForm } from "@/components/visitors/visitor-signup-form"
import { VISITOR_TRIAL_DAYS } from "@/lib/visitor-billing"

export const metadata: Metadata = {
  title: "Set up Visitor Sign-in | VisualCNS",
  description: "Create your Visitor Sign-in workspace and start welcoming guests.",
}

const steps = [
  { icon: Building2, title: "Name your company", detail: "This labels your visitor sign-in workspace." },
  { icon: Check, title: "Create your account", detail: "Continue with Google or use your email." },
  { icon: ClipboardList, title: "Open your visitor log", detail: "Your Visitors page is ready for setup." },
]

export default function VisitorOnboardingPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="VisualCNS home" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandLockup logoSize={32} />
        </Link>
        <Link href="/visitors/demo" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to demo
        </Link>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-12 pt-5 sm:px-8 md:pt-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:px-12 lg:pb-20">
        <section className="flex flex-col justify-center lg:py-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Visitor Sign-in</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-medium leading-[1.06] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            A smoother welcome starts here.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Set up your company workspace, then manage visitor sign-ins from one place. It takes only a few steps.
          </p>

          <ol className="mt-9 space-y-0">
            {steps.map(({ icon: Icon, title, detail }, index) => (
              <li key={title} className="relative flex gap-4 pb-7 last:pb-0">
                {index < steps.length - 1 && <span aria-hidden="true" className="absolute left-[1.125rem] top-10 h-[calc(100%-1.25rem)] w-px bg-border" />}
                <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="pt-0.5">
                  <span className="block font-medium">{title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{detail}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-9 flex max-w-xl items-start gap-3 border-t border-border pt-5">
            <DoorOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-6 text-muted-foreground">
              Free for {VISITOR_TRIAL_DAYS} days. No card needed. Your account and visitor workspace are created together.
            </p>
          </div>
        </section>

        <section aria-labelledby="onboarding-form-title" className="self-center rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-medium text-primary">Let&apos;s get started</p>
            <h2 id="onboarding-form-title" className="mt-2 text-2xl font-medium tracking-[-0.025em]">Set up your workspace</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter your company name, then continue with Google or email.</p>
          </div>

          <VisitorSignupForm />

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent("/dashboard/visitors")}`} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Sign in</Link>
          </p>
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to our <Link href="/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  )
}
