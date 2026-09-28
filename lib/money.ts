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
