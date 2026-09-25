"use client"

import { Suspense, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth"
import { Loader2 } from "lucide-react"

import { BrandLockup } from "@/components/brand-lockup"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { auth } from "@/lib/firebase"

function resetErrorMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : null

  switch (code) {
    case "auth/expired-action-code":
      return "This reset link has expired. Request a new one from the login page."
    case "auth/invalid-action-code":
      return "This reset link is invalid or has already been used. Request a new one from the login page."
    case "auth/weak-password":
      return "Choose a stronger password with at least 8 characters."
    default:
      return "We couldn’t reset your password. Request a new link and try again."
  }
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const code = searchParams.get("oobCode") || ""
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!code) {
      setChecking(false)
      setError("This reset link is missing its security code. Request a new one from the login page.")
      return () => { active = false }
    }

    verifyPasswordResetCode(auth, code)
      .then((address) => {
        if (active) setEmail(address)
      })
      .catch((reason) => {
        if (active) setError(resetErrorMessage(reason))
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => { active = false }
  }, [code])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !code) return
    setError(null)
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.")
      return
    }
    if (password !== confirmation) {
      setError("The passwords do not match.")
      return
    }

    setSaving(true)
    try {
      await confirmPasswordReset(auth, code, password)
      setComplete(true)
    } catch (reason) {
      setError(resetErrorMessage(reason))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-8">
      <section aria-labelledby="reset-heading" className="w-full max-w-sm border border-border bg-background px-6 py-7 sm:px-7 sm:py-8">
        <div className="flex justify-center">
          <Link href="/" aria-label="Return to VisualCNS home" className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
            <BrandLockup logoSize={26} gapClassName="gap-0.5" />
          </Link>
        </div>

        <div className="mb-6 mt-7">
          <h1 id="reset-heading" className="text-center text-3xl tracking-[-0.02em] text-foreground">
            {complete ? "Password updated" : "Reset your password"}
          </h1>
          {!complete && email && <p className="mt-2 text-center text-sm leading-5 text-muted-foreground">Choose a new password for {email}.</p>}
        </div>

        {checking ? (
          <div className="space-y-3 py-6" role="status" aria-label="Checking reset link">
            <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
          </div>
        ) : complete ? (
          <div className="space-y-5 text-center">
            <p className="text-sm leading-6 text-muted-foreground">Your password has been changed. You can now sign in with the new password.</p>
            <Button asChild size="lg" className="h-10 w-full"><Link href="/login">Return to sign in</Link></Button>
          </div>
        ) : error && !email ? (
          <div className="space-y-5">
            <p role="alert" className="text-sm leading-5 text-destructive">{error}</p>
            <Button asChild variant="outline" size="lg" className="h-10 w-full"><Link href="/login">Return to sign in</Link></Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 rounded-none bg-background text-base md:text-sm" disabled={saving} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-10 rounded-none bg-background text-base md:text-sm" disabled={saving} required minLength={8} />
            </div>
            <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
            {error && <p role="alert" className="text-sm leading-5 text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="h-10 w-full" disabled={saving} aria-busy={saving}>
              {saving ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Updating password…</> : "Update password"}
            </Button>
          </form>
        )}

        {!complete && <p className="mt-5 text-center text-sm text-muted-foreground">Remember your password? <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-accent">Sign in</Link></p>}
      </section>
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="min-h-svh bg-muted/40" />}><ResetPasswordForm /></Suspense>
}
