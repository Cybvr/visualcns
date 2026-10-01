"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Building2, ClipboardList, FolderKanban, Loader2, Users } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { safeReturnTo } from "@/lib/navigation"
import { trackMetaLead } from "@/components/meta-pixel"

type SignupAction = "email" | "google" | null

const onboardingFeatures = [
  { icon: Users, label: "Keep your clients and contacts together" },
  { icon: FolderKanban, label: "Manage projects and tasks" },
  { icon: ClipboardList, label: "Set up visitor sign-in when you need it" },
]

export default function SignupPage() {
  const router = useRouter()
  const { user, appUser, loading, signUpWithEmail, signInWithGoogle } = useAuth()
  const [inviteToken, setInviteToken] = useState("")
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [queryReady, setQueryReady] = useState(false)
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailFormOpen, setEmailFormOpen] = useState(false)
  const [action, setAction] = useState<SignupAction>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get("invite") || ""
    setInviteToken(invite)
    setReturnTo(safeReturnTo(params.get("next")))
    if (invite) setEmailFormOpen(true)
    setQueryReady(true)
  }, [])

  useEffect(() => {
    if (!queryReady || loading || action || !user) return
    if (inviteToken) {
      router.replace(`/invite/${inviteToken}`)
      return
    }
    if (!appUser?.role || !appUser.agencyId) return
    router.replace(returnTo || "/dashboard")
  }, [queryReady, loading, action, user, appUser, router, inviteToken, returnTo])

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!inviteToken && !companyName.trim()) {
      setError("Enter your company name to continue.")
      return
    }
    setAction("email")
    setError(null)
    try {
      await signUpWithEmail(name.trim(), email.trim(), password, companyName.trim(), !inviteToken)
      if (!inviteToken) trackMetaLead()
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setAction(null)
    }
  }

  async function handleGoogleSignup() {
    if (!inviteToken && !companyName.trim()) {
      setError("Enter your company name to continue.")
      return
    }
    setAction("google")
    setError(null)
    try {
      await signInWithGoogle(inviteToken ? "" : companyName.trim(), !inviteToken)
      if (!inviteToken) trackMetaLead()
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (!message.includes("popup-closed-by-user") && !message.includes("cancelled-popup-request")) {
        setError(authErrorMessage(err))
      }
    } finally {
      setAction(null)
    }
  }

  const busy = loading || action !== null

  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-[1fr_1fr]">
      <section className="hidden flex-col justify-between bg-primary px-10 py-9 text-primary-foreground lg:flex xl:px-16 xl:py-12">
        <Link href="/" aria-label="VisualCNS home" className="w-fit rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground">
          <BrandLockup logoSize={34} invert />
        </Link>
        <div className="mx-auto w-full max-w-xl py-12">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground/70">Your VisualCNS workspace</p>
          <h1 className="mt-5 text-5xl font-medium leading-[1.05] tracking-[-0.04em] xl:text-6xl">One account for the work you run.</h1>
          <p className="mt-5 max-w-lg text-lg leading-7 text-primary-foreground/75">Create your company workspace and bring your day-to-day operations together.</p>
          <ul className="mt-10 space-y-5">
            {onboardingFeatures.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <span className="flex size-9 items-center justify-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">Clients · projects · tasks · visitor log</p>
      </section>

      <section className="flex min-h-svh items-center justify-center px-5 py-8 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="VisualCNS home" className="mb-10 inline-flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
            <BrandLockup logoSize={30} />
          </Link>

          <div className="mb-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Get started</p>
            <h2 className="mt-3 text-3xl font-medium tracking-[-0.035em] sm:text-4xl">
              {inviteToken ? "Create your account" : "Set up your workspace"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {inviteToken ? "Create an account to join your team." : "Start with your company and account details. You can set up the rest inside the app."}
            </p>
          </div>

          {!inviteToken && (
            <div className="mb-5 space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="companyName" name="companyName" type="text" autoComplete="organization" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Your company" className="h-11 pl-10" disabled={busy} maxLength={120} required />
              </div>
            </div>
          )}

          <Button type="button" size="lg" className="h-11 w-full gap-3" onClick={handleGoogleSignup} disabled={busy} aria-busy={action === "google"}>
            {action === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
            {action === "google" ? "Creating your workspace…" : "Continue with Google"}
          </Button>

          {!emailFormOpen ? (
            <Button type="button" variant="ghost" className="mt-2 h-10 w-full" onClick={() => setEmailFormOpen(true)} disabled={busy}>
              Use email instead
            </Button>
          ) : (
            <form className="mt-5 space-y-4 border-t border-border pt-5" onSubmit={handleEmailSignup}>
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="h-11" disabled={busy} maxLength={100} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11" disabled={busy} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11" disabled={busy} minLength={8} required />
              </div>
              <Button type="submit" size="lg" className="h-11 w-full" disabled={busy} aria-busy={action === "email"}>
                {action === "email" ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Creating your account…</> : <>Create account <ArrowRight className="size-4" aria-hidden="true" /></>}
              </Button>
            </form>
          )}

          {error && <p role="alert" className="mt-4 text-sm leading-5 text-destructive">{error}</p>}

          <p className="mt-7 text-sm text-muted-foreground">
            Already have an account? <Link href={returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login"} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Sign in</Link>
          </p>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            By continuing, you agree to VisualCNS&apos;s <Link href="/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </div>
      </section>
    </main>
  )
}
