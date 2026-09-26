"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { getOrganization, organizationRef } from "@/lib/organizations"
import { safeReturnTo } from "@/lib/navigation"

type AuthAction = "google" | null

type WorkspaceOption = {
  id: string
  name: string
  logoUrl?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { user, appUser, isAdmin, loading, signInWithGoogle } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState("")
  const [workspacesLoading, setWorkspacesLoading] = useState(true)
  const [action, setAction] = useState<AuthAction>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
        appUser.role === "admin" &&
        appUser.agencyId === user.uid &&
        appUser.companyId === user.uid &&
        appUser.welcomeEmailPending
      )),
    )
    if (loading || action || !user || needsWorkspaceSelection) return

    const requested = safeReturnTo(new URLSearchParams(window.location.search).get("next"))
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
  }, [loading, user, appUser, isAdmin, router, action])

  async function handleGoogleSignIn() {
    if (!selectedWorkspace) {
      setError("Choose your organization first.")
      return
    }
    setAction("google")
    setError(null)
    try {
      await signInWithGoogle("", false, selectedWorkspace)
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
            Sign in
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Choose your organization to continue.</p>
        </div>

        <div className="mb-4 space-y-2">
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
