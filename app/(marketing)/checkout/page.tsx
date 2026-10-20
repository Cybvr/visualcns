"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { CheckoutView } from "@/components/dashboard/checkout-view"

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pb-20 pt-32">
        <CheckoutView checkoutPath="/checkout" doneHref="/services" />
      </div>
      <Footer />
    </div>
  )
}
