"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Building2, Check, FileText, Loader2, LogOut, Printer, User, Users } from "lucide-react"

import { PoweredBy } from "@/components/visitors/powered-by"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type KioskInfo = {
  company: { name: string; logoUrl: string }
  hosts: { id: string; name: string }[]
  onSite: { id: string; name: string }[]
}
type Badge = { name: string; hostName: string; company: string; logoUrl: string; signedInAt: number }
type Screen = "sign-in" | "signed-in" | "sign-out" | "signed-out"

const SOMEONE_ELSE = "__someone_else__"
const PURPOSES = ["Meeting", "Interview", "Delivery", "Collection", "Maintenance", "Personal", "Other"]
/** Back to the sign-in form after a finished sign-in or sign-out, ready for the next person. */
const RESET_AFTER_MS = 15000
const STORED_KEY = "visitor-kiosk-key"

/**
 * The front-desk tablet. Opened once from the link on the company's Visitors
 * tab; the key in that link is remembered so a reload keeps working.
 */
export default function VisitorSignInPage() {
  const { clientSlug = "" } = useParams<{ clientSlug: string }>()
  const searchParams = useSearchParams()
  const [key, setKey] = useState("")
  const [info, setInfo] = useState<KioskInfo | null>(null)
  const [loadError, setLoadError] = useState("")
  const [screen, setScreen] = useState<Screen>("sign-in")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [badge, setBadge] = useState<Badge | null>(null)
  const [hostNotified, setHostNotified] = useState(false)
  const [signedOutName, setSignedOutName] = useState("")

  const [name, setName] = useState("")
  const [visitorCompany, setVisitorCompany] = useState("")
  const [hostId, setHostId] = useState("")
  const [hostName, setHostName] = useState("")
  const [reason, setReason] = useState("")
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const fromUrl = searchParams.get("key") || ""
    let stored = ""
    try {
      stored = window.localStorage.getItem(`${STORED_KEY}:${clientSlug}`) || ""
      if (fromUrl) window.localStorage.setItem(`${STORED_KEY}:${clientSlug}`, fromUrl)
    } catch {
      // Private mode: the key in the URL still works.
    }
    setKey(fromUrl || stored)
  }, [clientSlug, searchParams])

  const load = useCallback(async () => {
    if (!key) {
      setLoadError("This sign-in link is missing its code. Open it again from the Visitors tab.")
      return
    }
    try {
      const response = await fetch(`/api/visitors?slug=${encodeURIComponent(clientSlug)}&key=${encodeURIComponent(key)}`, { cache: "no-store" })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Couldn't load the sign-in screen.")
      setInfo(body as KioskInfo)
      setLoadError("")
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : "Couldn't load the sign-in screen.")
    }
  }, [clientSlug, key])

  useEffect(() => {
    if (key) void load()
  }, [key, load])

  function goHome() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setScreen("sign-in")
    setError("")
    setName("")
    setVisitorCompany("")
    setHostId("")
    setHostName("")
    setReason("")
    setBadge(null)
    setSignedOutName("")
    void load()
  }

  function resetSoon() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(goHome, RESET_AFTER_MS)
  }

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/visitors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: clientSlug, key, ...payload }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.")
    return body
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (name.trim().length < 2) return setError("Please enter your name.")
    setBusy(true)
    setError("")
    try {
      const body = await post({
        action: "sign_in",
        name,
        visitorCompany,
        reason,
        hostId: hostId && hostId !== SOMEONE_ELSE ? hostId : "",
        hostName: hostId === SOMEONE_ELSE ? hostName : "",
      })
      setBadge(body.badge as Badge)
      setHostNotified(Boolean(body.hostNotified))
      setScreen("signed-in")
      resetSoon()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function signOut(visitorId: string) {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const body = await post({ action: "sign_out", visitorId })
      setSignedOutName(String(body.name || ""))
      setScreen("signed-out")
      resetSoon()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const header = info && info.company.logoUrl && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={info.company.logoUrl} alt="" className="size-14 rounded-xl object-cover" />
  )

  return (
    <>
    <main className="kiosk flex min-h-svh flex-col bg-card px-5 py-6 text-foreground print:hidden sm:px-10 sm:py-10">
      {loadError ? (
        <div className="m-auto max-w-sm text-center">
          <p className="kiosk-title">Sign-in unavailable</p>
          <p className="mt-2 text-muted-foreground">{loadError}</p>
        </div>
      ) : !info ? (
        <Loader2 className="m-auto size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      ) : (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
          {header}

          {screen === "sign-in" && (
            <form onSubmit={signIn} className="flex flex-1 flex-col py-6">
              <p className="text-muted-foreground">Welcome to</p>
              <h1 className="kiosk-title">{info.company.name}</h1>
              <p className="mt-1 text-muted-foreground">Please sign in as a visitor</p>
              <div className="mt-8 space-y-3">
                <KioskField icon={<User />} label="Full name" htmlFor="visitor-name">
                  <input id="visitor-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Enter your full name" className="kiosk-input" />
                </KioskField>
                <KioskField icon={<Building2 />} label="Company (optional)" htmlFor="visitor-company">
                  <input id="visitor-company" value={visitorCompany} onChange={(event) => setVisitorCompany(event.target.value)} autoComplete="organization" placeholder="Enter your company name" className="kiosk-input" />
                </KioskField>
                <KioskField icon={<Users />} label="Person you are visiting" htmlFor="visitor-host">
                  <Select value={hostId} onValueChange={setHostId}>
                    <SelectTrigger id="visitor-host" className="kiosk-select"><SelectValue placeholder="Select a person" /></SelectTrigger>
                    <SelectContent>
                      {info.hosts.map((host) => <SelectItem key={host.id} value={host.id}>{host.name}</SelectItem>)}
                      <SelectItem value={SOMEONE_ELSE}>Someone else</SelectItem>
                    </SelectContent>
                  </Select>
                  {hostId === SOMEONE_ELSE && (
                    <input value={hostName} onChange={(event) => setHostName(event.target.value)} placeholder="Their name" aria-label="Who you're visiting" className="kiosk-input mt-1 border-t border-border pt-2" />
                  )}
                </KioskField>
                <KioskField icon={<FileText />} label="Purpose of visit" htmlFor="visitor-reason">
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger id="visitor-reason" className="kiosk-select"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                    <SelectContent>
                      {PURPOSES.map((purpose) => <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </KioskField>
              </div>
              {error && <p className="mt-3 text-destructive">{error}</p>}
              <Button type="submit" disabled={busy} className="kiosk-big mt-8 h-16 w-full justify-between rounded-2xl bg-primary px-6 text-primary-foreground hover:bg-primary/90">
                <span className="flex-1 text-center">Sign in</span>
                {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-5" aria-hidden="true" />}
              </Button>
              {info.onSite.length > 0 && (
                <button type="button" onClick={() => { setError(""); setScreen("sign-out") }} className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  <LogOut className="size-4" aria-hidden="true" /> Leaving? Sign out
                </button>
              )}
            </form>
          )}

          {screen === "signed-in" && badge && (
            <div className="my-auto py-10 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-8" aria-hidden="true" />
              </span>
              <h1 className="kiosk-title mt-5">Welcome, {badge.name.split(" ")[0]}</h1>
              <p className="mt-2 text-muted-foreground">
                {badge.hostName ? (hostNotified ? `We've told ${badge.hostName} you're here.` : `Please let reception know you're here for ${badge.hostName}.`) : "Please take a seat. Someone will be with you shortly."}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => window.print()} className="kiosk-big h-14 rounded-2xl">
                  <Printer className="mr-2 size-5" aria-hidden="true" /> Print badge
                </Button>
                <Button type="button" onClick={goHome} className="kiosk-big h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">Done</Button>
              </div>
            </div>
          )}

          {screen === "sign-out" && (
            <div className="flex flex-1 flex-col py-6">
              <button type="button" onClick={goHome} className="-ml-2 mb-4 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </button>
              <h1 className="kiosk-title">Tap your name</h1>
              <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                {info.onSite.map((visitor) => (
                  <li key={visitor.id}>
                    <button type="button" onClick={() => void signOut(visitor.id)} disabled={busy} className="kiosk-row flex w-full items-center justify-between gap-3 px-5 py-5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:opacity-60">
                      <span className="min-w-0 truncate">{visitor.name}</span>
                      <LogOut className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {!info.onSite.length && <li className="px-5 py-5 text-muted-foreground">Nobody is signed in right now.</li>}
              </ul>
              {error && <p className="mt-3 text-destructive">{error}</p>}
            </div>
          )}

          {screen === "signed-out" && (
            <div className="my-auto py-10 text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-8" aria-hidden="true" />
              </span>
              <h1 className="kiosk-title mt-5">Thanks for visiting{signedOutName ? `, ${signedOutName.split(" ")[0]}` : ""}</h1>
              <p className="mt-2 text-muted-foreground">You&apos;re signed out. Have a good day.</p>
              <Button type="button" onClick={goHome} className="kiosk-big mt-8 h-14 w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">Done</Button>
            </div>
          )}
        </div>
      )}
      <PoweredBy />
    </main>
    {badge && (
      <div className="kiosk-badge hidden">
        {badge.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={badge.logoUrl} alt="" className="kiosk-badge-logo" />
        )}
        <p className="kiosk-badge-label">VISITOR</p>
        <p className="kiosk-badge-name">{badge.name}</p>
        {badge.hostName && <p className="kiosk-badge-line">Visiting {badge.hostName}</p>}
        <p className="kiosk-badge-line">{badge.company}</p>
        <p className="kiosk-badge-line">{new Date(badge.signedInAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
    )}
    </>
  )
}

function KioskField({ icon, label, htmlFor, children }: { icon: ReactNode; label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
      <span className="mt-3 text-foreground [&_svg]:size-6" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="kiosk-label block">{label}</label>
        {children}
      </div>
    </div>
  )
}
