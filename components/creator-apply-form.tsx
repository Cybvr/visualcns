"use client"

import { useState, type ComponentProps, type FormEvent } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { applicationQuestions, type CreatorBrief } from "@/lib/campaign-brief"
import { auth } from "@/lib/firebase"

const APPS = ["Instagram", "TikTok", "YouTube", "Facebook", "X"] as const

/** The app a creator most likely posts on for this brief. */
function defaultApp(platform: string) {
  return APPS.find((app) => platform.startsWith(app)) ?? "Instagram"
}

export function applicationsClosed(brief: Pick<CreatorBrief, "registerBy">) {
  return Boolean(brief.registerBy) && new Date().toISOString().slice(0, 10) > brief.registerBy
}

const AUTH_ERRORS: Record<string, string> = {
  "auth/invalid-email": "Check your email address.",
  "auth/weak-password": "Use a password of at least 8 characters.",
  "auth/wrong-password": "That email already has an account and the password doesn't match. Sign in, or reset your password from the sign-in page.",
  "auth/invalid-credential": "That email already has an account and the password doesn't match. Sign in, or reset your password from the sign-in page.",
  "auth/too-many-requests": "Too many tries. Wait a minute and try again.",
}

/** Creates the applicant's account, or signs them in when the email already has one. */
async function signUpOrSignIn(email: string, password: string) {
  try {
    return await createUserWithEmailAndPassword(auth, email, password)
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/email-already-in-use") throw error
    return signInWithEmailAndPassword(auth, email, password)
  }
}

/** The apply page's form. Creates their account, signs them in, and lands them on the campaign's Creators tab as "Applied". */
export function CreatorApplyForm({ projectId, brief }: { projectId: string; brief: CreatorBrief }) {
  const questions = applicationQuestions(brief)
  const [form, setForm] = useState({ name: "", email: "", password: "", app: defaultApp(brief.platform), handle: "", coverLetter: "" })
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))
  const complete = Boolean(form.name.trim() && form.email.trim() && form.password.length >= 8 && form.handle.trim() && form.coverLetter.trim()) && answers.every((answer) => answer.trim())

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError("")
    try {
      const { password, ...details } = form
      const credential = await signUpOrSignIn(details.email.trim(), password)
      const token = await credential.user.getIdToken()
      const response = await fetch("/api/campaigns/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...details, projectId, answers: questions.map((question, index) => ({ question, answer: answers[index] ?? "" })) }),
      })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error || "That didn't send. Try again.")
      setSent(true)
      // A full load, so the app reads their creator role fresh and opens their campaigns.
      window.location.assign("/dashboard/projects")
    } catch (err) {
      const code = (err as { code?: string }).code
      setError(code ? AUTH_ERRORS[code] ?? "We couldn't create your account. Try again." : err instanceof Error ? err.message : "That didn't send. Try again.")
      setSending(false)
    }
  }

  if (applicationsClosed(brief)) return <p className="text-sm text-muted-foreground">Applications for this campaign have closed.</p>
  if (sent) return <p className="text-[15px] text-foreground">Application sent. Taking you to your campaigns…</p>

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Text id="apply-name" label="Name" value={form.name} onChange={set("name")} required autoComplete="name" />
        <Text id="apply-email" label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Text id="apply-password" label="Password" type="password" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">At least 8 characters. You&apos;ll use it to sign in and follow your campaigns. Already have an account? Use its password.</p>
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
