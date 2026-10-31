"use client"

import { useCompanyPage } from "@/components/company/company-page-context"
import { PricingView } from "@/components/pricing-view"

export default function CompanyPricingPage() {
  const { company } = useCompanyPage()
  const companyPath = `/${encodeURIComponent(company.slug || company.id)}`
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-4 pb-12 sm:px-6">
      <PricingView cartHref={`${companyPath}/cart`} freeHref={companyPath} />
    </main>
  )
}
