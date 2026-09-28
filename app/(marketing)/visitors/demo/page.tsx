"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Building2, Check, FileText, Phone, User, Users } from "lucide-react"

import { KioskField, KioskHero, KioskNameList, KioskSubmit, KioskTabs, type KioskTab } from "@/components/visitors/kiosk-parts"
import { PoweredBy } from "@/components/visitors/powered-by"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { shortName } from "@/lib/kiosk-offline"
import { VISITOR_TRIAL_DAYS } from "@/lib/visitor-billing"
import { VisitorSignupForm } from "@/components/visitors/visitor-signup-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type DemoScreen = KioskTab | "signed-in" | "signed-out"
type DemoVisitor = { id: string; name: string; at: number }

const visitorsPath = "/dashboard/visitors"
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
  const [screen, setScreen] = useState<DemoScreen>("sign-in")
  const [onSite, setOnSite] = useState<DemoVisitor[]>(sampleVisitors)
  const [name, setName] = useState("")
  const [visitorCompany, setVisitorCompany] = useState("")
  const [phone, setPhone] = useState("")
  const [host, setHost] = useState("")
  const [purpose, setPurpose] = useState("")
  const [error, setError] = useState("")
  const [lastName, setLastName] = useState("")
  const [signupOpen, setSignupOpen] = useState(false)

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
    setScreen("sign-in")
  }

  return (
    <main className="kiosk kiosk-page flex min-h-svh flex-col bg-card text-foreground">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
        <p className="text-muted-foreground"><span className="font-medium text-foreground">This is a demo.</span> Get your own: free for {VISITOR_TRIAL_DAYS} days, no card needed.</p>
        <button type="button" onClick={() => setSignupOpen(true)} className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-4 font-medium text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring">Get started</button>
      </div>
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set up visitor sign-in</DialogTitle>
            <DialogDescription>Free for {VISITOR_TRIAL_DAYS} days. No card needed.</DialogDescription>
          </DialogHeader>
          <VisitorSignupForm />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(visitorsPath)}`} className="font-medium text-foreground underline underline-offset-4">Sign in</Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </DialogContent>
      </Dialog>
      <div className="kiosk-shell">
        {(screen === "sign-in" || screen === "sign-out") && (
          <div className="kiosk-workspace">
            <div className="kiosk-intro">
              <KioskHero companyName="ABC Company" />
            </div>
            <div className="kiosk-panel">
              <KioskTabs value={screen} onChange={(tab) => { setError(""); setScreen(tab) }} count={onSite.length} />

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
                <div className="pt-4">
                  <KioskNameList visitors={onSite} onSignOut={signOut} />
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "signed-in" && (
          <Confirmation title={`Welcome, ${lastName.split(/\s+/)[0]}`} text={`We've told ${host} you're here. Please sign out when you leave.`} onDone={done} />
        )}

        {screen === "signed-out" && (
          <Confirmation title={`Thanks for visiting${lastName ? `, ${lastName.split(" ")[0]}` : ""}`} text="You're signed out. Have a good day." onDone={done} />
        )}

        <footer className="kiosk-footer">
          <PoweredBy>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => setSignupOpen(true)} className="underline underline-offset-2 hover:text-foreground">Interested?</button>
          </PoweredBy>
        </footer>
      </div>
    </main>
  )
}

function Confirmation({ title, text, onDone }: { title: string; text: string; onDone: () => void }) {
  return (
    <div className="kiosk-confirmation my-auto flex flex-col items-center py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-8" aria-hidden="true" /></span>
      <h2 className="kiosk-title mt-5">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{text}</p>
      <button type="button" onClick={onDone} className="kiosk-submit">Done</button>
    </div>
  )
}
