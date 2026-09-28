"use client"

import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getOrganization, organizationRef } from "@/lib/organizations"
import { safeReturnTo } from "@/lib/navigation"

type AuthAction = "email" | "google" | null

type WorkspaceOption = {
  id: string
  name: string
  logoUrl?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, loading, signInWithEmail, signInWithGoogle } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState("")
  const [workspacesLoading, setWorkspacesLoading] = useState(true)
  const [action, setAction] = useState<AuthAction>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [keepSignedIn, setKeepSignedIn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signupHref, setSignupHref] = useState("/signup")
  const [visitorLogin, setVisitorLogin] = useState(false)

  useEffect(() => {
    const requested = safeReturnTo(new URLSearchParams(window.location.search).get("next"))
    if (requested) setSignupHref(`/signup?next=${encodeURIComponent(requested)}`)
    if (requested === "/dashboard/visitors") {
      setVisitorLogin(true)
      setWorkspacesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (safeReturnTo(new URLSearchParams(window.location.search).get("next")) === "/dashboard/visitors") return
    let active = true
    fetch("/api/auth/workspaces", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { workspaces?: WorkspaceOption[]; error?: string }
        if (!response.ok) throw new Error(data.error || "Could not load organizations")
        if (active) {
          const options = data.workspaces || []
          setWorkspaces(options)
          setSelectedWorkspace(options[0]?.id || "")
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load organizations")
      })
      .finally(() => { if (active) setWorkspacesLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const needsWorkspaceSelection = Boolean(
      user &&
      appUser &&
      (!appUser.role || !appUser.agencyId || (
        !visitorLogin &&
        appUser.role === "admin" &&
        appUser.agencyId === user.uid &&
        appUser.companyId === user.uid &&
        appUser.welcomeEmailPending
      )),
    )
    if (loading || action || !user || needsWorkspaceSelection) return

    const requested = safeReturnTo(new URLSearchParams(window.location.search).get("next"))
    if (requested === "/dashboard/visitors" && !appUser) return
    if (requested === "/dashboard/visitors" && appUser?.role === "client") {
      if (!appUser.companyId) {
        setError("We couldn't find your company. Please contact support.")
        return
      }
      let active = true
      getOrganization(appUser.companyId)
        .then((organization) => {
          if (!active) return
          if (organization) router.replace(`/${encodeURIComponent(organizationRef(organization))}?tab=visitors`)
          else setError("We couldn't find your company. Please contact support.")
        })
        .catch(() => { if (active) setError("We couldn't open your Visitors page. Please try again.") })
      return () => { active = false }
    }
    if (requested) {
      router.replace(requested)
      return
    }
    if (isAdmin) {
      router.replace("/dashboard")
      return
    }
    if (!appUser?.companyId) return

    let active = true
    getOrganization(appUser.companyId)
      .then((organization) => {
        if (active) router.replace(organization ? `/${encodeURIComponent(organizationRef(organization))}` : "/")
      })
      .catch(() => {
        if (active) router.replace("/")
      })
    return () => { active = false }
  }, [loading, user, appUser, isAdmin, router, action, visitorLogin])

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAction("email")
    setError(null)
    try {
      await signInWithEmail(email.trim(), password, keepSignedIn)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setAction(null)
    }
  }

  async function handleGoogleSignIn() {
    if (!visitorLogin && !selectedWorkspace) {
      setError("Choose your organization first.")
      return
    }
    setAction("google")
    setError(null)
    try {
      await signInWithGoogle("", false, visitorLogin ? "" : selectedWorkspace, visitorLogin ? keepSignedIn : true)
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

  const busy = loading || workspacesLoading || action !== null

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
            {visitorLogin ? "Sign in to Visitors" : "Sign in"}
          </h1>
          {!visitorLogin && <p className="mt-2 text-center text-sm text-muted-foreground">Choose your organization to continue.</p>}
        </div>

        {!visitorLogin && <div className="mb-4 space-y-2">
          <label htmlFor="workspace" className="text-sm font-medium text-foreground">Organization</label>
          <select
            id="workspace"
            value={selectedWorkspace}
            onChange={(event) => setSelectedWorkspace(event.target.value)}
            disabled={busy || workspaces.length === 0}
            className="h-10 w-full rounded-none border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
          >
            {workspaces.length === 0 ? <option value="">No organizations available</option> : workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
          </select>
        </div>}

        {visitorLogin && <>
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitor-login-email">Email</Label>
              <Input id="visitor-login-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} required className="h-10 bg-background text-base md:text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitor-login-password">Password</Label>
              <Input id="visitor-login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} required className="h-10 bg-background text-base md:text-sm" />
            </div>
            <label htmlFor="visitor-login-keep-signed-in" className="surface-caption flex items-center gap-2">
              <Checkbox id="visitor-login-keep-signed-in" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} disabled={busy} />
              Keep me signed in
            </label>
            <Button type="submit" size="lg" className="h-10 w-full" disabled={busy} aria-busy={action === "email"}>
              {action === "email" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {action === "email" ? "Signing in…" : "Sign in with email"}
            </Button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        </>}

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

        {visitorLogin && !loading && user && !appUser?.role && (
          <p className="mt-4 text-sm text-muted-foreground">
            No business set up yet. <Link href={signupHref} className="font-medium text-foreground underline underline-offset-4">Create an account</Link> to open Visitors.
          </p>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don’t have an account?{" "}
          <Link href={signupHref} className="font-medium text-foreground underline underline-offset-4 hover:text-accent">
            Sign up
          </Link>
        </p>

        {visitorLogin ? (
          <p className="surface-caption mt-6 text-center">
            By continuing, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        ) : <p className="mt-6 text-center text-[10px] leading-4 text-muted-foreground/60">
          By continuing, you agree to VisualCNS’s{" "}
          <Link href="/terms" className="text-muted-foreground/75 underline underline-offset-4 transition-colors hover:text-foreground/80">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-muted-foreground/75 underline underline-offset-4 transition-colors hover:text-foreground/80">
            Privacy Policy
          </Link>, and to receive periodic emails with updates.
        </p>}
      </section>
    </main>
  )
}
