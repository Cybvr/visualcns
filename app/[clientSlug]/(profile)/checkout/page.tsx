"use client"

import { useCompanyPage } from "@/components/company/company-page-context"
import { CheckoutView } from "@/components/dashboard/checkout-view"

export default function CompanyCheckoutPage() {
  const { company } = useCompanyPage()
  const companyPath = `/${encodeURIComponent(company.slug || company.id)}`
  return <CheckoutView checkoutPath={`${companyPath}/checkout`} doneHref={companyPath} />
}
