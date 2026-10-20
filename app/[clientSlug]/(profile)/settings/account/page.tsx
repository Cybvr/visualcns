"use client"

import Link from "next/link"

import { ProfileSettings } from "@/components/account/profile-settings"
import { useAuth } from "@/components/auth-provider"
import { CompanyBookings } from "@/components/company/company-bookings"
import { useCompanyPage } from "@/components/company/company-page-context"
import { CompanySettingsLayout } from "@/components/company/company-settings-layout"
import { Button } from "@/components/ui/button"

export default function CompanyAccountSettingsPage() {
  const { user } = useAuth()
  const { company } = useCompanyPage()

  return (
    <CompanySettingsLayout>
      <div className="min-w-0">
        {user ? (
          <>
            <ProfileSettings showBackLink={false} embedded />
            <CompanyBookings companyId={company.id} canCancel />
          </>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-muted-foreground">Sign in to manage your account.</p>
            <Button asChild><Link href={`/${encodeURIComponent(company.slug || company.id)}/sign-in`}>Sign in</Link></Button>
          </div>
        )}
      </div>
    </CompanySettingsLayout>
  )
}
