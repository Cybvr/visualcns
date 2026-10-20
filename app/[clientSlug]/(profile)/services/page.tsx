"use client"

import { useCompanyPage } from "@/components/company/company-page-context"
import { ServicesView } from "@/components/dashboard/services-view"

export default function CompanyServicesPage() {
  const { company } = useCompanyPage()
  return <ServicesView cartHref={`/${encodeURIComponent(company.slug || company.id)}/cart`} />
}
