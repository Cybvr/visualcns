"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { safeReturnTo } from "@/lib/navigation"
import { VISITOR_TRIAL_DAYS } from "@/lib/visitor-billing"
import { VisitorSignupForm, visitorsTab } from "@/components/visitors/visitor-signup-form"

type SignupAction = "email" | "google" | null

const VISITORS_PATH = "/dashboard/visitors"


export default function SignupPage() {
  const router = useRouter()
  const { user, appUser, loading, signUpWithEmail, signInWithGoogle, joinVisitorCompany } = useAuth()
  const [inviteToken, setInviteToken] = useState("")
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [queryReady, setQueryReady] = useState(false)
  const [name, setName] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [action, setAction] = useState<SignupAction>(null)
  const [error, setError] = useState<string | null>(null)
  const redirectingRef = useRef(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setInviteToken(params.get("invite") || "")
    setReturnTo(safeReturnTo(params.get("next")))
    setQueryReady(true)
  }, [])

  useEffect(() => {
    if (!queryReady || loading || action || !user) return
    if (inviteToken) {
      router.replace(`/invite/${inviteToken}`)
      return
    }
    if (!appUser?.role || !appUser.agencyId) return
    // A client coming from the visitor demo goes to their own company's Visitors tab.
    if (returnTo === VISITORS_PATH && appUser.role === "client") {
      if (redirectingRef.current) return
      redirectingRef.current = true
      void joinVisitorCompany("").then((slug) => window.location.assign(visitorsTab(slug))).catch(() => router.replace(returnTo))
      return
    }
    router.replace(returnTo || "/dashboard")
  }, [queryReady, loading, action, user, appUser, router, inviteToken, returnTo, joinVisitorCompany])

  async function handleEmailSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!inviteToken && !agencyName.trim()) {
      setError("Enter your business name to continue.")
      return
    }
    setAction("email")
    setError(null)

    try {
      await signUpWithEmail(name, email.trim(), password, agencyName.trim(), !inviteToken)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setAction(null)
    }
  }

  async function handleGoogleSignup() {
    setAction("google")
    setError(null)

    try {
      await signInWithGoogle(inviteToken ? "" : agencyName.trim(), !inviteToken)
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
  const visitorSignup = returnTo === VISITORS_PATH
  const businessNameField = !inviteToken && (
    <div className="space-y-2">
      <Label htmlFor="agencyName">{visitorSignup ? "Company name" : "Agency name"}</Label>
      <Input id="agencyName" name="agencyName" type="text" value={agencyName} onChange={(event) => setAgencyName(event.target.value)} placeholder={visitorSignup ? "Your company" : "Your agency"} className="h-10 rounded-none bg-background text-base md:text-sm" disabled={busy} maxLength={120} required />
    </div>
  )
  const googleButton = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-10 w-full gap-3 border-input bg-background hover:bg-muted hover:text-foreground"
      onClick={handleGoogleSignup}
      disabled={busy}
      aria-busy={action === "google"}
    >
      {action === "google" ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Continuing…
        </>
      ) : (
        <>
          <GoogleIcon />
          Continue with Google
        </>
      )}
    </Button>
  )

  return (
    <main className={`flex min-h-svh items-center justify-center bg-muted/40 px-4 ${visitorSignup ? "visitor-signup-page py-2 sm:py-4" : "py-8"}`}>
      <section
        aria-labelledby="signup-heading"
        className={`w-full border border-border bg-background ${visitorSignup ? "max-h-[calc(100dvh-1rem)] max-w-lg overflow-y-auto px-4 py-4 sm:px-6 sm:py-5" : "max-w-sm px-6 py-7 sm:px-7 sm:py-8"}`}
      >
        <div className={`flex justify-center ${visitorSignup ? "visitor-signup-brand" : ""}`}>
          <Link
            href="/"
            aria-label="Return to VisualCNS home"
            className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
          >
            <BrandLockup logoSize={26} gapClassName="gap-0.5" />
          </Link>
        </div>

        <div className={visitorSignup ? "visitor-signup-heading mb-3 mt-3" : "mb-6 mt-7"}>
          <h1 id="signup-heading" className={`text-center tracking-[-0.02em] text-foreground ${visitorSignup ? "text-2xl" : "text-3xl"}`}>
            {visitorSignup ? "Set up visitor sign-in" : "Create your VisualHQ account"}
          </h1>
          {visitorSignup && <p className="visitor-signup-trial mt-1 text-center text-xs text-muted-foreground">Free for {VISITOR_TRIAL_DAYS} days. No card needed.</p>}
        </div>

        {visitorSignup && (inviteToken ? googleButton : <VisitorSignupForm />)}

        {!visitorSignup && <form className="space-y-4" onSubmit={handleEmailSignup}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-none bg-background text-base md:text-sm"
              disabled={busy}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-none bg-background text-base md:text-sm"
              disabled={busy}
              required
            />
          </div>

          {!visitorSignup && businessNameField}

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 rounded-none bg-background text-base md:text-sm"
              disabled={busy}
              minLength={8}
              required
            />
          </div>

          <Button type="submit" size="lg" className="h-10 w-full" disabled={busy} aria-busy={action === "email"}>
            {action === "email" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>}

        {!visitorSignup && (
          <>
            <div className="my-5 flex items-center gap-4" aria-hidden="true">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {googleButton}
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm leading-5 text-destructive">
            {error}
          </p>
        )}

        <p className={`${visitorSignup ? "mt-3 text-xs" : "mt-5 text-sm"} text-center text-muted-foreground`}>
          Already have an account?{" "}
          <Link href={returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login"} className="font-medium text-foreground underline underline-offset-4 hover:text-accent">
            Sign in
          </Link>
        </p>

        {visitorSignup ? (
          <p className="mt-2 text-center text-[10px] leading-[14px] text-muted-foreground">
            By continuing, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        ) : <p className="mt-6 text-center text-[10px] leading-4 text-muted-foreground/60">
          By continuing, you agree to VisualCNS’s{" "}
          <Link href="/terms" className="text-muted-foreground/75 underline underline-offset-4 hover:text-foreground/80">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-muted-foreground/75 underline underline-offset-4 hover:text-foreground/80">
          Privacy Policy
          </Link>, and to receive periodic emails with updates.
        </p>}
      </section>
    </main>
  )
}
