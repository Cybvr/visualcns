"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { safeReturnTo } from "@/lib/portal-model"

type AuthAction = "email" | "google" | "reset" | null

export default function LoginPage() {
  const router = useRouter()
  const emailInputRef = useRef<HTMLInputElement>(null)
  const { user, isAdmin, loading, signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [action, setAction] = useState<AuthAction>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      const requested = safeReturnTo(new URLSearchParams(window.location.search).get("next"))
      router.replace(requested || (isAdmin ? "/dashboard" : "/portal"))
    }
  }, [loading, user, isAdmin, router])

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAction("email")
    setError(null)
    setNotice(null)
    try {
      await signInWithEmail(email.trim(), password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setAction(null)
    }
  }

  async function handleGoogleSignIn() {
    setAction("google")
    setError(null)
    setNotice(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed. Please try again."
      // Popup closed by user isn't an error worth showing loudly
      if (message.includes("popup-closed-by-user") || message.includes("cancelled-popup-request")) {
        setError(null)
      } else {
        setError(authErrorMessage(err))
      }
    } finally {
      setAction(null)
    }
  }

  async function handlePasswordReset() {
    const trimmedEmail = email.trim()
    setError(null)
    setNotice(null)

    if (!trimmedEmail) {
      setError("Enter your email address first.")
      emailInputRef.current?.focus()
      return
    }

    setAction("reset")
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(result.error || "We couldn’t send the reset email. Please try again.")
      setNotice(`If an account exists for ${trimmedEmail}, a password reset link has been sent.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : authErrorMessage(err))
    } finally {
      setAction(null)
    }
  }

  const busy = loading || action !== null

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-sm border border-border bg-background px-6 py-7 sm:px-7 sm:py-8"
      >
        <div className="flex justify-center">
          <Link href="/" aria-label="Return to VisualCNS home" className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
            <BrandLockup logoSize={26} gapClassName="gap-0.5" />
          </Link>
        </div>

        <div className="mb-6 mt-7">
          <h1 id="login-heading" className="text-center text-3xl tracking-[-0.02em] text-foreground">
            Sign in to VisualHQ
          </h1>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 w-full gap-3 border-input bg-background hover:bg-muted hover:text-foreground"
          onClick={handleGoogleSignIn}
          disabled={busy}
          aria-busy={action === "google"}
        >
          {action === "google" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              <GoogleIcon />
              Continue with Google
            </>
          )}
        </Button>

        <div className="my-5 flex items-center gap-4" aria-hidden="true">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              ref={emailInputRef}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-sm font-medium text-accent outline-none hover:underline focus-visible:underline disabled:pointer-events-none disabled:opacity-50"
                onClick={handlePasswordReset}
                disabled={busy}
              >
                {action === "reset" ? "Sending…" : "Forgot password?"}
              </button>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 rounded-none bg-background text-base md:text-sm"
              disabled={busy}
              required
            />
          </div>

          <Button type="submit" size="lg" className="h-10 w-full" disabled={busy} aria-busy={action === "email"}>
            {action === "email" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm leading-5 text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm leading-5 text-muted-foreground">
            {notice}
          </p>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don’t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4 hover:text-accent">
            Sign up
          </Link>
        </p>

        <p className="mt-6 text-center text-[10px] leading-4 text-muted-foreground/60">
          By continuing, you agree to VisualCNS’s{" "}
          <Link href="/terms" className="text-muted-foreground/75 underline underline-offset-4 transition-colors hover:text-foreground/80">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-muted-foreground/75 underline underline-offset-4 transition-colors hover:text-foreground/80">
            Privacy Policy
          </Link>, and to receive periodic emails with updates.
        </p>
      </section>
    </main>
  )
}
