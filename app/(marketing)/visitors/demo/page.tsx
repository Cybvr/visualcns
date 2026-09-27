"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Building2, Check, FileText, Phone, User, Users } from "lucide-react"

import { KioskField, KioskHero, KioskNameList, KioskSubmit, KioskTabs, type KioskTab } from "@/components/visitors/kiosk-parts"
import { PoweredBy } from "@/components/visitors/powered-by"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { shortName } from "@/lib/kiosk-offline"

type DemoScreen = KioskTab | "signed-in" | "signed-out"
type DemoVisitor = { id: string; name: string; at: number }

const visitorsPath = "/dashboard/visitors"
const signUpHref = `/signup?next=${encodeURIComponent(visitorsPath)}`
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
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        {(screen === "sign-in" || screen === "sign-out") && (
          <>
            <KioskHero companyName="ABC Company" />
            <KioskTabs value={screen} onChange={(tab) => { setError(""); setScreen(tab) }} count={onSite.length} />
          </>
        )}

        {screen === "sign-in" && (
          <form onSubmit={signIn} className="flex flex-col">
            <div className="mt-5 space-y-3.5">
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
          <div className="pt-5">
            <KioskNameList visitors={onSite} onSignOut={signOut} />
          </div>
        )}

        {screen === "signed-in" && (
          <Confirmation title={`Welcome, ${lastName.split(/\s+/)[0]}`} text={`We've told ${host} you're here. Please sign out when you leave.`} onDone={done} />
        )}

        {screen === "signed-out" && (
          <Confirmation title={`Thanks for visiting${lastName ? `, ${lastName.split(" ")[0]}` : ""}`} text="You're signed out. Have a good day." onDone={done} />
        )}

        <div className="mt-auto pb-2 pt-8">
          <PoweredBy>
            <span aria-hidden="true">·</span>
            <Link href={signUpHref} className="underline underline-offset-2 hover:text-foreground">Interested?</Link>
          </PoweredBy>
        </div>
      </div>
    </main>
  )
}

function Confirmation({ title, text, onDone }: { title: string; text: string; onDone: () => void }) {
  return (
    <div className="my-auto flex flex-col items-center py-12 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-8" aria-hidden="true" /></span>
      <h2 className="kiosk-title mt-5">{title}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{text}</p>
      <button type="button" onClick={onDone} className="kiosk-submit">Done</button>
    </div>
  )
}
