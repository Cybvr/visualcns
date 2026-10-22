"use client"

import { useState, type ComponentProps, type FormEvent } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { applicationQuestions, type CreatorBrief } from "@/lib/campaign-brief"

const APPS = ["Instagram", "TikTok", "YouTube", "Facebook", "X"] as const

/** The app a creator most likely posts on for this brief. */
function defaultApp(platform: string) {
  return APPS.find((app) => platform.startsWith(app)) ?? "Instagram"
}

export function applicationsClosed(brief: Pick<CreatorBrief, "registerBy">) {
  return Boolean(brief.registerBy) && new Date().toISOString().slice(0, 10) > brief.registerBy
}

/** The apply page's form. Lands on the campaign's Creators tab as "Applied". */
export function CreatorApplyForm({ projectId, brief, backHref }: { projectId: string; brief: CreatorBrief; backHref: string }) {
  const questions = applicationQuestions(brief)
  const [form, setForm] = useState({ name: "", email: "", app: defaultApp(brief.platform), handle: "", coverLetter: "" })
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))
  const complete = Boolean(form.name.trim() && form.email.trim() && form.handle.trim() && form.coverLetter.trim()) && answers.every((answer) => answer.trim())

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError("")
    try {
      const response = await fetch("/api/campaigns/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projectId, answers: questions.map((question, index) => ({ question, answer: answers[index] ?? "" })) }),
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

  if (applicationsClosed(brief)) return <p className="text-sm text-muted-foreground">Applications for this campaign have closed.</p>
  if (sent) {
    return (
      <div className="space-y-4">
        <p className="text-[15px] text-foreground">Thanks, your application has been sent. We&apos;ll be in touch by email.</p>
        <Button asChild variant="outline"><Link href={backHref}>Back to the campaign</Link></Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Text id="apply-name" label="Name" value={form.name} onChange={set("name")} required autoComplete="name" />
        <Text id="apply-email" label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={form.app} onValueChange={set("app")}>
            <SelectTrigger aria-label="Platform"><SelectValue /></SelectTrigger>
            <SelectContent>{APPS.map((app) => <SelectItem key={app} value={app}>{app}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Text id="apply-handle" label="Handle" value={form.handle} onChange={set("handle")} placeholder="@yourname" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apply-cover-letter">Cover letter</Label>
        <Textarea id="apply-cover-letter" rows={6} maxLength={3000} value={form.coverLetter} onChange={(event) => set("coverLetter")(event.target.value)} required />
      </div>
      {questions.map((question, index) => (
        <div key={index} className="space-y-2">
          <Label htmlFor={`apply-answer-${index}`}>{question}</Label>
          <Textarea
            id={`apply-answer-${index}`}
            rows={3}
            maxLength={1000}
            value={answers[index] ?? ""}
            onChange={(event) => setAnswers((current) => current.map((answer, at) => (at === index ? event.target.value : answer)))}
            required
          />
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        By applying, you agree to the{" "}
        <Link href="/terms" target="_blank" className="underline underline-offset-2">Terms</Link> and{" "}
        <Link href="/privacy" target="_blank" className="underline underline-offset-2">Privacy Policy</Link>, and to a VisualCNS account being created with your email.
      </p>
      <Button type="submit" size="lg" className="h-12 w-full sm:w-auto sm:px-12" disabled={sending || !complete}>
        {sending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        Submit
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
