"use client"

import { useMemo, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { CompanyProvider, useCompanyState } from "@/components/dashboard/company-context"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { usePageHeaderBack, usePageTitle } from "@/components/dashboard/page-title-context"

function CompanyLayoutBody({ children }: { children: ReactNode }) {
  const { loading, error, client, name } = useCompanyState()

  const router = useRouter()
  // Phones show the client's name in the header, with Back in place of the menu.
  usePageTitle(!loading && client ? name : null)
  const back = useMemo(() => ({ label: "Back to clients", onClick: () => router.push("/dashboard/clients") }), [router])
  usePageHeaderBack(back)

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <DashboardPageSkeleton variant="detail" />
      </main>
    )
  }

  if (error || !client) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>
        <p className="mt-8 text-sm text-muted-foreground">{error ?? "This client could not be loaded."}</p>
      </main>
    )
  }

  return <>{children}</>
}

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <CompanyProvider>
      <CompanyLayoutBody>{children}</CompanyLayoutBody>
    </CompanyProvider>
  )
}
