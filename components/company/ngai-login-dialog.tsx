"use client"

import { LoginDialog } from "@/components/login-dialog"

/** Sign-in popup for Ngai on a company page. `onSignedIn` runs instead of a close once they're in. */
export function NgaiLoginDialog({ open, onOpenChange, onSignedIn, companyName }: { open: boolean; onOpenChange: (open: boolean) => void; onSignedIn: () => void; companyName: string }) {
  return (
    <LoginDialog
      open={open}
      onOpenChange={onOpenChange}
      onSignedIn={onSignedIn}
      title="Sign in to ask Ngai"
      description={<>Ngai is for members of {companyName}. Your message sends once you&apos;re in.</>}
    />
  )
}
