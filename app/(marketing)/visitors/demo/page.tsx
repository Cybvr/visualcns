"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Building2, Check, FileText, LogOut, Phone, User, Users } from "lucide-react"

import { KioskField, KioskHero, KioskSubmit } from "@/components/visitors/kiosk-parts"
import { PoweredBy } from "@/components/visitors/powered-by"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

type DemoScreen = "form" | "signed-in" | "signed-out"

const visitorsPath = "/dashboard/visitors"
const signUpHref = `/signup?next=${encodeURIComponent(visitorsPath)}`

/** A public preview. It never calls the visitor API or writes a visitor record. */
export default function VisitorsDemoPage() {
  const [screen, setScreen] = useState<DemoScreen>("form")
  const [name, setName] = useState("")
  const [visitorCompany, setVisitorCompany] = useState("")
  const [phone, setPhone] = useState("")
  const [host, setHost] = useState("")
  const [purpose, setPurpose] = useState("")
  const [checkedIn, setCheckedIn] = useState(false)
  const [error, setError] = useState("")

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) return setError("Please enter your name.")
    if (!host) return setError("Please pick who you're visiting.")
    setError("")
    setCheckedIn(true)
    setScreen("signed-in")
  }

  function startOver() {
    setName("")
    setVisitorCompany("")
    setPhone("")
    setHost("")
    setPurpose("")
    setError("")
    setCheckedIn(false)
    setScreen("form")
  }

  return (
    <main className="min-h-svh bg-background px-4 py-5 text-foreground sm:px-8 sm:py-8">
      <div className="mx-auto max-w-xl">
          <section aria-label="Interactive reception demo" className="kiosk overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-8">

            {screen === "form" && (
              <form onSubmit={signIn} className="flex flex-col pb-2">
                <KioskHero companyName="ABC Company" />
                <div className="mt-6 space-y-3.5">
                  <KioskField icon={<User />} label="Full Name" htmlFor="demo-visitor-name">
                    <input id="demo-visitor-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required placeholder="Enter your full name" className="kiosk-input" />
                  </KioskField>
                  <KioskField icon={<Building2 />} label="Company (Optional)" htmlFor="demo-visitor-company">
                    <input id="demo-visitor-company" value={visitorCompany} onChange={(event) => setVisitorCompany(event.target.value)} maxLength={120} placeholder="Enter your company name" className="kiosk-input" />
                  </KioskField>
                  <KioskField icon={<Phone />} label="Phone (Optional)" htmlFor="demo-visitor-phone">
                    <input id="demo-visitor-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} placeholder="Enter your phone number" className="kiosk-input" />
                  </KioskField>
                  <KioskField icon={<Users />} label="Person You Are Visiting" htmlFor="demo-visitor-host">
                    <Select value={host} onValueChange={setHost}>
                      <SelectTrigger id="demo-visitor-host" className="kiosk-select"><SelectValue placeholder="Select a person" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alex">Alex</SelectItem>
                        <SelectItem value="Jordan">Jordan</SelectItem>
                      </SelectContent>
                    </Select>
                  </KioskField>
                  <KioskField icon={<FileText />} label="Purpose of Visit" htmlFor="demo-visitor-purpose">
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger id="demo-visitor-purpose" className="kiosk-select"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                      <SelectContent>
                        {["Meeting", "Interview", "Delivery", "Other"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </KioskField>
                </div>
                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                <KioskSubmit />
                {checkedIn && (
                  <button type="button" onClick={() => { setCheckedIn(false); setScreen("signed-out") }} className="kiosk-tile">
                    <LogOut aria-hidden="true" /> Leaving? Sign out
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
            <PoweredBy>
              <span aria-hidden="true">·</span>
              <Link href={signUpHref} className="underline underline-offset-2 hover:text-foreground">Interested?</Link>
            </PoweredBy>
          </section>
      </div>
    </main>
  )
}
