"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { PageHeading } from "@/components/page-heading"
import { ServicesView } from "@/components/dashboard/services-view"

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pb-20 pt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6"><PageHeading title="Services" /></div>
        <ServicesView checkoutHref="/cart" />
      </div>
      <Footer />
    </div>
  )
}
