"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, ExternalLink, Loader2, LogOut, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { kioskUrl, resetKioskKey, visitDay as day, visitTime as time, setKioskEnabled, signOutVisitor, watchKiosk, watchVisitors, type Visitor, type VisitorKiosk } from "@/lib/visitors"

/** The company's Visitors tab: who is in now, past visits, and the front-desk tablet link. */
export function CompanyVisitors({ agencyId, companyId, slug }: { agencyId: string; companyId: string; slug: string }) {
  const [visitors, setVisitors] = useState<Visitor[] | null>(null)
  const [kiosk, setKiosk] = useState<VisitorKiosk | null>(null)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [busyId, setBusyId] = useState("")
  const [kioskBusy, setKioskBusy] = useState(false)

  useEffect(() => {
    if (!agencyId || !companyId) return
    const stopVisitors = watchVisitors(
      agencyId,
      companyId,
      (rows) => { setVisitors(rows); setError("") },
      (reason) => { console.error("Visitor list subscription failed", reason); setError("Visitor list unavailable.") },
    )
    const stopKiosk = watchKiosk(companyId, setKiosk, () => undefined)
    return () => {
      stopVisitors()
      stopKiosk()
    }
  }, [agencyId, companyId, retryCount])

  const onSite = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status === "on_site"), [visitors])
  const past = useMemo(() => (visitors ?? []).filter((visitor) => visitor.status !== "on_site"), [visitors])
  const link = kiosk?.enabled && kiosk.key ? kioskUrl(slug, kiosk.key) : ""

  async function signOut(visitor: Visitor) {
    setBusyId(visitor.id)
    try {
      await signOutVisitor(visitor.id)
    } catch {
      toast.error("Couldn't sign them out. Try again.")
    } finally {
      setBusyId("")
    }
  }

  async function toggleKiosk(enabled: boolean) {
    setKioskBusy(true)
    try {
      await setKioskEnabled(agencyId, companyId, enabled, kiosk)
    } catch {
      toast.error("Couldn't change the sign-in link. Try again.")
    } finally {
      setKioskBusy(false)
    }
  }

  async function newLink() {
    setKioskBusy(true)
    try {
      await resetKioskKey(agencyId, companyId)
      toast.success("New link made. The old one no longer works.")
    } catch {
      toast.error("Couldn't make a new link. Try again.")
    } finally {
      setKioskBusy(false)
    }
  }

  return (
    <div className="mt-5 space-y-8">
      <section className="rounded-2xl border border-border bg-background p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="kiosk-toggle" className="text-sm font-semibold text-foreground">Front desk sign-in</Label>
            <p className="mt-1 text-sm text-muted-foreground">Use this link at reception. Hosts get an email when visitors sign in.</p>
          </div>
          <Switch id="kiosk-toggle" checked={Boolean(kiosk?.enabled)} onCheckedChange={(checked) => void toggleKiosk(checked)} disabled={kioskBusy} />
        </div>
        {link && (
          <div className="mt-4 space-y-3">
            <p className="truncate rounded-lg bg-card px-3 py-2 font-mono text-xs text-muted-foreground">{link}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copied") }}>
                <Copy className="size-4" aria-hidden="true" /> Copy link
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={link} target="_blank" rel="noreferrer"><ExternalLink className="size-4" aria-hidden="true" /> Open</a>
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void newLink()} disabled={kioskBusy}>
                <RefreshCw className="size-4" aria-hidden="true" /> New link
              </Button>
            </div>
          </div>
        )}
      </section>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p className="text-destructive">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => { setError(""); setVisitors(null); setRetryCount((count) => count + 1) }}>
            Try again
          </Button>
        </div>
      ) : visitors === null ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading visitors" />
      ) : (
        <>
          <section>
            <h2 className="sidebar-nav-label font-sans text-muted-foreground [font-family:inherit]">In the building now · {onSite.length}</h2>
            {onSite.length ? (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                {onSite.map((visitor) => (
                  <li key={visitor.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{visitor.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[visitor.hostName && `Visiting ${visitor.hostName}`, visitor.reason, `In at ${time(visitor.signedInAt)}`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void signOut(visitor)} disabled={busyId === visitor.id}>
                      {busyId === visitor.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
                      Sign out
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Nobody is signed in.</p>
            )}
          </section>

          <section>
            <h2 className="sidebar-nav-label font-sans text-muted-foreground [font-family:inherit]">Past visits</h2>
            {past.length ? (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
                {past.map((visitor) => (
                  <li key={visitor.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{visitor.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[visitor.hostName && `Visited ${visitor.hostName}`, visitor.reason, visitor.phone || visitor.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <p className="shrink-0 text-right text-xs text-muted-foreground">
                      {day(visitor.signedInAt)}
                      <br />
                      {time(visitor.signedInAt)}{visitor.signedOutAt ? `–${time(visitor.signedOutAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No visits yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
