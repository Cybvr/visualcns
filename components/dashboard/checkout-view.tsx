"use client"

import Link from "next/link"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { useCart } from "@/components/dashboard/use-cart"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cartTotal } from "@/lib/cart"
import { formatPrice } from "@/lib/plans"


type Paid = { items: Array<{ id: string; name: string; amount: number }>; total: number }

function CheckoutContent({ checkoutPath, doneHref }: { checkoutPath: string; doneHref: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference") || searchParams.get("trxref") || ""
  const { items, remove, clear } = useCart()
  const [note, setNote] = useState("")
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState<Paid | null>(null)
  const [verifyError, setVerifyError] = useState("")
  const verified = useRef("")

  async function post(body: Record<string, unknown>) {
    if (!user) throw new Error("Sign in to pay.")
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => ({}))) as Record<string, any>
    if (!response.ok) throw new Error(payload.error || "Something went wrong. Please try again.")
    return payload
  }

  // Paystack sends the payer back here with the payment reference.
  useEffect(() => {
    if (!reference || !user || verified.current === reference) return
    verified.current = reference
    post({ action: "verify", reference })
      .then((payload) => {
        setPaid({ items: payload.items ?? [], total: payload.total ?? 0 })
        clear()
      })
      .catch((error: Error) => setVerifyError(error.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, user])

  async function pay() {
    setPaying(true)
    try {
      const { url } = await post({ action: "pay", items: items.map((item) => item.id), note, returnTo: checkoutPath })
      window.location.assign(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start the payment.")
      setPaying(false)
    }
  }

  if (reference) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 pt-10 pb-12 sm:px-6">
        {paid ? (
          <div className="rounded-2xl border border-border p-6">
            <CheckCircle2 className="size-8 text-emerald-600" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">Payment received</h2>
            <p className="mt-1 text-sm text-muted-foreground">Thanks. We&apos;ll be in touch shortly to get started.</p>
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {paid.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-2.5 text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted-foreground">{formatPrice({ amount: item.amount }, "NGN")}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between text-sm font-semibold">
              <span>Total paid</span>
              <span>{formatPrice({ amount: paid.total }, "NGN")}</span>
            </div>
            <Button asChild className="mt-6 w-full"><Link href={doneHref}>Done</Link></Button>
          </div>
        ) : verifyError ? (
          <div className="rounded-2xl border border-border p-6">
            <h2 className="text-lg font-semibold">We couldn&apos;t confirm that payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">{verifyError}</p>
            <Button className="mt-6" variant="outline" onClick={() => router.replace(checkoutPath)}>Back to checkout</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Confirming your payment…
          </div>
        )}
      </main>
    )
  }

  const total = cartTotal(items)

  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-12 sm:px-6">
      <section aria-label="Order summary">
        <div className="rounded-2xl border border-border">
          <h2 className="border-b border-border px-4 py-3 text-sm font-medium">Order summary</h2>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              <Button asChild variant="outline" size="sm" className="mt-4"><Link href={checkoutPath.replace(/\/checkout$/, "/services")}>Browse services</Link></Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(item.price, "NGN")}</p>
                  </div>
                  <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`} title="Remove" className="rounded-sm p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-4 border-t border-border px-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="checkout-note">Anything we should know?</Label>
              <Textarea id="checkout-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={3} placeholder="Optional" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{formatPrice({ amount: total }, "NGN")}</span>
            </div>
            <Button type="button" className="w-full" disabled={items.length === 0 || paying} onClick={pay}>
              {paying && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Pay with Paystack
            </Button>
            <p className="text-xs text-muted-foreground">Monthly services are charged for the first month now.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

/** The cart's order summary and Paystack payment. checkoutPath is where Paystack sends the payer back. */
export function CheckoutView(props: { checkoutPath: string; doneHref: string }) {
  return (
    <Suspense>
      <CheckoutContent {...props} />
    </Suspense>
  )
}
