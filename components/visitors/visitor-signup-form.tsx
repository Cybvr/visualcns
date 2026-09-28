"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function visitorsTab(slug: string) {
  return `/${encodeURIComponent(slug)}?tab=visitors`
}

const VISITOR_SIGNUP_DRAFT_KEY = "visualcns:visitor-signup-draft"

/**
 * Visitor Sign-in sign-up: company name, then email or Google. The person becomes a
 * client of VisualCNS with their own company and lands on its Visitors tab.
 * Used on the demo page's Get started modal and on /signup.
 */
export function VisitorSignupForm() {
  const { user, signUpWithEmail, signInWithGoogle, joinVisitorCompany } = useAuth()
  const [companyName, setCompanyName] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [keepSignedIn, setKeepSignedIn] = useState(true)
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
        await signUpWithEmail(name.trim(), email.trim(), password, "", false, keepSignedIn)
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
      await signInWithGoogle("", false, "", keepSignedIn)
      await finishSignup()
    } catch (err) {
      showError(err)
      setAction(null)
    }
  }

  return (
    <form onSubmit={submitEmail} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="visitor-signup-company">Company name</Label>
        <Input
          id="visitor-signup-company"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Your company"
          autoComplete="organization"
          maxLength={120}
          disabled={action !== null}
          className="h-10 bg-background text-base md:text-sm"
        />
      </div>
      {user || emailAccountCreated ? <p className="text-sm text-muted-foreground">Signed in as {user?.email || email}</p> : <>
        <div className="space-y-2">
          <Label htmlFor="visitor-signup-name">Your name</Label>
          <Input id="visitor-signup-name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={action !== null} required className="h-10 bg-background text-base md:text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visitor-signup-email">Email address</Label>
          <Input id="visitor-signup-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={action !== null} required className="h-10 bg-background text-base md:text-sm" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="visitor-signup-password">Password</Label>
          <Input id="visitor-signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} disabled={action !== null} required className="h-10 bg-background text-base md:text-sm" />
        </div>
      </>}
      {!user && !emailAccountCreated && (
        <label htmlFor="visitor-signup-keep-signed-in" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox id="visitor-signup-keep-signed-in" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} disabled={action !== null} />
          Keep me signed in
        </label>
      )}
      <Button type="submit" size="lg" className="h-10 w-full" disabled={action !== null} aria-busy={action === "email"}>
        {action === "email" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {action === "email" ? "Setting up…" : user || emailAccountCreated ? "Continue with this account" : "Create account with email"}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <Button type="button" onClick={submitGoogle} variant="outline" size="lg" className="h-10 w-full gap-3" disabled={action !== null} aria-busy={action === "google"}>
        {action === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
        {action === "google" ? "Setting up…" : "Continue with Google"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
