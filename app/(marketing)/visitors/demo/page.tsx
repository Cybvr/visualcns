"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, Check, LogIn, LogOut } from "lucide-react"

import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type DemoScreen = "home" | "form" | "signed-in" | "signed-out"

const visitorsPath = "/dashboard/visitors"
const signUpHref = `/signup?next=${encodeURIComponent(visitorsPath)}`
const signInHref = `/login?next=${encodeURIComponent(visitorsPath)}`

/** A public preview. It never calls the visitor API or writes a visitor record. */
export default function VisitorsDemoPage() {
  const [screen, setScreen] = useState<DemoScreen>("home")
  const [showAccountOptions, setShowAccountOptions] = useState(false)
  const [name, setName] = useState("")
  const [host, setHost] = useState("")
  const [checkedIn, setCheckedIn] = useState(false)

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2 || !host) return
    setCheckedIn(true)
    setScreen("signed-in")
  }

  function startOver() {
    setName("")
    setHost("")
    setCheckedIn(false)
    setScreen("home")
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

            {screen === "home" && (
              <div className="flex min-h-[22rem] flex-col justify-center py-8 sm:min-h-[25rem]">
                <h2 className="kiosk-title">Welcome</h2>
                <p className="mt-2 text-muted-foreground">Please sign in so we know you&apos;re here.</p>
                <div className="mt-8 grid gap-3">
                  <Button type="button" onClick={() => setScreen("form")} className="kiosk-big h-16 rounded-2xl">
                    <LogIn className="size-5" aria-hidden="true" /> Sign in
                  </Button>
                  <Button type="button" variant="outline" disabled={!checkedIn} onClick={() => { setCheckedIn(false); setScreen("signed-out") }} className="kiosk-big h-16 rounded-2xl">
                    <LogOut className="size-5" aria-hidden="true" /> Sign out
                  </Button>
                </div>
              </div>
            )}

            {screen === "form" && (
              <form onSubmit={signIn} className="flex min-h-[22rem] flex-col py-6 sm:min-h-[25rem]">
                <button type="button" onClick={() => setScreen("home")} className="mb-6 inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  <ArrowLeft className="size-4" aria-hidden="true" /> Back
                </button>
                <h2 className="kiosk-title">Sign in</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="demo-visitor-name" className="kiosk-label">Your name</Label>
                    <Input id="demo-visitor-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required className="kiosk-field mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="demo-visitor-host" className="kiosk-label">Who are you here to see?</Label>
                    <select id="demo-visitor-host" value={host} onChange={(event) => setHost(event.target.value)} required className="kiosk-field mt-1.5 w-full rounded-md border border-input bg-background px-3 text-foreground">
                      <option value="">Choose a host</option>
                      <option value="Alex">Alex</option>
                      <option value="Jordan">Jordan</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="kiosk-big mt-auto h-16 rounded-2xl">Sign in</Button>
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
