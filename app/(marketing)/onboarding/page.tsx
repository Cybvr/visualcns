"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Building2, Loader2, Globe } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trackMetaLead } from "@/components/meta-pixel"

function onboardingError(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  return message && !message.startsWith("Firebase") ? message : "We couldn’t save your company details. Please try again."
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/\s/.test(trimmed) || (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed))) return null
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    return url.hostname ? url.toString() : null
  } catch {
    return null
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading, joinVisitorCompany } = useAuth()
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [step, setStep] = useState<1 | 2>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && !user) router.replace(`/signup?next=${encodeURIComponent("/onboarding")}`)
  }, [loading, user, router])

  function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyName.trim()) {
      setError("Enter your company name to continue.")
      return
    }
    setError("")
    setStep(2)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedWebsite = normalizeWebsite(website)
    if (normalizedWebsite === null) {
      setError("Enter a valid website, like cnn.com.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const { slug, existing, leadEventId } = await joinVisitorCompany(companyName.trim(), { website: normalizedWebsite })
      if (!existing) trackMetaLead(leadEventId)
      router.replace(`/${encodeURIComponent(slug)}/visitors`)
    } catch (err) {
      setError(onboardingError(err))
      setSaving(false)
    }
  }

  if (loading || !user) {
    return <main className="flex min-h-svh items-center justify-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading account" /></main>
  }

  return (
    <main className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="VisualCNS home" className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandLockup logoSize={32} />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-12 pt-5 sm:px-8">
        <section aria-labelledby="company-setup-title" className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-9">
          <div className="mb-7 flex items-center gap-2" role="progressbar" aria-label="Company setup" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step} aria-valuetext={`Step ${step} of 2`}>
            <span className="h-1.5 flex-1 rounded-full bg-primary" />
            <span className={`h-1.5 flex-1 rounded-full ${step === 2 ? "bg-primary" : "bg-border"}`} />
            <span className="ml-2 text-xs tabular-nums text-muted-foreground">{step} / 2</span>
          </div>

          <h1 id="company-setup-title" className="text-3xl font-medium tracking-[-0.025em] sm:text-4xl">
            {step === 1 ? "Name your company" : "Add your website"}
          </h1>
          {step === 2 && <p className="mt-2 text-sm text-muted-foreground">Optional. Add it now or later.</p>}

          <form onSubmit={step === 1 ? nextStep : submit} className="mt-7 space-y-5">
            {step === 1 ? (
              <div className="space-y-2">
                <Label htmlFor="onboarding-company-name">Company name</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="onboarding-company-name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Your company" autoComplete="organization" maxLength={120} required className="h-11 pl-10" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="onboarding-website">Website</Label>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="onboarding-website" type="text" inputMode="url" autoComplete="url" value={website} onChange={(event) => { setWebsite(event.target.value); setError("") }} placeholder="example.com" disabled={saving} className="h-11 pl-10" />
                </div>
              </div>
            )}

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-3">
              {step === 2 && (
                <Button type="button" variant="ghost" size="lg" className="h-11" disabled={saving} onClick={() => { setStep(1); setError("") }}>
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </Button>
              )}
              <Button type="submit" size="lg" className="h-11 flex-1" disabled={saving} aria-busy={saving}>
                {saving ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Creating…</> : <>{step === 1 ? "Continue" : "Create company"} <ArrowRight className="size-4" aria-hidden="true" /></>}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
