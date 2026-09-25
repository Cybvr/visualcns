"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAuth } from "@/components/auth-provider"
import { authErrorMessage, GoogleIcon } from "@/components/auth-ui"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function TaskSignInGate() {
  const router = useRouter()
  const { signInWithGoogle } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setSigningIn(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Sign-in failed. Please try again."
      if (!message.includes("popup-closed-by-user") && !message.includes("cancelled-popup-request")) {
        setError(authErrorMessage(caughtError))
      }
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Dialog open onOpenChange={(open) => !open && router.push("/")}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hi, please do a quick sign in</DialogTitle>
            <DialogDescription>Sign in to continue to your workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full gap-3 border-input bg-background hover:bg-muted hover:text-foreground"
              onClick={() => void handleSignIn()}
              disabled={signingIn}
              aria-busy={signingIn}
            >
              {signingIn ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
              {signingIn ? "Signing in…" : "Continue with Google"}
            </Button>
            {error && <p className="text-sm leading-5 text-destructive" role="alert">{error}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
