"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { Download, Loader2, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { kioskUrl } from "@/lib/visitors"

type Settings = {
  qrKey: string
  agreement: { enabled: boolean; title: string; text: string }
  slackUrl: string
  teamsUrl: string
  webhookUrl: string
}
type Kind = "slack" | "teams" | "webhook"

const CONNECTIONS: { kind: Kind; field: "slackUrl" | "teamsUrl" | "webhookUrl"; label: string; placeholder: string; help: string }[] = [
  { kind: "slack", field: "slackUrl", label: "Slack", placeholder: "https://hooks.slack.com/services/…", help: "In Slack, add the Incoming Webhooks app to a channel and paste its webhook URL." },
  { kind: "teams", field: "teamsUrl", label: "Microsoft Teams", placeholder: "https://…logic.azure.com/workflows/…", help: "In Teams, open Workflows, choose \"Post to a channel when a webhook request is received\", and paste the link it gives you." },
  { kind: "webhook", field: "webhookUrl", label: "Webhook (Zapier, Make and others)", placeholder: "https://hooks.zapier.com/…", help: "Every sign-in and sign-out from the front desk is sent here, with the visitor's details." },
]

/** Phone sign-in by QR code, the visitor agreement, and Slack, Teams and webhook alerts. */
export function VisitorExtras({ companyId, slug }: { companyId: string; slug: string }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [qrImage, setQrImage] = useState("")
  const [busy, setBusy] = useState("")
  const [agreement, setAgreement] = useState({ enabled: false, title: "", text: "" })
  const [urls, setUrls] = useState({ slackUrl: "", teamsUrl: "", webhookUrl: "" })

  async function call(method: "GET" | "POST", body?: Record<string, unknown>) {
    if (!user) throw new Error("Please sign in again.")
    const response = await fetch(method === "GET" ? `/api/visitors/settings?companyId=${encodeURIComponent(companyId)}` : "/api/visitors/settings", {
      method,
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify({ companyId, ...body }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.")
    return data
  }

  useEffect(() => {
    if (!user || !companyId) return
    call("GET")
      .then((data: Settings) => {
        setSettings(data)
        setAgreement(data.agreement)
        setUrls({ slackUrl: data.slackUrl, teamsUrl: data.teamsUrl, webhookUrl: data.webhookUrl })
      })
      .catch(() => setSettings(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, companyId])

  const phoneLink = settings?.qrKey ? kioskUrl(slug, settings.qrKey) : ""

  useEffect(() => {
    if (!phoneLink) return setQrImage("")
    QRCode.toDataURL(phoneLink, { margin: 2, width: 640, errorCorrectionLevel: "M" }).then(setQrImage).catch(() => setQrImage(""))
  }, [phoneLink])

  async function run(key: string, work: () => Promise<void>) {
    setBusy(key)
    try {
      await work()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Something went wrong. Please try again.")
    } finally {
      setBusy("")
    }
  }

  const setQr = (enabled: boolean) => run("qr", async () => {
    const { qrKey } = await call("POST", { action: "qr", enabled })
    setSettings((current) => current && { ...current, qrKey })
  })

  const resetQr = () => run("qr", async () => {
    const { qrKey } = await call("POST", { action: "qr_reset" })
    setSettings((current) => current && { ...current, qrKey })
    toast.success("New QR code made. Print it again; the old one no longer works.")
  })

  const saveAgreement = (next = agreement) => run("agreement", async () => {
    await call("POST", { action: "save", agreement: next })
    setAgreement(next)
    setSettings((current) => current && { ...current, agreement: next })
    toast.success(next.enabled ? "Visitors will be asked to agree before they sign in." : "Agreement switched off.")
  })

  const saveConnection = (field: keyof typeof urls) => run(field, async () => {
    await call("POST", { action: "save", [field]: urls[field] })
    setSettings((current) => current && { ...current, [field]: urls[field] })
    toast.success(urls[field] ? "Saved." : "Removed.")
  })

  const test = (kind: Kind, field: keyof typeof urls) => run(`test-${kind}`, async () => {
    await call("POST", { action: "test", kind, url: urls[field] })
    toast.success("Test sent. Check it arrived.")
  })

  if (!settings) return null

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <details className="group">
        <summary className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="font-semibold text-foreground">Phone sign-in with a QR code</span>
          <span className="text-xs text-muted-foreground">{settings.qrKey ? "On" : "Off"}</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground">Print the code for reception. Visitors scan it and sign in on their own phone. Phones can&apos;t see who else is in.</p>
            <Switch checked={Boolean(settings.qrKey)} onCheckedChange={(checked) => void setQr(checked)} disabled={busy === "qr"} aria-label="Phone sign-in" />
          </div>
          {phoneLink && qrImage && (
            <div className="flex flex-wrap items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImage} alt="QR code for signing in on a phone" className="size-40 rounded-lg border border-border bg-white" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" asChild>
                  <a href={qrImage} download={`sign-in-qr-${slug}.png`}><Download className="size-4" aria-hidden="true" /> Download</a>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void resetQr()} disabled={busy === "qr"}>
                  <RefreshCw className="size-4" aria-hidden="true" /> New code
                </Button>
              </div>
            </div>
          )}
        </div>
      </details>

      <details className="group">
        <summary className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="font-semibold text-foreground">Visitor agreement (NDA)</span>
          <span className="text-xs text-muted-foreground">{settings.agreement.enabled ? "On" : "Off"}</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground">Visitors read it and tick to agree before they can sign in. The exact text is saved with each visit and in the CSV export.</p>
            <Switch
              checked={agreement.enabled}
              onCheckedChange={(enabled) => (enabled ? setAgreement((current) => ({ ...current, enabled })) : void saveAgreement({ ...agreement, enabled }))}
              disabled={busy === "agreement"}
              aria-label="Visitor agreement"
            />
          </div>
          {agreement.enabled && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-title">Title</Label>
                <Input id="agreement-title" value={agreement.title} maxLength={80} onChange={(event) => setAgreement((current) => ({ ...current, title: event.target.value }))} placeholder="Non-disclosure agreement" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agreement-text">Text</Label>
                <Textarea id="agreement-text" value={agreement.text} maxLength={6000} rows={6} onChange={(event) => setAgreement((current) => ({ ...current, text: event.target.value }))} placeholder="Paste your NDA, safety rules or visitor terms." />
              </div>
              <Button type="button" size="sm" onClick={() => void saveAgreement()} disabled={busy === "agreement"}>
                {busy === "agreement" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save agreement
              </Button>
            </>
          )}
        </div>
      </details>

      <details className="group">
        <summary className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="font-semibold text-foreground">Slack, Teams and webhooks</span>
          <span className="text-xs text-muted-foreground">{[settings.slackUrl && "Slack", settings.teamsUrl && "Teams", settings.webhookUrl && "Webhook"].filter(Boolean).join(" · ") || "Off"}</span>
        </summary>
        <div className="mt-3 space-y-5">
          <p className="text-sm text-muted-foreground">Post a message when a visitor arrives, as well as the host&apos;s email.</p>
          {CONNECTIONS.map(({ kind, field, label, placeholder, help }) => (
            <div key={kind} className="space-y-1.5">
              <Label htmlFor={`connection-${kind}`}>{label}</Label>
              <Input id={`connection-${kind}`} type="url" inputMode="url" value={urls[field]} onChange={(event) => setUrls((current) => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} />
              <p className="text-xs text-muted-foreground">{help}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" size="sm" onClick={() => void saveConnection(field)} disabled={busy === field || urls[field] === settings[field]}>
                  {busy === field && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} {urls[field] || !settings[field] ? "Save" : "Remove"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => void test(kind, field)} disabled={!urls[field] || busy === `test-${kind}`}>
                  {busy === `test-${kind}` ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Send test
                </Button>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
