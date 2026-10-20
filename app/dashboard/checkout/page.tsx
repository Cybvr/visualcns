"use client"

import { CheckoutView } from "@/components/dashboard/checkout-view"

export default function CheckoutPage() {
  return <CheckoutView checkoutPath="/dashboard/checkout" doneHref="/dashboard" />
}
