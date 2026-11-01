"use client"

import { useCompanyPage } from "@/components/company/company-page-context"
import { PricingView } from "@/components/pricing-view"

/** A company's pricing page, opened on the given tab. */
export function CompanyPricing({ tab }: { tab?: string }) {
  const { company } = useCompanyPage()
  const companyPath = `/${encodeURIComponent(company.slug || company.id)}`
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6">
      <PricingView cartHref={`${companyPath}/cart`} freeHref={companyPath} stickyTop="top-14 md:top-[72px]" basePath={`${companyPath}/pricing`} initialTab={tab} />
    </main>
  )
}
