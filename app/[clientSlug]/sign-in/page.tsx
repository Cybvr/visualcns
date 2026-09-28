"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Building2, Check, CloudOff, FileText, Loader2, Phone, Printer, User, Users } from "lucide-react"

import { KioskField, KioskHero, KioskNameList, KioskSubmit, KioskTabs } from "@/components/visitors/kiosk-parts"
import { PoweredBy } from "@/components/visitors/powered-by"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { enqueue, newClientId, OfflineError, queued, savedInfo, saveInfo, saveQueue, withQueued, type KioskInfo, type QueuedAction } from "@/lib/kiosk-offline"

type Badge = { name: string; hostName: string; company: string; logoUrl: string; signedInAt: number }
type Screen = "sign-in" | "signed-in" | "sign-out" | "signed-out"

const SOMEONE_ELSE = "__someone_else__"
const PURPOSES = ["Meeting", "Interview", "Delivery", "Collection", "Maintenance", "Personal", "Other"]
/** Back to the sign-in form after a finished sign-in or sign-out, ready for the next person. */
const RESET_AFTER_MS = 15000
const STORED_KEY = "visitor-kiosk-key"
/** The site's trial or subscription ran out. Saved visits wait and are sent once it's paid up. */
class PausedError extends OfflineError {}

/** How often to retry sending saved sign-ins while offline. */
const RETRY_EVERY_MS = 30000

