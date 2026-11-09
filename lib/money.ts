/** Amounts are stored in minor units, so 125000 in NGN prints as NGN 1,250.00. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format((amount ?? 0) / 100)
  } catch {
    return `${((amount ?? 0) / 100).toFixed(2)} ${currency || ""}`.trim()
  }
}

type InvoiceAmounts = { status: string; amount: number; amountPaid?: number; currency: string }

/** What is still owed on an open invoice, in minor units. Paid and void invoices owe nothing. */
export function invoiceAmountDue(invoice: InvoiceAmounts): number {
  if (invoice.status === "paid" || invoice.status === "void") return 0
  return Math.max(0, (invoice.amount ?? 0) - (invoice.amountPaid ?? 0))
}

/** The amount shown in invoice lists: what is left to pay when part of an open invoice is paid, otherwise the total. */
export function invoiceListAmount(invoice: InvoiceAmounts): string {
  const open = invoice.status !== "paid" && invoice.status !== "void"
  if (open && (invoice.amountPaid ?? 0) > 0) return `${formatMoney(invoiceAmountDue(invoice), invoice.currency)} due`
  return formatMoney(invoice.amount, invoice.currency)
}
