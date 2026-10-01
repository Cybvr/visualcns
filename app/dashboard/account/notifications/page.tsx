"use client"

import { AccountHeader, AccountNav } from "@/components/account/account-nav"
import { useAuth } from "@/components/auth-provider"
import { EmailNotificationControl } from "@/components/account/email-notification-control"

export default function NotificationsPage() {
  const { user, appUser, isAdmin } = useAuth()
  if (!user || !isAdmin) return null

  const workspaceId = appUser?.companyId || user.uid

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-9 sm:px-6">
      <AccountNav />
      <AccountHeader title="Notifications" />

      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="max-w-md">
          <h2 className="text-sm font-medium">New email</h2>
          <p className="mt-1 text-sm text-muted-foreground">Show a browser alert when new mail arrives while VisualCNS is open. This setting applies to this browser.</p>
        </div>
        <EmailNotificationControl workspaceId={workspaceId} />
      </section>
    </main>
  )
}
