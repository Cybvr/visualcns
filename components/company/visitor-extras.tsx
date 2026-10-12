"use client"

import { useEffect, useState, type ReactNode } from "react"
import QRCode from "qrcode"
import { ChevronDown, Download, Loader2, RefreshCw, Send } from "lucide-react"
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

/** A starting point when a company switches terms on. They can edit it before saving. */
const DEFAULT_TERMS = {
  title: "Visitor terms",
  text: `By signing in, you agree to the following for the length of your visit.

1. Confidentiality
Anything you see, hear or are given during your visit that isn't public is confidential. This includes information about our business, clients, staff, products, plans and systems. You won't share it with anyone or use it for any purpose other than your visit, during or after your visit.

2. Photos and recordings
You won't take photos, videos or audio recordings on our premises without permission from your host.

3. Access
You'll stay with your host or in the areas you've been given access to, and wear your visitor badge where it can be seen.

4. Safety
You'll follow staff instructions and safety signs. In an emergency, follow your host or the nearest staff member to the exit and assembly point.

5. Your information
We collect your name, the details you enter and your sign-in and sign-out times to manage visitors, keep the building safe and meet our legal duties. We keep it only as long as we need to and handle it in line with the Nigeria Data Protection Act 2023. You can ask to see or correct your information by contacting us.

6. Leaving
Please sign out when you leave.`,
}

const CONNECTIONS: { kind: Kind; field: "slackUrl" | "teamsUrl" | "webhookUrl"; label: string; placeholder: string; help: string }[] = [
  { kind: "slack", field: "slackUrl", label: "Slack", placeholder: "https://hooks.slack.com/services/…", help: "Slack: add Incoming Webhooks to a channel, paste the URL." },
  { kind: "teams", field: "teamsUrl", label: "Microsoft Teams", placeholder: "https://…logic.azure.com/workflows/…", help: "Teams: Workflows > \"Post to a channel when a webhook request is received\", paste the URL." },
  { kind: "webhook", field: "webhookUrl", label: "Webhook (Zapier, Make and others)", placeholder: "https://hooks.zapier.com/…", help: "Gets every sign-in and sign-out." },
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
    toast.success(next.enabled ? "Terms on." : "Terms off.")
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

  const connected = [settings.slackUrl && "Slack", settings.teamsUrl && "Teams", settings.webhookUrl && "Webhook"].filter(Boolean).join(", ")

  return (
    <>
      <SettingRow
        title="Phone sign-in"
        description="Visitors scan a QR code to sign in on their own phone."
        control={<Switch checked={Boolean(settings.qrKey)} onCheckedChange={(checked) => void setQr(checked)} disabled={busy === "qr"} aria-label="Phone sign-in" />}
      >
        {phoneLink && qrImage && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImage} alt="QR code for signing in on a phone" className="size-24 rounded-md border border-border bg-white" />
            <div className="flex flex-col items-start gap-1">
              <Button type="button" variant="ghost" size="sm" asChild className="-ml-3">
                <a href={qrImage} download={`sign-in-qr-${slug}.png`}><Download className="size-4" aria-hidden="true" /> Download</a>
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void resetQr()} disabled={busy === "qr"} className="-ml-3 text-muted-foreground">
                <RefreshCw className="size-4" aria-hidden="true" /> Reset code
              </Button>
            </div>
          </div>
        )}
      </SettingRow>

      <SettingRow
        title="Visitor terms"
        description="Visitors agree to your terms or NDA before signing in."
        control={
          <Switch
            checked={agreement.enabled}
            onCheckedChange={(enabled) => (enabled
              ? setAgreement((current) => ({ enabled, title: current.title || DEFAULT_TERMS.title, text: current.text || DEFAULT_TERMS.text }))
              : void saveAgreement({ ...agreement, enabled }))}
            disabled={busy === "agreement"}
            aria-label="Visitor terms"
          />
        }
      >
        {agreement.enabled && (
          <div className="space-y-3">
            <Input aria-label="Terms title" value={agreement.title} maxLength={80} onChange={(event) => setAgreement((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
            <Textarea aria-label="Terms text" value={agreement.text} maxLength={6000} rows={5} onChange={(event) => setAgreement((current) => ({ ...current, text: event.target.value }))} placeholder="Paste your NDA, safety rules or visitor terms." />
            <Button type="button" size="sm" onClick={() => void saveAgreement()} disabled={busy === "agreement"}>
              {busy === "agreement" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />} Save
            </Button>
          </div>
        )}
      </SettingRow>

      <SettingRow
        title="Notifications"
        description={connected ? `Sign-ins post to ${connected}.` : "Post each sign-in to Slack, Teams or a webhook."}
        collapsible
      >
        <div className="space-y-4">
          {CONNECTIONS.map(({ kind, field, label, placeholder, help }) => (
            <div key={kind} className="space-y-1.5">
              <Label htmlFor={`connection-${kind}`} className="text-sm">{label}</Label>
              <div className="flex gap-2">
                <Input id={`connection-${kind}`} type="url" inputMode="url" value={urls[field]} onChange={(event) => setUrls((current) => ({ ...current, [field]: event.target.value }))} placeholder={placeholder} title={help} />
                <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => void saveConnection(field)} disabled={busy === field || urls[field] === settings[field]}>
                  {busy === field ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : urls[field] || !settings[field] ? "Save" : "Remove"}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => void test(kind, field)} disabled={!urls[field] || busy === `test-${kind}`} aria-label={`Send a test to ${label}`} title="Send test">
                  {busy === `test-${kind}` ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SettingRow>
    </>
  )
}

/**
 * One line of a settings list: name and a short description on the left, its
 * switch on the right, and its options underneath when it's on. A collapsible
 * row has no switch and opens with a chevron instead.
 */
export function SettingRow({
  title,
  description,
  control,
  collapsible = false,
  children,
}: {
  title: string
  description: string
  control?: ReactNode
  collapsible?: boolean
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const showChildren = collapsible ? open : Boolean(children)

  return (
    <div className="border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-label={open ? `Hide ${title}` : `Show ${title}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        ) : control}
      </div>
      {showChildren && children && <div className="mt-4">{children}</div>}
    </div>
  )
}
