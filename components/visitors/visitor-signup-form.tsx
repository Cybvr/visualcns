"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trackMetaLead } from "@/components/meta-pixel"

export function visitorsTab(slug: string) {
  return `/${encodeURIComponent(slug)}?tab=visitors`
}

const VISITOR_SIGNUP_DRAFT_KEY = "visualcns:visitor-signup-draft"

/**
 * Visitor Sign-in sign-up: company name, then email or Google. The person becomes a
 * client of VisualCNS with their own company and lands on its Visitors tab.
 * Used by the dedicated Visitor Sign-in onboarding page.
 */
export function VisitorSignupForm() {
  const { user, signUpWithEmail, signInWithGoogle, joinVisitorCompany } = useAuth()
  const [companyName, setCompanyName] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailStepOpen, setEmailStepOpen] = useState(false)
  const [emailAccountCreated, setEmailAccountCreated] = useState(false)
  const [action, setAction] = useState<"email" | "google" | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    try { localStorage.removeItem(VISITOR_SIGNUP_DRAFT_KEY) } catch {}
  }, [])

  function hasCompanyName() {
    if (!companyName.trim()) {
      setError("Enter your company name to continue.")
      return false
    }
    return true
  }

  async function finishSignup() {
    const slug = await joinVisitorCompany(companyName.trim())
    trackMetaLead()
    // A full page load picks up the new client account.
    window.location.assign(visitorsTab(slug))
  }

  function showError(err: unknown) {
    const message = err instanceof Error ? err.message : ""
    if (!message.includes("popup-closed-by-user") && !message.includes("cancelled-popup-request")) {
      setError(message && !message.startsWith("Firebase") ? message : authErrorMessage(err))
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasCompanyName()) return
    setAction("email")
    setError("")
    try {
      if (!user && !emailAccountCreated) {
        await signUpWithEmail(name.trim(), email.trim(), password)
        setEmailAccountCreated(true)
      }
      await finishSignup()
    } catch (err) {
      showError(err)
      setAction(null)
    }
  }

  async function submitGoogle() {
    if (!hasCompanyName()) return
    setAction("google")
    setError("")
    try {
      await signInWithGoogle()
      await finishSignup()
    } catch (err) {
      showError(err)
      setAction(null)
    }
  }

  return (
    <form onSubmit={submitEmail} className="space-y-3 sm:space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="visitor-signup-company" className="surface-caption">Company name</Label>
        <Input
          id="visitor-signup-company"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Your company"
          autoComplete="organization"
          maxLength={120}
          disabled={action !== null}
          required
          className="h-10 bg-background text-base sm:text-sm"
        />
      </div>

      {user || emailAccountCreated ? (
        <>
          <p className="surface-caption">Using {user?.email || email}</p>
          <Button type="submit" size="lg" className="h-11 w-full" disabled={action !== null} aria-busy={action === "email"}>
            {action === "email" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {action === "email" ? "Setting up…" : "Create visitor sign-in"}
          </Button>
        </>
      ) : (
        <>
          <Button type="button" onClick={submitGoogle} size="lg" className="h-11 w-full gap-3" disabled={action !== null} aria-busy={action === "google"}>
            {action === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
            {action === "google" ? "Setting up…" : "Continue with Google"}
          </Button>

          {!emailStepOpen ? (
            <Button type="button" variant="ghost" className="h-9 w-full text-sm" onClick={() => setEmailStepOpen(true)} disabled={action !== null}>
              Use email instead
            </Button>
          ) : (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="visitor-signup-name" className="surface-caption">Your name</Label>
                <Input id="visitor-signup-name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={action !== null} required className="h-10 bg-background text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitor-signup-email" className="surface-caption">Email address</Label>
                <Input id="visitor-signup-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={action !== null} required className="h-10 bg-background text-base sm:text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitor-signup-password" className="surface-caption">Password</Label>
                <Input id="visitor-signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} disabled={action !== null} required className="h-10 bg-background text-base sm:text-sm" />
              </div>
              <Button type="submit" size="lg" className="h-11 w-full" disabled={action !== null} aria-busy={action === "email"}>
                {action === "email" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {action === "email" ? "Setting up…" : "Create account and continue"}
              </Button>
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
