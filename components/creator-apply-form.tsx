"use client"

import { useState, type ComponentProps, type FormEvent } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { CreatorBrief } from "@/lib/campaign-brief"

const APPS = ["Instagram", "TikTok", "YouTube", "Facebook", "X"] as const

/** The app a creator most likely posts on for this brief. */
function defaultApp(platform: string) {
  return APPS.find((app) => platform.startsWith(app)) ?? "Instagram"
}

/** Register interest on the shared campaign page. Lands on the campaign's Creators tab as "Applied". */
export function CreatorApplyForm({ projectId, brief }: { projectId: string; brief: CreatorBrief }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", app: defaultApp(brief.platform), handle: "", followers: "", rate: "", note: "" })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))
  const closed = Boolean(brief.registerBy) && new Date().toISOString().slice(0, 10) > brief.registerBy

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError("")
    try {
      const response = await fetch("/api/campaigns/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projectId }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error || "That didn't send. Try again.")
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't send. Try again.")
    } finally {
      setSending(false)
    }
  }

  if (closed) return <p className="text-sm text-muted-foreground">Closed.</p>
  if (sent) return <p className="text-[15px] text-foreground">Sent.</p>

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Text id="apply-name" label="Your name" value={form.name} onChange={set("name")} required autoComplete="name" />
        <Text id="apply-email" label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr_9rem]">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={form.app} onValueChange={set("app")}>
            <SelectTrigger aria-label="Platform"><SelectValue /></SelectTrigger>
            <SelectContent>{APPS.map((app) => <SelectItem key={app} value={app}>{app}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Text id="apply-handle" label="Handle" value={form.handle} onChange={set("handle")} placeholder="@yourname" required />
        <Text id="apply-followers" label="Followers" value={form.followers} onChange={set("followers")} inputMode="numeric" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Text id="apply-phone" label="Phone" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        {!brief.fixedOffer && <Text id="apply-rate" label={`Your rate (${brief.currency})`} value={form.rate} onChange={set("rate")} inputMode="numeric" />}
      </div>
      <div className="space-y-2">
        <Label htmlFor="apply-note">Anything we should know</Label>
        <Textarea id="apply-note" rows={3} maxLength={1000} value={form.note} onChange={(event) => set("note")(event.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        By applying, you agree to the{" "}
        <Link href="/terms" target="_blank" className="underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" target="_blank" className="underline underline-offset-2">Privacy Policy</Link>, and to a VisualCNS account being created with your email.
      </p>
      <Button type="submit" disabled={sending || !form.name.trim() || !form.email.trim() || !form.handle.trim()}>
        {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Apply
      </Button>
    </form>
  )
}

function Text({ id, label, onChange, ...props }: { id: string; label: string; onChange: (value: string) => void } & Omit<ComponentProps<typeof Input>, "id" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} onChange={(event) => onChange(event.target.value)} {...props} />
    </div>
  )
}

/** The button on the shared campaign page; the form opens in a dialog. */
export function CreatorApplyButton({ projectId, brief, title }: { projectId: string; brief: CreatorBrief; title: string }) {
  const [open, setOpen] = useState(false)
  const closed = Boolean(brief.registerBy) && new Date().toISOString().slice(0, 10) > brief.registerBy
  if (closed) return <Button type="button" size="lg" className="h-12 px-12" disabled>Closed</Button>
  return (
    <>
      <Button type="button" size="lg" className="h-12 px-12" onClick={() => setOpen(true)}>Apply</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="dashboard-body max-h-[90vh] overflow-y-auto font-sans sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Apply</DialogTitle>
            <DialogDescription>{title}</DialogDescription>
          </DialogHeader>
          <CreatorApplyForm projectId={projectId} brief={brief} />
        </DialogContent>
      </Dialog>
    </>
  )
}
