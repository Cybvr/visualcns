"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { CartView } from "@/components/dashboard/cart-view"

export default function CartPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pb-20 pt-32">
        <CartView checkoutHref="/checkout" servicesHref="/services" />
      </div>
      <Footer />
    </div>
  )
}
