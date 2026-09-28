"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function visitorsTab(slug: string) {
  return `/${encodeURIComponent(slug)}?tab=visitors`
}

/**
 * Visitor Sign-in sign-up: company name, then Google. The person becomes a
 * client of VisualCNS with their own company and lands on its Visitors tab.
 * Used on the demo page's Get started modal and on /signup.
 */
export function VisitorSignupForm() {
  const { signInWithGoogle, joinVisitorCompany } = useAuth()
  const [companyName, setCompanyName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyName.trim()) {
      setError("Enter your company name to continue.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await signInWithGoogle()
      const slug = await joinVisitorCompany(companyName.trim())
      // A full page load picks up the new client account.
      window.location.assign(visitorsTab(slug))
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      if (!message.includes("popup-closed-by-user") && !message.includes("cancelled-popup-request")) {
        setError(message && !message.startsWith("Firebase") ? message : authErrorMessage(err))
      }
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="visitor-signup-company">Company name</Label>
        <Input
          id="visitor-signup-company"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Your company"
          autoComplete="organization"
          maxLength={120}
          disabled={busy}
          className="h-10 bg-background text-base md:text-sm"
        />
      </div>
      <Button type="submit" variant="outline" size="lg" className="h-10 w-full gap-3" disabled={busy} aria-busy={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
        {busy ? "Setting up…" : "Continue with Google"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
