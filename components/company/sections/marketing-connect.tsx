"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { SocialIcon } from "@/components/company/social-icon"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { platformLabel } from "@/lib/social"
import { useSocialRequest } from "@/lib/social-client"
import { useAuth } from "@/components/auth-provider"

/* Connect windows shared by Marketing Home and Marketing Settings. */

export type GoogleKey = "ga4" | "searchConsole" | "businessProfile" | "googleAds"

export const GOOGLE: Record<GoogleKey, { name: string; field: string; placeholder: string; help: string }> = {
  ga4: { name: "Google Analytics 4", field: "Measurement ID", placeholder: "G-XXXXXXXXXX", help: "In Google Analytics: Admin, Data streams, your website." },
  searchConsole: { name: "Google Search Console", field: "Website in Search Console", placeholder: "https://yourbusiness.com", help: "The site exactly as it appears in Search Console." },
  businessProfile: { name: "Google Business Profile", field: "Profile link", placeholder: "https://maps.app.goo.gl/…", help: "Search your business on Google Maps, tap Share, and paste the link." },
  googleAds: { name: "Google Ads", field: "Customer ID", placeholder: "123-456-7890", help: "Top right of your Google Ads account." },
}


/** Saves the ID of a Google account to track. Our team finishes the link from there. */
export function ConnectDialog({ connection, value, onOpenChange, onSave }: { connection: GoogleKey | null; value: string; onOpenChange: (open: boolean) => void; onSave: (value: string) => Promise<void> }) {
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const info = connection ? GOOGLE[connection] : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) {
      setError(`Add your ${info?.field.toLowerCase()}.`)
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(draft)
    } catch (reason) {
      setError((reason as Error).message || "Could not save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(connection)} onOpenChange={(open) => { if (open) { setDraft(value); setError("") } onOpenChange(open) }}>
      <DialogContent className="sm:max-w-md">
        {info && (
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>Connect {info.name}</DialogTitle>
              <DialogDescription>We start tracking once this is linked. Numbers appear here as they come in.</DialogDescription>
            </DialogHeader>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-foreground">{info.field}</span>
              <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={info.placeholder} className="mt-1.5" autoFocus />
              <span className="mt-1.5 block text-xs text-muted-foreground">{info.help}</span>
            </label>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <DialogFooter className="mt-5 gap-2">
              {value && <Button type="button" variant="ghost" disabled={saving} onClick={() => void onSave("")}>Disconnect</Button>}
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Connect"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/*
 * Google on Marketing Settings, now a real sign-in. Each service (Analytics,
 * Search Console, Ads) connects with Google OAuth through /api/google/*, then
 * the company picks the one property, site or account to track and sees live
 * numbers. No IDs are pasted by hand.
 */

type GoogleService = "ga4" | "searchConsole" | "googleAds"
const GOOGLE_SERVICES: GoogleService[] = ["ga4", "searchConsole", "googleAds"]
const GOOGLE_SERVICE_META: Record<GoogleService, { name: string; pick: string }> = {
  ga4: { name: "Google Analytics 4", pick: "property" },
  searchConsole: { name: "Google Search Console", pick: "site" },
  googleAds: { name: "Google Ads", pick: "account" },
}

type ConnectionView = { service: GoogleService; connected: boolean; email?: string; resourceId?: string; resourceLabel?: string }
type GoogleRequest = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>

/** The Google connections on Marketing Settings. Self-contained: it talks to /api/google directly. */
export function GoogleConnections({ companyId }: { companyId: string }) {
  const { user } = useAuth()
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const searchParams = useSearchParams()
  const [configured, setConfigured] = useState(true)
  const [views, setViews] = useState<ConnectionView[] | null>(null)
  const [busy, setBusy] = useState<GoogleService | "">("")

  const request = useCallback(<T,>(path: string, init: { method?: string; body?: unknown } = {}) => {
    return (async () => {
      if (!user) throw new Error("Please sign in again.")
      const response = await fetch(`/api/google/${path}`, {
        method: init.method ?? "GET",
        headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.")
      return data as T
    })()
  }, [user])

  const load = useCallback(async () => {
    try {
      const data = await request<{ configured: boolean; connections: ConnectionView[] }>(`resources?companyId=${encodeURIComponent(companyId)}`)
      setConfigured(data.configured)
      setViews(data.connections)
    } catch {
      setViews([])
    }
  }, [companyId, request])

  useEffect(() => { if (user) void load() }, [user, load])

  // Back from Google's sign-in: say how it went, reload, then tidy the address.
  const result = searchParams.get("google")
  useEffect(() => {
    if (!result) return
    if (result === "connected") toast.success("Google connected. Pick what to track.")
    else if (result === "cancelled") toast.error("Connecting was cancelled.")
    else if (result === "expired") toast.error("That link expired. Please try again.")
    else toast.error("Couldn't connect that account.")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("google")
    params.delete("service")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  async function connect(service: GoogleService) {
    setBusy(service)
    try {
      const { url } = await request<{ url: string }>("connect", { method: "POST", body: { companyId, service, returnTo: pathname } })
      window.location.assign(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start connecting.")
      setBusy("")
    }
  }

  async function disconnect(service: GoogleService) {
    setBusy(service)
    try {
      await request("resources", { method: "DELETE", body: { companyId, service } })
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't disconnect.")
    } finally {
      setBusy("")
    }
  }

  const rows = views ?? GOOGLE_SERVICES.map((service) => ({ service, connected: false }) as ConnectionView)

  return (
    <section className="mt-6">
      <h3 className="text-sm font-medium text-foreground">Google</h3>
      {!configured && <p className="mt-2 text-xs text-muted-foreground">Google connections aren&apos;t set up for this site yet.</p>}
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {rows.map((view) => (
          <GoogleRow
            key={view.service}
            companyId={companyId}
            view={view}
            loading={views === null}
            busy={busy === view.service}
            disabled={!configured || (Boolean(busy) && busy !== view.service)}
            request={request}
            onConnect={() => void connect(view.service)}
            onDisconnect={() => void disconnect(view.service)}
            onPicked={() => void load()}
          />
        ))}
      </ul>
    </section>
  )
}

function GoogleRow({ companyId, view, loading, busy, disabled, request, onConnect, onDisconnect, onPicked }: {
  companyId: string
  view: ConnectionView
  loading: boolean
  busy: boolean
  disabled: boolean
  request: GoogleRequest
  onConnect: () => void
  onDisconnect: () => void
  onPicked: () => void
}) {
  const meta = GOOGLE_SERVICE_META[view.service]
  const [options, setOptions] = useState<{ id: string; label: string }[] | null>(null)
  const [note, setNote] = useState("")
  const [choosing, setChoosing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<{ label: string; value: string }[] | null>(null)

  // Live numbers once a property, site or account is chosen.
  useEffect(() => {
    if (!view.connected || !view.resourceId) { setSummary(null); return }
    let active = true
    request<{ summary: { label: string; value: string }[]; note?: string }>(`resources?companyId=${encodeURIComponent(companyId)}&service=${view.service}&summary=1`)
      .then((data) => { if (active) { setSummary(data.summary); if (data.note) setNote(data.note) } })
      .catch(() => { if (active) setSummary([]) })
    return () => { active = false }
  }, [companyId, request, view.connected, view.resourceId, view.service])

  async function openChooser() {
    setChoosing(true)
    if (options) return
    try {
      const data = await request<{ options: { id: string; label: string }[]; note?: string }>(`resources?companyId=${encodeURIComponent(companyId)}&service=${view.service}&list=1`)
      setOptions(data.options)
      setNote(data.note || "")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load your accounts.")
      setChoosing(false)
    }
  }

  async function pick(id: string, label: string) {
    setSaving(true)
    try {
      await request("resources", { method: "POST", body: { companyId, service: view.service, resourceId: id, resourceLabel: label } })
      setChoosing(false)
      onPicked()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save that.")
    } finally {
      setSaving(false)
    }
  }

  const status = loading
    ? "Loading…"
    : !view.connected
      ? "Not connected"
      : view.resourceId
        ? view.resourceLabel || "Connected"
        : `Connected as ${view.email || "Google"} · pick a ${meta.pick}`

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{meta.name}</p>
          <p className="truncate text-xs text-muted-foreground">{status}</p>
        </div>
        {!view.connected ? (
          <Button type="button" variant="outline" size="sm" disabled={disabled || loading} onClick={onConnect}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Connect"}
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            {!choosing && (
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => void openChooser()}>
                {view.resourceId ? "Change" : `Choose ${meta.pick}`}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onDisconnect}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Disconnect"}
            </Button>
          </div>
        )}
      </div>

      {choosing && (
        <div className="mt-3">
          {options === null ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" />Loading your accounts…</p>
          ) : options.length === 0 ? (
            <p className="text-xs text-muted-foreground">{note || `No ${meta.pick}s found for ${view.email || "this account"}.`}</p>
          ) : (
            <ul className="space-y-1.5">
              {options.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void pick(option.id, option.label)}
                    className={`w-full truncate rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-60 ${option.id === view.resourceId ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {summary && summary.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2">
          {summary.map((stat) => (
            <div key={stat.label} className="rounded-md bg-muted/60 px-3 py-2">
              <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
              <dd className="text-sm font-semibold text-foreground">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {view.service === "googleAds" && view.connected && note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </li>
  )
}

/** Connects social accounts without leaving the page: sign in on the platform, then come straight back. */
export function SocialConnectDialog({ companyId, platforms, open, onOpenChange, title, text }: { companyId: string; platforms: string[]; open: boolean; onOpenChange: (open: boolean) => void; title: string; text: string }) {
  const request = useSocialRequest()
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const searchParams = useSearchParams()
  const [connecting, setConnecting] = useState("")

  // Back from the platform's sign-in: say how it went, then tidy the address.
  const result = searchParams.get("social")
  useEffect(() => {
    if (!result) return
    if (result === "connected") toast.success("Account connected.")
    else if (result === "cancelled") toast.error("Connecting was cancelled.")
    else toast.error("Couldn't connect that account.")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("social")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  async function connect(platform: string) {
    setConnecting(platform)
    try {
      const { url } = await request<{ url: string }>("connect", { method: "POST", body: { companyId, platform, returnTo: pathname } })
      window.location.assign(url)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Couldn't start connecting.")
      setConnecting("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {platforms.map((platform) => (
            <Button key={platform} type="button" variant="outline" className="w-full justify-start gap-3" disabled={Boolean(connecting)} onClick={() => void connect(platform)}>
              {connecting === platform ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <SocialIcon platform={platform} />}
              Continue with {platformLabel(platform)}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
