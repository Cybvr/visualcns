"use client"

import { useCompanyPage } from "@/components/company/company-page-context"
import { CartView } from "@/components/dashboard/cart-view"

export default function CompanyCartPage() {
  const { company } = useCompanyPage()
  const companyPath = `/${encodeURIComponent(company.slug || company.id)}`
  return <CartView checkoutHref={`${companyPath}/checkout`} servicesHref={`${companyPath}/services`} />
}