/**
 * The front-desk tablet. Opened once from the link on the company's Visitors
 * tab; the key in that link is remembered so a reload keeps working.
 * Keeps signing people in and out when the internet drops (see kiosk-offline).
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
  const [pending, setPending] = useState<QueuedAction[]>([])
  const [offline, setOffline] = useState(false)
  const flushing = useRef(false)

  const [name, setName] = useState("")
  const [visitorCompany, setVisitorCompany] = useState("")
  const [phone, setPhone] = useState("")
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
    let response: Response
    try {
      response = await fetch(`/api/visitors?slug=${encodeURIComponent(clientSlug)}&key=${encodeURIComponent(key)}`, { cache: "no-store" })
    } catch {
      // No internet: carry on with what the tablet saw last time.
      const saved = savedInfo(clientSlug)
      setOffline(true)
      if (saved) {
        setInfo(saved)
        setLoadError("")
      } else {
        setLoadError("No internet connection. Connect the tablet once to set up sign-in.")
      }
      return
    }
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setLoadError(body.error || "Couldn't load the sign-in screen.")
      return
    }
    saveInfo(clientSlug, body as KioskInfo)
    setInfo(body as KioskInfo)
    setOffline(false)
    setLoadError("")
  }, [clientSlug, key])

  const send = useCallback(async (payload: Record<string, unknown>) => {
    let response: Response
    try {
      response = await fetch("/api/visitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: clientSlug, key, ...payload }),
      })
    } catch {
      throw new OfflineError("offline")
    }
    const body = await response.json().catch(() => ({}))
    // A server hiccup is worth retrying; a refusal (bad key, bad data) isn't.
    if (response.status === 402) throw new PausedError(body.error || "Visitor sign-in is paused.")
    if (response.status >= 500) throw new OfflineError(body.error || "server")
    if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.")
    return body
  }, [clientSlug, key])

  /** Sends saved sign-ins and sign-outs, oldest first, and stops at the first that can't get through. */
  const flush = useCallback(async () => {
    if (!key || flushing.current) return
    let queue = queued(clientSlug)
    if (!queue.length) return setPending([])
    flushing.current = true
    try {
      while (queue.length) {
        try {
          await send(queue[0])
        } catch (reason) {
          if (reason instanceof OfflineError) break
          // Refused for good (e.g. the visit no longer exists): drop it so it doesn't block the rest.
        }
        queue = queue.slice(1)
        saveQueue(clientSlug, queue)
      }
    } finally {
      flushing.current = false
      setPending(queue)
    }
    if (!queue.length) await load()
  }, [clientSlug, key, send, load])

  useEffect(() => {
    if (!key) return
    setPending(queued(clientSlug))
    void load().then(flush)
    // Also re-checks the screen, so a paused tablet comes back by itself once the site is paid.
    const retry = () => void load().then(flush)
    const timer = setInterval(retry, RETRY_EVERY_MS)
    window.addEventListener("online", retry)
    return () => {
      clearInterval(timer)
      window.removeEventListener("online", retry)
    }
  }, [key, clientSlug, load, flush])

  function goHome() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setScreen("sign-in")
    setError("")
    setName("")
    setVisitorCompany("")
    setPhone("")
    setHostId("")
    setHostName("")
    setReason("")
    setBadge(null)
    setSignedOutName("")
    void load().then(flush)
  }

  function resetSoon() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(goHome, RESET_AFTER_MS)
  }

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (name.trim().length < 2) return setError("Please enter your name.")
    setBusy(true)
    setError("")
    const visit: QueuedAction = {
      action: "sign_in",
      clientId: newClientId(),
      at: Date.now(),
      name: name.trim(),
      visitorCompany,
      phone,
      reason,
      hostId: hostId && hostId !== SOMEONE_ELSE ? hostId : "",
      hostName: hostId === SOMEONE_ELSE ? hostName : "",
    }
    try {
      const body = await send(visit)
      setBadge(body.badge as Badge)
      setHostNotified(Boolean(body.hostNotified))
      setOffline(false)
      setScreen("signed-in")
      resetSoon()
    } catch (reason) {
      if (reason instanceof PausedError) {
        setLoadError(reason.message)
        return
      }
      if (reason instanceof OfflineError && info) {
        enqueue(clientSlug, visit)
        setPending(queued(clientSlug))
        setOffline(true)
        const host = info.hosts.find((person) => person.id === visit.hostId)
        setBadge({ name: visit.name, hostName: host?.name || visit.hostName.trim(), company: info.company.name, logoUrl: info.company.logoUrl, signedInAt: visit.at })
        setHostNotified(false)
        setScreen("signed-in")
        resetSoon()
        return
      }
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function signOut(visitorId: string) {
    if (busy) return
    setBusy(true)
    setError("")
    const visit: QueuedAction = { action: "sign_out", visitorId, at: Date.now() }
    try {
      const body = await send(visit)
      setSignedOutName(String(body.name || ""))
      setOffline(false)
      setScreen("signed-out")
      resetSoon()
    } catch (reason) {
      if (reason instanceof PausedError) {
        setLoadError(reason.message)
        return
      }
      if (reason instanceof OfflineError) {
        enqueue(clientSlug, visit)
        setPending(queued(clientSlug))
        setOffline(true)
        setSignedOutName(onSiteNow.find((visitor) => visitor.id === visitorId)?.name || "")
        setScreen("signed-out")
        resetSoon()
        return
      }
      setError(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const onSiteNow = info ? withQueued(info.onSite, pending) : []

  const header = screen !== "sign-in" && screen !== "sign-out" && info && info.company.logoUrl && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={info.company.logoUrl} alt="" className="size-14 rounded-xl object-cover" />
  )

  return (
    <>
    <main className="kiosk kiosk-page flex min-h-svh flex-col bg-card text-foreground print:hidden">
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

          {(screen === "sign-in" || screen === "sign-out") && (
            <>
              <KioskHero companyName={info.company.name} logoUrl={info.company.logoUrl} />
              <KioskTabs value={screen} onChange={(tab) => { setError(""); setScreen(tab) }} count={onSiteNow.length} />
            </>
          )}

          {screen === "sign-in" && (
            <form onSubmit={signIn} className="flex flex-col pb-2">
              <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3.5">
                <KioskField icon={<User />} label="Full Name" htmlFor="visitor-name">
                  <input id="visitor-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Enter your full name" className="kiosk-input" />
                </KioskField>
                <KioskField icon={<Building2 />} label="Company (Optional)" htmlFor="visitor-company">
                  <input id="visitor-company" value={visitorCompany} onChange={(event) => setVisitorCompany(event.target.value)} autoComplete="organization" placeholder="Enter your company name" className="kiosk-input" />
                </KioskField>
                <KioskField icon={<Phone />} label="Phone (Optional)" htmlFor="visitor-phone">
                  <input id="visitor-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="Enter your phone number" className="kiosk-input" />
                </KioskField>
                <KioskField icon={<Users />} label="Person You Are Visiting" htmlFor="visitor-host">
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
                <KioskField icon={<FileText />} label="Purpose of Visit" htmlFor="visitor-reason">
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger id="visitor-reason" className="kiosk-select"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                    <SelectContent>
                      {PURPOSES.map((purpose) => <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </KioskField>
              </div>
              {error && <p className="mt-3 text-destructive">{error}</p>}
              <KioskSubmit busy={busy} />
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
            <div className="flex-1 pb-4 pt-4">
              <KioskNameList visitors={onSiteNow} onSignOut={(id) => void signOut(id)} busy={busy} />
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
      {info && (offline || pending.length > 0) && (
        <p className="mx-auto mt-6 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <CloudOff className="size-4" aria-hidden="true" />
          {offline ? "Offline. Sign-ins are saved on this tablet" : "Sending saved sign-ins"}
          {pending.length > 0 && ` · ${pending.length} to send`}
        </p>
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

