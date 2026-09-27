"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowRight, Building2, Check, FileText, LogOut, User, Users } from "lucide-react"

import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"

type DemoScreen = "form" | "signed-in" | "signed-out"

const visitorsPath = "/dashboard/visitors"
const signUpHref = `/signup?next=${encodeURIComponent(visitorsPath)}`
const signInHref = `/login?next=${encodeURIComponent(visitorsPath)}`

/** A public preview. It never calls the visitor API or writes a visitor record. */
export default function VisitorsDemoPage() {
  const [screen, setScreen] = useState<DemoScreen>("form")
  const [showAccountOptions, setShowAccountOptions] = useState(false)
  const [name, setName] = useState("")
  const [visitorCompany, setVisitorCompany] = useState("")
  const [host, setHost] = useState("")
  const [purpose, setPurpose] = useState("")
  const [checkedIn, setCheckedIn] = useState(false)

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2 || !host) return
    setCheckedIn(true)
    setScreen("signed-in")
  }

  function startOver() {
    setName("")
    setVisitorCompany("")
    setHost("")
    setPurpose("")
    setCheckedIn(false)
    setScreen("form")
  }

  return (
    <main className="min-h-svh bg-background px-4 py-5 text-foreground sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <Link href="/" aria-label="VisualHQ home" className="outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandLockup logoSize={28} gapClassName="gap-1" />
          </Link>
          <span className="text-sm text-muted-foreground">Visitors</span>
        </header>

        <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:py-20">
          <section className="order-2 max-w-lg lg:order-1">
            <h1 className="text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">Visitor sign-in, without the paper book.</h1>
            <div className="mt-10 border-t border-border pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAccountOptions((shown) => !shown)}
                aria-expanded={showAccountOptions}
                aria-controls="visitor-demo-account-options"
              >
                Interested?
              </Button>
              {showAccountOptions && (
                <div id="visitor-demo-account-options" className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild><Link href={signUpHref}>Create account</Link></Button>
                    <Button asChild variant="outline"><Link href={signInHref}>Sign in</Link></Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section aria-label="Interactive reception demo" className="kiosk order-1 min-h-[29rem] rounded-2xl border border-border bg-card p-5 sm:p-8 lg:order-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-5">
              <p className="font-semibold">Reception</p>
              <p className="text-xs text-muted-foreground">Preview</p>
            </div>

            {screen === "form" && (
              <form onSubmit={signIn} className="flex flex-col py-6">
                <p className="text-muted-foreground">Welcome to</p>
                <h2 className="kiosk-title">ABC Company</h2>
                <p className="mt-1 text-muted-foreground">Please sign in as a visitor</p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-4 rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
                    <User className="mt-3 size-6 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <label htmlFor="demo-visitor-name" className="kiosk-label block">Full name</label>
                      <input id="demo-visitor-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required placeholder="Enter your full name" className="kiosk-input" />
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
                    <Building2 className="mt-3 size-6 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <label htmlFor="demo-visitor-company" className="kiosk-label block">Company (optional)</label>
                      <input id="demo-visitor-company" value={visitorCompany} onChange={(event) => setVisitorCompany(event.target.value)} maxLength={120} placeholder="Enter your company name" className="kiosk-input" />
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
                    <Users className="mt-3 size-6 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <label htmlFor="demo-visitor-host" className="kiosk-label block">Person you are visiting</label>
                      <select id="demo-visitor-host" value={host} onChange={(event) => setHost(event.target.value)} required className="kiosk-input">
                        <option value="">Select a person</option>
                        <option value="Alex">Alex</option>
                        <option value="Jordan">Jordan</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
                    <FileText className="mt-3 size-6 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <label htmlFor="demo-visitor-purpose" className="kiosk-label block">Purpose of visit</label>
                      <select id="demo-visitor-purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} className="kiosk-input">
                        <option value="">Select purpose</option>
                        <option>Meeting</option>
                        <option>Interview</option>
                        <option>Delivery</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="kiosk-big mt-6 h-16 justify-between rounded-2xl px-6">
                  <span className="flex-1 text-center">Sign in</span>
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Button>
                {checkedIn && (
                  <button type="button" onClick={() => { setCheckedIn(false); setScreen("signed-out") }} className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                    <LogOut className="size-4" aria-hidden="true" /> Leaving? Sign out
                  </button>
                )}
              </form>
            )}

            {screen === "signed-in" && (
              <div className="flex min-h-[22rem] flex-col items-center justify-center py-8 text-center sm:min-h-[25rem]">
                <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-7" aria-hidden="true" /></span>
                <h2 className="kiosk-title mt-5">Welcome, {name.trim().split(/\s+/)[0]}</h2>
                <p className="mt-2 max-w-sm text-muted-foreground">You&apos;re checked in.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => { setCheckedIn(false); setScreen("signed-out") }}>Try sign-out</Button>
                  <Button type="button" variant="outline" onClick={startOver}>Start over</Button>
                </div>
              </div>
            )}

            {screen === "signed-out" && (
              <div className="flex min-h-[22rem] flex-col items-center justify-center py-8 text-center sm:min-h-[25rem]">
                <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-7" aria-hidden="true" /></span>
                <h2 className="kiosk-title mt-5">You&apos;re signed out</h2>
                <Button type="button" onClick={startOver} className="mt-8">Start over</Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
