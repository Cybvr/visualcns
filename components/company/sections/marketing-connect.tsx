"use client"

import { useEffect, useState, type FormEvent } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { SocialIcon } from "@/components/company/social-icon"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { platformLabel } from "@/lib/social"
import { useSocialRequest } from "@/lib/social-client"
import type { Connections } from "@/components/company/sections/marketing-pages"

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

/** The Google accounts on Marketing Settings, each with Connect or Edit. */
export function GoogleConnections({ connections, loading, onSave }: { connections: Connections; loading: boolean; onSave: (key: string, value: string) => Promise<void> }) {
  const [open, setOpen] = useState<GoogleKey | null>(null)
  const keys: GoogleKey[] = ["ga4", "searchConsole", "googleAds"]
  return (
    <section className="mt-6">
      <h3 className="text-sm font-medium text-foreground">Google</h3>
      <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
        {keys.map((key) => {
          const value = connections[key]
          return (
            <li key={key} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{GOOGLE[key].name}</p>
                <p className="truncate text-xs text-muted-foreground">{loading ? "Loading…" : value || "Not connected"}</p>
              </div>
              <Button type="button" variant={value ? "ghost" : "outline"} size="sm" disabled={loading} onClick={() => setOpen(key)}>
                {value ? "Edit" : "Connect"}
              </Button>
            </li>
          )
        })}
      </ul>
      <ConnectDialog
        connection={open}
        value={open ? connections[open] ?? "" : ""}
        onOpenChange={(next) => { if (!next) setOpen(null) }}
        onSave={async (value) => {
          if (!open) return
          await onSave(open, value)
          setOpen(null)
        }}
      />
    </section>
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
