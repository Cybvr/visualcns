"use client"

import Link from "next/link"
import { Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, ChevronRight, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth-provider"
import { SectionHeader } from "@/components/dashboard/section-header"
import { useCart } from "@/components/dashboard/use-cart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cartTotal, formatMoney } from "@/lib/cart"
import { useLocalCurrency } from "@/components/use-local-currency"
import { usePolarCheckout } from "@/components/use-polar-checkout"
import { formatPrice } from "@/lib/plans"
import { cn } from "@/lib/utils"

type Discount = { code: string; amount: number }
type Paid = { items: Array<{ id: string; name: string; amount: number }>; discount: Discount | null; total: number; currency: "NGN" | "USD" }

const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Other"]

type Details = { name: string; email: string; phone: string; company: string; country: string; address: string }

function Field({ id, label, className, children }: { id: string; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function CheckoutContent({ checkoutPath, doneHref }: { checkoutPath: string; doneHref: string }) {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference") || searchParams.get("trxref") || ""
  const { items, remove } = useCart()
  const currency = useLocalCurrency()
  // Dollars go through Polar, one item at a time; Naira goes through Paystack for the whole cart.
  const dollars = currency === "USD"
  const polar = usePolarCheckout()
  const [details, setDetails] = useState<Details>({ name: "", email: "", phone: "", company: "", country: "Nigeria", address: "" })
  const [note, setNote] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState<Paid | null>(null)
  const [verifyError, setVerifyError] = useState("")
  const [codeInput, setCodeInput] = useState("")
  const [discount, setDiscount] = useState<Discount | null>(null)
  const [codeError, setCodeError] = useState("")
  const [checkingCode, setCheckingCode] = useState(false)
  const verified = useRef("")

  // Start from what the account already knows.
  useEffect(() => {
    setDetails((current) => ({
      ...current,
      name: current.name || appUser?.displayName || user?.displayName || "",
      email: current.email || user?.email || appUser?.email || "",
      company: current.company || appUser?.company || "",
    }))
  }, [user, appUser])

  const update = (key: keyof Details, value: string) => setDetails((current) => ({ ...current, [key]: value }))

  async function post(body: Record<string, unknown>) {
    // Guests pay too: no token, and the email they type instead.
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })
    const payload = (await response.json().catch(() => ({}))) as Record<string, any>
    if (!response.ok) throw new Error(payload.error || "Something went wrong. Please try again.")
    return payload
  }

  // Back from Polar: that item is paid, so it leaves the cart.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get("paid") !== "polar") return
    const paidItem = url.searchParams.get("item")
    if (paidItem) remove(paidItem)
    toast.success("Payment received. We'll be in touch shortly to get started.")
    for (const key of ["paid", "item", "checkout_id"]) url.searchParams.delete(key)
    window.history.replaceState(window.history.state, "", url.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Paystack sends the payer back here with the payment reference.
  useEffect(() => {
    if (!reference || loading || verified.current === reference) return
    verified.current = reference
    post({ action: "verify", reference })
      .then((payload) => {
        setPaid({ items: payload.items ?? [], discount: payload.discount ?? null, total: payload.total ?? 0, currency: payload.currency === "USD" ? "USD" : "NGN" })
        // Only what was paid for leaves the cart; a plan bought straight from pricing leaves the rest alone.
        for (const item of (payload.items ?? []) as Array<{ id: string }>) remove(item.id)
      })
      .catch((error: Error) => setVerifyError(error.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, user, loading])

  // A changed cart or currency changes what the code is worth: drop it so it's applied again.
  const cartKey = `${currency}:${items.map((item) => item.id).join(",")}`
  useEffect(() => {
    setDiscount(null)
    setCodeError("")
  }, [cartKey])

  async function applyCode() {
    const code = codeInput.trim()
    if (!code) return
    setCheckingCode(true)
    setCodeError("")
    try {
      const payload = await post({ action: "discount", code, items: items.map((item) => item.id), currency })
      setDiscount({ code: payload.code, amount: payload.amount })
      setCodeInput("")
    } catch (error) {
      setDiscount(null)
      setCodeError(error instanceof Error ? error.message : "That code isn't valid.")
    } finally {
      setCheckingCode(false)
    }
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPaying(true)
    try {
      const { url } = await post({ action: "pay", items: items.map((item) => item.id), note, details, currency, returnTo: checkoutPath, code: discount?.code ?? "" })
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
          <div className="rounded-2xl bg-muted/50 p-6">
            <CheckCircle2 className="size-8 text-emerald-600" aria-hidden="true" />
            <h2 className="surface-record-title mt-4">Payment received</h2>
            <div className="surface-body mt-1">Thanks. We&apos;ll be in touch shortly to get started.</div>
            <ul className="mt-5 divide-y divide-border border-y border-border">
              {paid.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-2.5 text-sm">
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-muted-foreground">{formatMoney(item.amount, paid.currency)}</span>
                </li>
              ))}
            </ul>
            {paid.discount && (
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Discount ({paid.discount.code})</span>
                <span className="text-foreground">−{formatMoney(paid.discount.amount, paid.currency)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between text-sm font-semibold text-foreground">
              <span>Total paid</span>
              <span>{formatMoney(paid.total, paid.currency)}</span>
            </div>
            <Button asChild className="mt-6 w-full"><Link href={doneHref}>Done</Link></Button>
          </div>
        ) : verifyError ? (
          <div className="rounded-2xl bg-muted/50 p-6">
            <h2 className="surface-record-title">We couldn&apos;t confirm that payment</h2>
            <div className="surface-body mt-1">{verifyError}</div>
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

  const subtotal = cartTotal(items, currency)
  const total = subtotal - (discount?.amount ?? 0)
  const cartHref = checkoutPath.replace(/\/checkout$/, "/cart")
  const servicesHref = checkoutPath.replace(/\/checkout$/, "/pricing")

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 pt-10 pb-12 text-center sm:px-6">
        <div className="text-sm text-foreground">Your cart is empty.</div>
        <Button asChild variant="outline" className="mt-4"><Link href={servicesHref}>See pricing</Link></Button>
      </main>
    )
  }

  // Dollars: each item is paid on its own Polar page, which takes the payer's details and any discount code.
  if (dollars) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-12 sm:px-6">
        <Link href={cartHref} className="text-sm text-muted-foreground hover:text-foreground">Back to cart</Link>
        <div className="mt-5 rounded-2xl bg-muted/50 p-5">
          <div className="surface-record-title">Pay in dollars</div>
          <div className="surface-body mt-1">{items.length > 1 ? "Dollar payments go one item at a time. Pay for each one below." : "You'll pay on Polar's secure page."}</div>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
                  <div className="surface-caption">{formatPrice(item.price, currency)}</div>
                </div>
                <Button type="button" className="shrink-0" disabled={!agreed || Boolean(polar.opening)} onClick={() => void polar.open(item.id)}>
                  {polar.opening === item.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                  Pay
                </Button>
              </li>
            ))}
          </ul>
          <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
            <span>I agree to the <Link href="/terms" target="_blank" className="underline underline-offset-4">terms of service</Link>.</span>
          </label>
          <div className="surface-caption mt-3 flex items-center gap-1.5"><Lock className="size-3 shrink-0" aria-hidden="true" />Paid on Polar by card. Have a discount code? Enter it there.</div>
        </div>
      </main>
    )
  }

  const summary = (
    <>
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
              <div className="surface-caption">{item.price.suffix === "/mo" ? "First month" : "One-off"}</div>
            </div>
            <div className="shrink-0 text-sm text-foreground">{formatPrice(item.price, currency)}</div>
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatMoney(subtotal, currency)}</span></div>
        {discount && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              Discount ({discount.code}){" "}
              <button type="button" onClick={() => setDiscount(null)} className="text-foreground underline underline-offset-4">Remove</button>
            </span>
            <span className="text-foreground">−{formatMoney(discount.amount, currency)}</span>
          </div>
        )}
        <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="text-foreground">Included</span></div>
        <div className="flex items-baseline justify-between border-t border-border pt-3"><span className="font-semibold text-foreground">Total</span><span className="text-xl font-semibold text-foreground">{formatMoney(total, currency)}</span></div>
      </div>
      {!discount && (
        <div className="mt-3">
          <div className="flex gap-2">
            <Input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void applyCode() } }}
              placeholder="Discount code"
              aria-label="Discount code"
              autoCapitalize="characters"
              className="bg-background"
            />
            <Button type="button" variant="outline" onClick={applyCode} disabled={checkingCode || !codeInput.trim()}>
              {checkingCode ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : "Apply"}
            </Button>
          </div>
          {codeError && <div className="mt-1.5 text-sm text-destructive" role="alert">{codeError}</div>}
        </div>
      )}
      <Link href={cartHref} className="mt-3 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline">Edit cart</Link>
    </>
  )

  // Terms and the Pay button. The button submits the details form from wherever it sits.
  const payBlock = (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
        <span>I agree to the <Link href="/terms" target="_blank" className="underline underline-offset-4">terms of service</Link>.</span>
      </label>
      <Button type="submit" form="checkout-form" className="h-12 w-full text-base" disabled={paying || !agreed}>
        {paying ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
        Pay {formatMoney(total, currency)}
      </Button>
      <div className="surface-caption flex items-center justify-center gap-1.5 text-center"><Lock className="size-3 shrink-0" aria-hidden="true" />Paid on Paystack by card, bank transfer or USSD. Paying in dollars? Switch the currency beside the cart.</div>
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-12 sm:px-6">
      <ol className="flex items-center gap-2 text-sm" aria-label="Checkout steps">
        <li><Link href={cartHref} className="text-muted-foreground hover:text-foreground">Cart</Link></li>
        <li aria-hidden="true"><ChevronRight className="size-4 text-muted-foreground" /></li>
        <li className="font-semibold text-foreground" aria-current="step">Details and payment</li>
        <li aria-hidden="true"><ChevronRight className="size-4 text-muted-foreground" /></li>
        <li className="text-muted-foreground">Done</li>
      </ol>

      {/* Phones: the summary folds away above the form. */}
      <details className="mt-5 rounded-2xl bg-muted/50 px-4 py-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-foreground">
          Order summary ({items.length})
          <span className="font-semibold">{formatMoney(total, currency)}</span>
        </summary>
        <div className="mt-2">{summary}</div>
      </details>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <form id="checkout-form" onSubmit={pay} className="min-w-0 space-y-8">
          <section aria-labelledby="checkout-contact">
            <SectionHeader id="checkout-contact" title="Contact" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="checkout-name" label="Full name"><Input id="checkout-name" value={details.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" required /></Field>
              <Field id="checkout-email" label="Email"><Input id="checkout-email" type="email" value={details.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" required /></Field>
              <Field id="checkout-phone" label="Phone"><Input id="checkout-phone" type="tel" value={details.phone} onChange={(event) => update("phone", event.target.value)} autoComplete="tel" placeholder="Optional" /></Field>
            </div>
          </section>

          <section aria-labelledby="checkout-billing">
            <SectionHeader id="checkout-billing" title="Billing details" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="checkout-company" label="Company"><Input id="checkout-company" value={details.company} onChange={(event) => update("company", event.target.value)} autoComplete="organization" placeholder="Optional" /></Field>
              <Field id="checkout-country" label="Country">
                <Select value={details.country} onValueChange={(value) => update("country", value)}>
                  <SelectTrigger id="checkout-country" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field id="checkout-address" label="Address" className="sm:col-span-2"><Input id="checkout-address" value={details.address} onChange={(event) => update("address", event.target.value)} autoComplete="street-address" placeholder="Optional" /></Field>
            </div>
          </section>

          <section aria-labelledby="checkout-notes">
            <SectionHeader id="checkout-notes" title="Project notes" />
            <Textarea className="mt-4" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={3} placeholder="Anything we should know before we start? (optional)" aria-labelledby="checkout-notes" />
          </section>

          {/* Phones: paying sits at the end of the form; wider screens have it under the totals. */}
          <div className="lg:hidden">{payBlock}</div>
        </form>

        <aside className="hidden rounded-2xl bg-muted/50 p-5 lg:sticky lg:top-4 lg:block" aria-label="Order summary">
          <div className="surface-record-title">Order summary</div>
          <div className="mt-2">{summary}</div>
          <div className="mt-5">{payBlock}</div>
        </aside>
      </div>
    </main>
  )
}

/** Checkout: contact and billing details, the order summary, then Paystack. checkoutPath is where Paystack sends the payer back. */
export function CheckoutView(props: { checkoutPath: string; doneHref: string }) {
  return (
    <Suspense>
      <CheckoutContent {...props} />
    </Suspense>
  )
}
