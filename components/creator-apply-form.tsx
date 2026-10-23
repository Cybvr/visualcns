"use client"

import { useState, type ComponentProps, type FormEvent } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"

import { useAuth } from "@/components/auth-provider"
import { LoginDialog } from "@/components/login-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { applicationQuestions, applicationsClosed, type CampaignOpening, type CreatorBrief } from "@/lib/campaign-brief"
import { auth } from "@/lib/firebase"

const APPS = ["Instagram", "TikTok", "YouTube", "Facebook", "X"] as const

/** The app a creator most likely posts on for this brief. */
function defaultApp(platform: string) {
  return APPS.find((app) => platform.startsWith(app)) ?? "Instagram"
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

/**
 * The apply page's form. Creates their account, signs them in, and lands them on the campaign's Creators tab as "Applied".
 * With an opening, it applies for that job: a work link instead of a handle, and their rate when the pay isn't fixed.
 */
export function CreatorApplyForm({ projectId, brief, opening }: { projectId: string; brief: CreatorBrief; opening?: CampaignOpening }) {
  const { user } = useAuth()
  const questions = applicationQuestions(opening ?? brief)
  const [form, setForm] = useState({ name: "", email: "", password: "", app: defaultApp(brief.platform), handle: "", portfolio: "", rate: "", coverLetter: "" })
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))
  // Someone already signed in applies with that account, so they skip email and password.
  const account = Boolean(user) || Boolean(form.email.trim() && form.password.length >= 8)
  const askHandle = !opening && brief.showCreatorDetails
  const askRate = Boolean(opening && !opening.fixedOffer)
  const complete = Boolean(form.name.trim() && (!askHandle || form.handle.trim()) && (!opening || form.portfolio.trim()) && form.coverLetter.trim()) && account && answers.every((answer) => answer.trim())

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    setError("")
    try {
      const { password, ...details } = form
      const token = user ? await user.getIdToken() : await (await signUpOrSignIn(details.email.trim(), password)).user.getIdToken()
      const response = await fetch("/api/campaigns/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...details, projectId, openingId: opening?.id ?? "", answers: questions.map((question, index) => ({ question, answer: answers[index] ?? "" })) }),
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

  if (applicationsClosed(opening ?? brief)) return <p className="text-sm text-muted-foreground">Applications for this {opening ? "role" : "campaign"} have closed.</p>
  if (sent) return <p className="text-[15px] text-foreground">Application sent. Taking you to your campaigns…</p>

  return (
    <form onSubmit={submit} className="space-y-5">
      {user ? (
        <>
          <p className="text-sm text-muted-foreground">Applying as <span className="text-foreground">{user.email}</span></p>
          <Text id="apply-name" label="Name" value={form.name} onChange={set("name")} required autoComplete="name" />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button type="button" onClick={() => setLoginOpen(true)} className="font-medium text-foreground underline underline-offset-4">Sign in</button>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Text id="apply-name" label="Name" value={form.name} onChange={set("name")} required autoComplete="name" />
            <Text id="apply-email" label="Email" type="email" value={form.email} onChange={set("email")} required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Text id="apply-password" label="Password" type="password" value={form.password} onChange={set("password")} required minLength={8} autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">At least 8 characters. You&apos;ll use it to sign in and follow your campaigns.</p>
          </div>
          <LoginDialog
            open={loginOpen}
            onOpenChange={setLoginOpen}
            onSignedIn={() => setLoginOpen(false)}
            title="Sign in to apply"
            description="Use your VisualCNS account. Your answers here stay as they are."
          />
        </>
      )}
      {askHandle && (
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
      )}
      {opening && (
        <div className={askRate ? "grid gap-4 sm:grid-cols-[1fr_12rem]" : undefined}>
          <Text id="apply-portfolio" label="Link to your work" inputMode="url" value={form.portfolio} onChange={set("portfolio")} placeholder="https://" required />
          {askRate && <Text id="apply-rate" label={`Your rate (${opening.currency})`} inputMode="numeric" value={form.rate} onChange={set("rate")} />}
        </div>
      )}
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
