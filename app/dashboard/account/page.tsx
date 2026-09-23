"use client"

import { useAuth } from "@/components/auth-provider"
import { AccountMenu } from "@/components/account/account-nav"

export default function AccountPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-9">
      <AccountMenu />
    </main>
  )
}
