"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { safeReturnTo } from "@/lib/portal-model"

type AuthAction = "google" | null

export default function LoginPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, loading, signInWithGoogle, signOut } = useAuth()
  const [action, setAction] = useState<AuthAction>(null)
  const [error, setError] = useState<string | null>(null)
  // Signed in, but nobody has invited this account yet and it hasn't created a workspace.
  const notSetUp = Boolean(user && appUser && (!appUser.role || !appUser.tenantId))
  // Where they came from (e.g. a shared portal page), so they can return to it.
  const [returnTo, setReturnTo] = useState<string | null>(null)
  useEffect(() => { setReturnTo(safeReturnTo(new URLSearchParams(window.location.search).get("next"))) }, [])

  useEffect(() => {
    if (!loading && !action && user && !notSetUp) {
      const requested = safeReturnTo(new URLSearchParams(window.location.search).get("next"))
      router.replace(requested || (isAdmin ? "/dashboard" : "/portal"))
    }
  }, [loading, user, notSetUp, isAdmin, router, action])

  async function handleGoogleSignIn() {
    setAction("google")
    setError(null)
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
            Sign in
          </h1>
        </div>

        {notSetUp && !action && (
          <div role="status" className="mb-4 border border-border bg-muted/40 p-3 text-sm leading-5 text-muted-foreground">
            <p>You’re signed in as {user?.email || "this account"}, but it isn’t linked to a workspace yet. Open the portal link your agency sent you, or ask them to add this email to your company.</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {returnTo && <Link href={returnTo} className="font-medium text-foreground underline underline-offset-4">Go back</Link>}
              <button type="button" className="font-medium text-foreground underline underline-offset-4" onClick={() => void signOut()}>Use a different account</button>
            </div>
          </div>
        )}

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

        {error && (
          <p role="alert" className="mt-4 text-sm leading-5 text-destructive">
            {error}
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
