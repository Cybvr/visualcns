"use client"

import { useAuth } from "@/components/auth-provider"
import { AccountMenu } from "@/components/account/account-nav"
import { ProfileSettings } from "@/components/account/profile-settings"

export default function AccountPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-9 lg:hidden">
        <AccountMenu />
      </main>
      <div className="hidden lg:block">
        <ProfileSettings showBackLink={false} />
      </div>
    </>
  )
}
