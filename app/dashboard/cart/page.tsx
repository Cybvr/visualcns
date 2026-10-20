"use client"

import { CartView } from "@/components/dashboard/cart-view"

export default function CartPage() {
  return <CartView checkoutHref="/dashboard/checkout" servicesHref="/dashboard/services" />
}
