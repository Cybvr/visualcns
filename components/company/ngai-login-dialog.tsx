"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Sign-in popup for Ngai on a company page. `onSignedIn` runs instead of a close once they're in. */
export function NgaiLoginDialog({ open, onOpenChange, onSignedIn, companyName }: { open: boolean; onOpenChange: (open: boolean) => void; onSignedIn: () => void; companyName: string }) {
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState<"email" | "google" | null>(null)
  const [error, setError] = useState("")

  async function run(kind: "email" | "google", signIn: () => Promise<void>) {
    setBusy(kind)
    setError("")
    try {
      await signIn()
      onSignedIn()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : ""
      if (!message.includes("popup-closed-by-user") && !message.includes("cancelled-popup-request")) setError(authErrorMessage(reason))
    } finally {
      setBusy(null)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run("email", () => signInWithEmail(email.trim(), password))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to ask Ngai</DialogTitle>
          <DialogDescription>Ngai is for members of {companyName}. Your message sends once you&apos;re in.</DialogDescription>
        </DialogHeader>
        <Button type="button" size="lg" className="h-11 w-full gap-3" onClick={() => void run("google", () => signInWithGoogle())} disabled={busy !== null}>
          {busy === "google" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
          Continue with Google
        </Button>
        <form className="space-y-3 border-t border-border pt-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="ngai-login-email">Email</Label>
            <Input id="ngai-login-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy !== null} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ngai-login-password">Password</Label>
            <Input id="ngai-login-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy !== null} />
          </div>
          <Button type="submit" variant="outline" className="h-10 w-full" disabled={busy !== null}>
            {busy === "email" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Sign in
          </Button>
        </form>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
