"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Building2, Check, FileText, LogIn, LogOut, Phone, User, Users } from "lucide-react"

import { KioskField, KioskNameList, KioskSubmit, type KioskTab } from "@/components/visitors/kiosk-parts"
import { PoweredBy } from "@/components/visitors/powered-by"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { shortName } from "@/lib/kiosk-offline"
import { VISITOR_TRIAL_DAYS } from "@/lib/visitor-billing"

type DemoScreen = "start" | KioskTab | "signed-in" | "signed-out"
type DemoVisitor = { id: string; name: string; at: number }

// After onboarding, bring them back to this demo.
const SIGNUP_HREF = `/signup?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent("/visitors/demo")}`)}`
const HOSTS = ["Tunde Bello", "Ngozi Eze", "Kemi Adeyemi"]
const PURPOSES = ["Meeting", "Interview", "Delivery", "Collection", "Maintenance", "Personal", "Other"]

function sampleVisitors(): DemoVisitor[] {
  const now = Date.now()
  return [
    { id: "demo-1", name: "Chidi O.", at: now - 95 * 60000 },
    { id: "demo-2", name: "Aisha B.", at: now - 52 * 60000 },
    { id: "demo-3", name: "Femi A.", at: now - 18 * 60000 },
  ]
}

/** A public preview. It never calls the visitor API or writes a visitor record. */
export default function VisitorsDemoPage() {
  // A plain first screen with two big choices, so the form isn't the first thing people see.
  const [screen, setScreen] = useState<DemoScreen>("start")
  const [onSite, setOnSite] = useState<DemoVisitor[]>(sampleVisitors)
  const [name, setName] = useState("")
  const [visitorCompany, setVisitorCompany] = useState("")
  const [phone, setPhone] = useState("")
  const [host, setHost] = useState("")
  const [purpose, setPurpose] = useState("")
  const [error, setError] = useState("")
  const [lastName, setLastName] = useState("")

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) return setError("Please enter your name.")
    if (!host) return setError("Please pick who you're visiting.")
    setError("")
    setOnSite((list) => [{ id: `demo-${Date.now()}`, name: shortName(name.trim()), at: Date.now() }, ...list])
    setLastName(name.trim())
    setScreen("signed-in")
  }

  function signOut(id: string) {
    setLastName(onSite.find((visitor) => visitor.id === id)?.name || "")
    setOnSite((list) => list.filter((visitor) => visitor.id !== id))
    setScreen("signed-out")
  }

  function done() {
    setName("")
    setVisitorCompany("")
    setPhone("")
    setHost("")
    setPurpose("")
    setError("")
    setScreen("start")
  }

  return (
    <main className="kiosk kiosk-page flex min-h-svh flex-col bg-card text-foreground">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-3 text-sm">
        <p className="text-muted-foreground"><span className="font-medium text-foreground">This is a demo.</span> Get your own: free for {VISITOR_TRIAL_DAYS} days, no card needed.</p>
        <Link href={SIGNUP_HREF} className="inline-flex h-9 shrink-0 items-center rounded-full bg-foreground px-4 font-medium text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring">Get started</Link>
      </div>
      <div className="flex flex-1 flex-col">
        {screen === "start" && (
          <div className="grid flex-1 gap-6 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-0 sm:p-0">
            <div className="relative min-h-[36svh] overflow-hidden rounded-2xl sm:min-h-0 sm:rounded-none">
              <Image
                src="/images/visualcns-visitor-signin-reception-v2.png"
                alt="A visitor signing in on the VisualCNS tablet at reception"
                fill
                priority
                sizes="(min-width: 640px) 55vw, 100vw"
                className="object-cover object-[35%_center]"
              />
            </div>
            <div className="flex flex-col justify-center gap-8 sm:px-10 lg:px-16">
              <div>
                <p className="text-lg text-muted-foreground">Welcome to</p>
                <h1 className="kiosk-title mt-1 text-[2.25rem] leading-tight sm:text-[3rem]">ABC Company</h1>
              </div>
              <div className="flex flex-col gap-3">
                <button type="button" onClick={() => setScreen("sign-in")} className="flex h-20 items-center justify-center gap-3 rounded-2xl bg-foreground text-xl font-semibold text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring">
                  <LogIn className="size-6" aria-hidden="true" /> Sign in
                </button>
                <button type="button" onClick={() => setScreen("sign-out")} className="flex h-20 items-center justify-center gap-3 rounded-2xl border border-border bg-background text-xl font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                  <LogOut className="size-6" aria-hidden="true" /> Sign out
                  {onSite.length > 0 && <span className="rounded-full bg-muted px-2.5 py-0.5 text-base font-medium text-muted-foreground">{onSite.length}</span>}
                </button>
              </div>
            </div>
          </div>
        )}

        {(screen === "sign-in" || screen === "sign-out") && (
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-5 sm:px-8 sm:py-10">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => { setError(""); setScreen("start") }} className="inline-flex h-10 items-center gap-1.5 rounded-full pr-3 text-base text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft className="size-5" aria-hidden="true" /> Back
              </button>
              <span className="truncate text-sm text-muted-foreground">ABC Company</span>
            </div>
            <h1 className="kiosk-title mt-6">{screen === "sign-in" ? "Sign in" : "Sign out"}</h1>

            {screen === "sign-in" && (
                <form onSubmit={signIn} className="flex flex-col">
                  <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3.5">
                    <KioskField icon={<User />} label="Full Name" htmlFor="demo-visitor-name">
                      <input id="demo-visitor-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoComplete="name" placeholder="Enter your full name" className="kiosk-input" />
                    </KioskField>
                    <KioskField icon={<Building2 />} label="Company (Optional)" htmlFor="demo-visitor-company">
                      <input id="demo-visitor-company" value={visitorCompany} onChange={(event) => setVisitorCompany(event.target.value)} maxLength={120} autoComplete="organization" placeholder="Enter your company name" className="kiosk-input" />
                    </KioskField>
                    <KioskField icon={<Phone />} label="Phone (Optional)" htmlFor="demo-visitor-phone">
                      <input id="demo-visitor-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} autoComplete="tel" placeholder="Enter your phone number" className="kiosk-input" />
                    </KioskField>
                    <KioskField icon={<Users />} label="Person You Are Visiting" htmlFor="demo-visitor-host">
                      <Select value={host} onValueChange={setHost}>
                        <SelectTrigger id="demo-visitor-host" className="kiosk-select"><SelectValue placeholder="Select a person" /></SelectTrigger>
                        <SelectContent>
                          {HOSTS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </KioskField>
                    <KioskField icon={<FileText />} label="Purpose of Visit" htmlFor="demo-visitor-purpose">
                      <Select value={purpose} onValueChange={setPurpose}>
                        <SelectTrigger id="demo-visitor-purpose" className="kiosk-select"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                        <SelectContent>
                          {PURPOSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </KioskField>
                  </div>
                  {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                  <KioskSubmit />
                </form>
            )}

            {screen === "sign-out" && (
              <div className="pt-2">
                <KioskNameList visitors={onSite} onSignOut={signOut} />
              </div>
            )}
          </div>
        )}

        {screen === "signed-in" && (
          <Confirmation title={`Welcome, ${lastName.split(/\s+/)[0]}`} text={`We've told ${host} you're here. Please sign out when you leave.`} onDone={done} />
        )}

        {screen === "signed-out" && (
          <Confirmation title={`Thanks for visiting${lastName ? `, ${lastName.split(" ")[0]}` : ""}`} text="You're signed out. Have a good day." onDone={done} />
        )}

        <footer className="px-4 py-4 text-center">
          <PoweredBy>
            <span aria-hidden="true">·</span>
            <Link href={SIGNUP_HREF} className="underline underline-offset-2 hover:text-foreground">Interested?</Link>
          </PoweredBy>
        </footer>
      </div>
    </main>
  )
}

function Confirmation({ title, text, onDone }: { title: string; text: string; onDone: () => void }) {
  return (
    <div className="kiosk-confirmation my-auto flex flex-col items-center py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary"><Check className="size-8" aria-hidden="true" /></span>
      <h2 className="kiosk-title mt-5">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{text}</p>
      <button type="button" onClick={onDone} className="kiosk-submit">Done</button>
    </div>
  )
}
